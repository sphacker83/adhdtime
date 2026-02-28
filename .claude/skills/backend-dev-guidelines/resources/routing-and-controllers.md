# 라우팅과 컨트롤러 - 모범 사례

깔끔한 라우트 정의와 컨트롤러 패턴을 위한 완전한 가이드입니다.

## 목차

- [라우트: 라우팅만](#routes-routing-only)
- [BaseController 패턴](#basecontroller-pattern)
- [좋은 예시](#good-examples)
- [안티패턴](#anti-patterns)
- [리팩터링 가이드](#refactoring-guide)
- [에러 처리](#error-handling)
- [HTTP 상태 코드](#http-status-codes)

---

## 라우트: 라우팅만

### 황금 규칙

**라우트가 해야 하는 것(ONLY):**
- ✅ 라우트 경로 정의
- ✅ 미들웨어 등록
- ✅ 컨트롤러로 위임

**라우트가 하면 안 되는 것(NEVER):**
- ❌ 비즈니스 로직 포함
- ❌ DB 직접 접근
- ❌ 검증 로직 구현(Zod + 컨트롤러 사용)
- ❌ 복잡한 응답 포맷팅
- ❌ 복잡한 에러 시나리오 처리

### 깔끔한 라우트 패턴

```typescript
// routes/userRoutes.ts
import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { SSOMiddlewareClient } from '../middleware/SSOMiddleware';
import { auditMiddleware } from '../middleware/auditMiddleware';

const router = Router();
const controller = new UserController();

// ✅ CLEAN: Route definition only
router.get('/:id',
    SSOMiddlewareClient.verifyLoginStatus,
    auditMiddleware,
    async (req, res) => controller.getUser(req, res)
);

router.post('/',
    SSOMiddlewareClient.verifyLoginStatus,
    auditMiddleware,
    async (req, res) => controller.createUser(req, res)
);

router.put('/:id',
    SSOMiddlewareClient.verifyLoginStatus,
    auditMiddleware,
    async (req, res) => controller.updateUser(req, res)
);

export default router;
```

**핵심 포인트:**
- 각 라우트는: 메서드, 경로, 미들웨어 체인, 컨트롤러 위임만 포함
- try-catch 불필요(컨트롤러에서 에러 처리)
- 깔끔하고 읽기 쉽고 유지보수하기 쉬움
- 전체 엔드포인트를 한눈에 파악 가능

---

## BaseController 패턴

### 왜 BaseController인가?

**장점:**
- 모든 컨트롤러에서 일관된 에러 처리
- Sentry 자동 통합
- 표준화된 응답 포맷
- 재사용 가능한 헬퍼 메서드
- 성능 추적 유틸리티
- 로깅 및 breadcrumb 헬퍼

### BaseController 패턴(템플릿)

**File:** `/email/src/controllers/BaseController.ts`

```typescript
import * as Sentry from '@sentry/node';
import { Response } from 'express';

export abstract class BaseController {
    /**
     * Handle errors with Sentry integration
     */
    protected handleError(
        error: unknown,
        res: Response,
        context: string,
        statusCode = 500
    ): void {
        Sentry.withScope((scope) => {
            scope.setTag('controller', this.constructor.name);
            scope.setTag('operation', context);
            scope.setUser({ id: res.locals?.claims?.userId });

            if (error instanceof Error) {
                scope.setContext('error_details', {
                    message: error.message,
                    stack: error.stack,
                });
            }

            Sentry.captureException(error);
        });

        res.status(statusCode).json({
            success: false,
            error: {
                message: error instanceof Error ? error.message : 'An error occurred',
                code: statusCode,
            },
        });
    }

    /**
     * Handle success responses
     */
    protected handleSuccess<T>(
        res: Response,
        data: T,
        message?: string,
        statusCode = 200
    ): void {
        res.status(statusCode).json({
            success: true,
            message,
            data,
        });
    }

    /**
     * Performance tracking wrapper
     */
    protected async withTransaction<T>(
        name: string,
        operation: string,
        callback: () => Promise<T>
    ): Promise<T> {
        return await Sentry.startSpan(
            { name, op: operation },
            callback
        );
    }

    /**
     * Validate required fields
     */
    protected validateRequest(
        required: string[],
        actual: Record<string, any>,
        res: Response
    ): boolean {
        const missing = required.filter((field) => !actual[field]);

        if (missing.length > 0) {
            Sentry.captureMessage(
                `Missing required fields: ${missing.join(', ')}`,
                'warning'
            );

            res.status(400).json({
                success: false,
                error: {
                    message: 'Missing required fields',
                    code: 'VALIDATION_ERROR',
                    details: { missing },
                },
            });
            return false;
        }
        return true;
    }

    /**
     * Logging helpers
     */
    protected logInfo(message: string, context?: Record<string, any>): void {
        Sentry.addBreadcrumb({
            category: this.constructor.name,
            message,
            level: 'info',
            data: context,
        });
    }

    protected logWarning(message: string, context?: Record<string, any>): void {
        Sentry.captureMessage(message, {
            level: 'warning',
            tags: { controller: this.constructor.name },
            extra: context,
        });
    }

    /**
     * Add Sentry breadcrumb
     */
    protected addBreadcrumb(
        message: string,
        category: string,
        data?: Record<string, any>
    ): void {
        Sentry.addBreadcrumb({ message, category, level: 'info', data });
    }

    /**
     * Capture custom metric
     */
    protected captureMetric(name: string, value: number, unit: string): void {
        Sentry.metrics.gauge(name, value, { unit });
    }
}
```

### BaseController 사용

```typescript
// controllers/UserController.ts
import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { UserService } from '../services/userService';
import { createUserSchema } from '../validators/userSchemas';

export class UserController extends BaseController {
    private userService: UserService;

    constructor() {
        super();
        this.userService = new UserService();
    }

    async getUser(req: Request, res: Response): Promise<void> {
        try {
            this.addBreadcrumb('Fetching user', 'user_controller', { userId: req.params.id });

            const user = await this.userService.findById(req.params.id);

            if (!user) {
                return this.handleError(
                    new Error('User not found'),
                    res,
                    'getUser',
                    404
                );
            }

            this.handleSuccess(res, user);
        } catch (error) {
            this.handleError(error, res, 'getUser');
        }
    }

    async createUser(req: Request, res: Response): Promise<void> {
        try {
            // Validate input
            const validated = createUserSchema.parse(req.body);

            // Track performance
            const user = await this.withTransaction(
                'user.create',
                'db.query',
                () => this.userService.create(validated)
            );

            this.handleSuccess(res, user, 'User created successfully', 201);
        } catch (error) {
            this.handleError(error, res, 'createUser');
        }
    }

    async updateUser(req: Request, res: Response): Promise<void> {
        try {
            const validated = updateUserSchema.parse(req.body);
            const user = await this.userService.update(req.params.id, validated);
            this.handleSuccess(res, user, 'User updated');
        } catch (error) {
            this.handleError(error, res, 'updateUser');
        }
    }
}
```

**장점:**
- 일관된 에러 처리
- Sentry 자동 통합
- 성능 추적
- 깔끔하고 읽기 쉬운 코드
- 테스트 용이

---

## 좋은 예시

### 예시 1: 이메일 알림 라우트(매우 좋음 ✅)

**File:** `/email/src/routes/notificationRoutes.ts`

```typescript
import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { SSOMiddlewareClient } from '../middleware/SSOMiddleware';

const router = Router();
const controller = new NotificationController();

// ✅ EXCELLENT: Clean delegation
router.get('/',
    SSOMiddlewareClient.verifyLoginStatus,
    async (req, res) => controller.getNotifications(req, res)
);

router.post('/',
    SSOMiddlewareClient.verifyLoginStatus,
    async (req, res) => controller.createNotification(req, res)
);

router.put('/:id/read',
    SSOMiddlewareClient.verifyLoginStatus,
    async (req, res) => controller.markAsRead(req, res)
);

export default router;
```

**이 예시가 매우 좋은 이유:**
- 라우트에 비즈니스 로직이 전혀 없음
- 미들웨어 체인이 명확함
- 패턴이 일관됨
- 이해하기 쉬움

### 예시 2: 검증이 있는 프록시 라우트(좋음 ✅)

**File:** `/form/src/routes/proxyRoutes.ts`

```typescript
import { z } from 'zod';

const createProxySchema = z.object({
    originalUserID: z.string().min(1),
    proxyUserID: z.string().min(1),
    startsAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
});

router.post('/',
    SSOMiddlewareClient.verifyLoginStatus,
    async (req, res) => {
        try {
            const validated = createProxySchema.parse(req.body);
            const proxy = await proxyService.createProxyRelationship(validated);
            res.status(201).json({ success: true, data: proxy });
        } catch (error) {
            handler.handleException(res, error);
        }
    }
);
```

**이 예시가 좋은 이유:**
- Zod 검증
- 서비스로 위임
- 올바른 HTTP 상태 코드 사용
- 에러 처리

**개선점:**
- 검증을 컨트롤러로 이동
- BaseController 사용

---

## 안티패턴

### 안티패턴 1: 라우트에 비즈니스 로직(나쁨 ❌)

**File:** `/form/src/routes/responseRoutes.ts` (actual production code)

```typescript
// ❌ ANTI-PATTERN: 200+ lines of business logic in route
router.post('/:formID/submit', async (req: Request, res: Response) => {
    try {
        const username = res.locals.claims.preferred_username;
        const responses = req.body.responses;
        const stepInstanceId = req.body.stepInstanceId;

        // ❌ Permission checking in route
        const userId = await userProfileService.getProfileByEmail(username).then(p => p.id);
        const canComplete = await permissionService.canCompleteStep(userId, stepInstanceId);
        if (!canComplete) {
            return res.status(403).json({ error: 'No permission' });
        }

        // ❌ Workflow logic in route
        const { createWorkflowEngine, CompleteStepCommand } = require('../workflow/core/WorkflowEngineV3');
        const engine = await createWorkflowEngine();
        const command = new CompleteStepCommand(
            stepInstanceId,
            userId,
            responses,
            additionalContext
        );
        const events = await engine.executeCommand(command);

        // ❌ Impersonation handling in route
        if (res.locals.isImpersonating) {
            impersonationContextStore.storeContext(stepInstanceId, {
                originalUserId: res.locals.originalUserId,
                effectiveUserId: userId,
            });
        }

        // ❌ Response processing in route
        const post = await PrismaService.main.post.findUnique({
            where: { id: postData.id },
            include: { comments: true },
        });

        // ❌ Permission check in route
        await checkPostPermissions(post, userId);

        // ... 100+ more lines of business logic

        res.json({ success: true, data: result });
    } catch (e) {
        handler.handleException(res, e);
    }
});
```

**이 예시가 최악인 이유:**
- 200줄 이상의 비즈니스 로직
- 테스트가 어려움(HTTP mocking 필요)
- 재사용이 어려움(라우트에 결합됨)
- 책임이 섞여 있음
- 디버깅이 어려움
- 성능 추적이 어려움

### 리팩터링 방법(단계별)

**1단계: 컨트롤러 생성**

```typescript
// controllers/PostController.ts
export class PostController extends BaseController {
    private postService: PostService;

    constructor() {
        super();
        this.postService = new PostService();
    }

    async createPost(req: Request, res: Response): Promise<void> {
        try {
            const validated = createPostSchema.parse({
                ...req.body,
            });

            const result = await this.postService.createPost(
                validated,
                res.locals.userId
            );

            this.handleSuccess(res, result, 'Post created successfully');
        } catch (error) {
            this.handleError(error, res, 'createPost');
        }
    }
}
```

**2단계: 서비스 생성**

```typescript
// services/postService.ts
export class PostService {
    async createPost(
        data: CreatePostDTO,
        userId: string
    ): Promise<PostResult> {
        // Permission check
        const canCreate = await permissionService.canCreatePost(userId);
        if (!canCreate) {
            throw new ForbiddenError('No permission to create post');
        }

        // Execute workflow
        const engine = await createWorkflowEngine();
        const command = new CompleteStepCommand(/* ... */);
        const events = await engine.executeCommand(command);

        // Handle impersonation if needed
        if (context.isImpersonating) {
            await this.handleImpersonation(data.stepInstanceId, context);
        }

        // Synchronize roles
        await this.synchronizeRoles(events, userId);

        return { events, success: true };
    }

    private async handleImpersonation(stepInstanceId: number, context: any) {
        impersonationContextStore.storeContext(stepInstanceId, {
            originalUserId: context.originalUserId,
            effectiveUserId: context.effectiveUserId,
        });
    }

    private async synchronizeRoles(events: WorkflowEvent[], userId: string) {
        // Role synchronization logic
    }
}
```

**3단계: 라우트 업데이트**

```typescript
// routes/postRoutes.ts
import { PostController } from '../controllers/PostController';

const router = Router();
const controller = new PostController();

// ✅ CLEAN: Just routing
router.post('/',
    SSOMiddlewareClient.verifyLoginStatus,
    auditMiddleware,
    async (req, res) => controller.createPost(req, res)
);
```

**결과:**
- 라우트: 8줄(기존 200줄+)
- 컨트롤러: 25줄(요청 처리)
- 서비스: 50줄(비즈니스 로직)
- 테스트/재사용/유지보수 가능!

---

## 에러 처리

### 컨트롤러 에러 처리

```typescript
async createUser(req: Request, res: Response): Promise<void> {
    try {
        const result = await this.userService.create(req.body);
        this.handleSuccess(res, result, 'User created', 201);
    } catch (error) {
        // BaseController.handleError automatically:
        // - Captures to Sentry with context
        // - Sets appropriate status code
        // - Returns formatted error response
        this.handleError(error, res, 'createUser');
    }
}
```

### 커스텀 에러 상태 코드

```typescript
async getUser(req: Request, res: Response): Promise<void> {
    try {
        const user = await this.userService.findById(req.params.id);

        if (!user) {
            // Custom 404 status
            return this.handleError(
                new Error('User not found'),
                res,
                'getUser',
                404  // Custom status code
            );
        }

        this.handleSuccess(res, user);
    } catch (error) {
        this.handleError(error, res, 'getUser');
    }
}
```

### 검증 에러

```typescript
async createUser(req: Request, res: Response): Promise<void> {
    try {
        const validated = createUserSchema.parse(req.body);
        const user = await this.userService.create(validated);
        this.handleSuccess(res, user, 'User created', 201);
    } catch (error) {
        // Zod errors get 400 status
        if (error instanceof z.ZodError) {
            return this.handleError(error, res, 'createUser', 400);
        }
        this.handleError(error, res, 'createUser');
    }
}
```

---

## HTTP 상태 코드

### 표준 코드

| 코드 | 사용 사례 | 예시 |
|------|----------|---------|
| 200 | 성공(GET, PUT) | 사용자 조회, 업데이트 |
| 201 | 생성됨(POST) | 사용자 생성 |
| 204 | 콘텐츠 없음(DELETE) | 사용자 삭제 |
| 400 | 잘못된 요청 | 유효하지 않은 입력 데이터 |
| 401 | 인증 필요 | 인증되지 않음 |
| 403 | 권한 없음 | 권한 부족 |
| 404 | 찾을 수 없음 | 리소스가 존재하지 않음 |
| 409 | 충돌 | 중복 리소스 |
| 422 | 처리할 수 없는 엔티티 | 검증 실패 |
| 500 | 내부 서버 오류 | 예기치 않은 오류 |

### 사용 예시

```typescript
// 200 - Success (default)
this.handleSuccess(res, user);

// 201 - Created
this.handleSuccess(res, user, 'Created', 201);

// 400 - Bad Request
this.handleError(error, res, 'operation', 400);

// 404 - Not Found
this.handleError(new Error('Not found'), res, 'operation', 404);

// 403 - Forbidden
this.handleError(new ForbiddenError('No permission'), res, 'operation', 403);
```

---

## 리팩터링 가이드

### 리팩터링이 필요한 라우트 찾기

**레드 플래그:**
- 라우트 파일이 100줄 초과
- 한 라우트에 try-catch 블록이 여러 개
- DB 직접 접근(Prisma 호출)
- 복잡한 비즈니스 로직(if, loop 등)
- 라우트에서 권한 체크

**라우트를 점검하세요:**
```bash
# 큰 라우트 파일 찾기
wc -l form/src/routes/*.ts | sort -n

# Prisma를 사용하는 라우트 찾기
grep -r "PrismaService" form/src/routes/
```

### 리팩터링 프로세스

**1. 컨트롤러로 추출:**
```typescript
// Before: Route with logic
router.post('/action', async (req, res) => {
    try {
        // 50 lines of logic
    } catch (e) {
        handler.handleException(res, e);
    }
});

// After: Clean route
router.post('/action', (req, res) => controller.performAction(req, res));

// New controller method
async performAction(req: Request, res: Response): Promise<void> {
    try {
        const result = await this.service.performAction(req.body);
        this.handleSuccess(res, result);
    } catch (error) {
        this.handleError(error, res, 'performAction');
    }
}
```

**2. 서비스로 추출:**
```typescript
// Controller stays thin
async performAction(req: Request, res: Response): Promise<void> {
    try {
        const validated = actionSchema.parse(req.body);
        const result = await this.actionService.execute(validated);
        this.handleSuccess(res, result);
    } catch (error) {
        this.handleError(error, res, 'performAction');
    }
}

// Service contains business logic
export class ActionService {
    async execute(data: ActionDTO): Promise<Result> {
        // All business logic here
        // Permission checks
        // Database operations
        // Complex transformations
        return result;
    }
}
```

**3. 리포지토리 추가(필요 시):**
```typescript
// Service calls repository
export class ActionService {
    constructor(private actionRepository: ActionRepository) {}

    async execute(data: ActionDTO): Promise<Result> {
        // Business logic
        const entity = await this.actionRepository.findById(data.id);
        // More logic
        return await this.actionRepository.update(data.id, changes);
    }
}

// Repository handles data access
export class ActionRepository {
    async findById(id: number): Promise<Entity | null> {
        return PrismaService.main.entity.findUnique({ where: { id } });
    }

    async update(id: number, data: Partial<Entity>): Promise<Entity> {
        return PrismaService.main.entity.update({ where: { id }, data });
    }
}
```

---

**관련 파일:**
- [SKILL.md](SKILL.md) - 메인 가이드
- [services-and-repositories.md](services-and-repositories.md) - 서비스 레이어 상세
- [complete-examples.md](complete-examples.md) - 전체 리팩터링 예시
