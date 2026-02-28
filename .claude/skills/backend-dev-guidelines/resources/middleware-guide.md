# 미들웨어 가이드 - Express 미들웨어 패턴

백엔드 마이크로서비스에서 미들웨어를 만들고 사용하는 방법에 대한 완전한 가이드입니다.

## 목차

- [인증 미들웨어](#authentication-middleware)
- [AsyncLocalStorage 감사(Audit) 미들웨어](#audit-middleware-with-asynclocalstorage)
- [에러 바운더리 미들웨어](#error-boundary-middleware)
- [검증(Validation) 미들웨어](#validation-middleware)
- [조합 가능한(Composable) 미들웨어](#composable-middleware)
- [미들웨어 순서](#middleware-ordering)

---

## 인증(Authentication) 미들웨어

### SSOMiddleware 패턴

**File:** `/form/src/middleware/SSOMiddleware.ts`

```typescript
export class SSOMiddlewareClient {
    static verifyLoginStatus(req: Request, res: Response, next: NextFunction): void {
        const token = req.cookies.refresh_token;

        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        try {
            const decoded = jwt.verify(token, config.tokens.jwt);
            res.locals.claims = decoded;
            res.locals.effectiveUserId = decoded.sub;
            next();
        } catch (error) {
            res.status(401).json({ error: 'Invalid token' });
        }
    }
}
```

---

## AsyncLocalStorage를 사용하는 감사(Audit) 미들웨어

### Blog API의 훌륭한 패턴

**File:** `/form/src/middleware/auditMiddleware.ts`

```typescript
import { AsyncLocalStorage } from 'async_hooks';

export interface AuditContext {
    userId: string;
    userName?: string;
    impersonatedBy?: string;
    sessionId?: string;
    timestamp: Date;
    requestId: string;
}

export const auditContextStorage = new AsyncLocalStorage<AuditContext>();

export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
    const context: AuditContext = {
        userId: res.locals.effectiveUserId || 'anonymous',
        userName: res.locals.claims?.preferred_username,
        impersonatedBy: res.locals.isImpersonating ? res.locals.originalUserId : undefined,
        timestamp: new Date(),
        requestId: req.id || uuidv4(),
    };

    auditContextStorage.run(context, () => {
        next();
    });
}

// Getter for current context
export function getAuditContext(): AuditContext | null {
    return auditContextStorage.getStore() || null;
}
```

**장점:**
- 컨텍스트가 요청 전체에 전파됨
- 모든 함수에 컨텍스트를 전달할 필요가 없음
- 서비스/리포지토리에서 자동으로 사용 가능
- 타입 안전한 컨텍스트 접근

**서비스에서 사용 예시:**
```typescript
import { getAuditContext } from '../middleware/auditMiddleware';

async function someOperation() {
    const context = getAuditContext();
    console.log('Operation by:', context?.userId);
}
```

---

## 에러 바운더리(Error Boundary) 미들웨어

### 포괄적인 에러 핸들러

**File:** `/form/src/middleware/errorBoundary.ts`

```typescript
export function errorBoundary(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Determine status code
    const statusCode = getStatusCodeForError(error);

    // Capture to Sentry
    Sentry.withScope((scope) => {
        scope.setLevel(statusCode >= 500 ? 'error' : 'warning');
        scope.setTag('error_type', error.name);
        scope.setContext('error_details', {
            message: error.message,
            stack: error.stack,
        });
        Sentry.captureException(error);
    });

    // User-friendly response
    res.status(statusCode).json({
        success: false,
        error: {
            message: getUserFriendlyMessage(error),
            code: error.name,
        },
        requestId: Sentry.getCurrentScope().getPropagationContext().traceId,
    });
}

// Async wrapper
export function asyncErrorWrapper(
    handler: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await handler(req, res, next);
        } catch (error) {
            next(error);
        }
    };
}
```

---

## 조합 가능한(Composable) 미들웨어

### withAuthAndAudit 패턴

```typescript
export function withAuthAndAudit(...authMiddleware: any[]) {
    return [
        ...authMiddleware,
        auditMiddleware,
    ];
}

// Usage
router.post('/:formID/submit',
    ...withAuthAndAudit(SSOMiddlewareClient.verifyLoginStatus),
    async (req, res) => controller.submit(req, res)
);
```

---

## 미들웨어 순서

### 필수 순서(반드시 준수)

```typescript
// 1. Sentry request handler (FIRST)
app.use(Sentry.Handlers.requestHandler());

// 2. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Cookie parsing
app.use(cookieParser());

// 4. Auth initialization
app.use(SSOMiddleware.initialize());

// 5. Routes registered here
app.use('/api/users', userRoutes);

// 6. Error handler (AFTER routes)
app.use(errorBoundary);

// 7. Sentry error handler (LAST)
app.use(Sentry.Handlers.errorHandler());
```

**규칙:** 에러 핸들러는 모든 라우트 등록 **이후**에 반드시 등록해야 합니다!

---

**관련 파일:**
- [SKILL.md](SKILL.md)
- [routing-and-controllers.md](routing-and-controllers.md)
- [async-and-errors.md](async-and-errors.md)
