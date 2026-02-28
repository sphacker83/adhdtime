# 서비스와 리포지토리 - 비즈니스 로직 레이어

서비스로 비즈니스 로직을 구성하고, 리포지토리로 데이터 접근을 구성하는 방법에 대한 완전한 가이드입니다.

## 목차

- [서비스 레이어 개요](#service-layer-overview)
- [의존성 주입 패턴](#dependency-injection-pattern)
- [싱글턴 패턴](#singleton-pattern)
- [리포지토리 패턴](#repository-pattern)
- [서비스 설계 원칙](#service-design-principles)
- [캐싱 전략](#caching-strategies)
- [서비스 테스트](#testing-services)

---

## 서비스 레이어 개요

### 서비스의 목적

**서비스는 비즈니스 로직을 담습니다** - 애플리케이션에서 “무엇을/왜”에 해당하는 부분입니다:

```
컨트롤러의 질문: "이걸 해야 하나요?"
서비스의 답: "예/아니오. 이유는 이렇고, 이렇게 동작합니다"
리포지토리의 실행: "요청한 데이터는 여기 있습니다"
```

**서비스의 책임:**
- ✅ 비즈니스 규칙 강제
- ✅ 여러 리포지토리 오케스트레이션
- ✅ 트랜잭션 관리
- ✅ 복잡한 계산
- ✅ 외부 서비스 연동
- ✅ 비즈니스 검증

**서비스가 하면 안 되는 것:**
- ❌ HTTP(Request/Response)를 알아야 함
- ❌ Prisma를 직접 접근(리포지토리 사용)
- ❌ 라우트 전용 로직 처리
- ❌ HTTP 응답 포맷팅

---

## 의존성 주입(Dependency Injection) 패턴

### 왜 의존성 주입인가?

**장점:**
- 테스트가 쉬움(mock 주입)
- 의존성이 명확함
- 유연한 설정
- 느슨한 결합(loose coupling) 촉진

### 훌륭한 예시: NotificationService

**File:** `/blog-api/src/services/NotificationService.ts`

```typescript
// Define dependencies interface for clarity
export interface NotificationServiceDependencies {
    prisma: PrismaClient;
    batchingService: BatchingService;
    emailComposer: EmailComposer;
}

// Service with dependency injection
export class NotificationService {
    private prisma: PrismaClient;
    private batchingService: BatchingService;
    private emailComposer: EmailComposer;
    private preferencesCache: Map<string, { preferences: UserPreference; timestamp: number }> = new Map();
    private CACHE_TTL = (notificationConfig.preferenceCacheTTLMinutes || 5) * 60 * 1000;

    // Dependencies injected via constructor
    constructor(dependencies: NotificationServiceDependencies) {
        this.prisma = dependencies.prisma;
        this.batchingService = dependencies.batchingService;
        this.emailComposer = dependencies.emailComposer;
    }

    /**
     * Create a notification and route it appropriately
     */
    async createNotification(params: CreateNotificationParams) {
        const { recipientID, type, title, message, link, context = {}, channel = 'both', priority = NotificationPriority.NORMAL } = params;

        try {
            // Get template and render content
            const template = getNotificationTemplate(type);
            const rendered = renderNotificationContent(template, context);

            // Create in-app notification record
            const notificationId = await createNotificationRecord({
                instanceId: parseInt(context.instanceId || '0', 10),
                template: type,
                recipientUserId: recipientID,
                channel: channel === 'email' ? 'email' : 'inApp',
                contextData: context,
                title: finalTitle,
                message: finalMessage,
                link: finalLink,
            });

            // Route notification based on channel
            if (channel === 'email' || channel === 'both') {
                await this.routeNotification({
                    notificationId,
                    userId: recipientID,
                    type,
                    priority,
                    title: finalTitle,
                    message: finalMessage,
                    link: finalLink,
                    context,
                });
            }

            return notification;
        } catch (error) {
            ErrorLogger.log(error, {
                context: {
                    '[NotificationService] createNotification': {
                        type: params.type,
                        recipientID: params.recipientID,
                    },
                },
            });
            throw error;
        }
    }

    /**
     * Route notification based on user preferences
     */
    private async routeNotification(params: { notificationId: number; userId: string; type: string; priority: NotificationPriority; title: string; message: string; link?: string; context?: Record<string, any> }) {
        // Get user preferences with caching
        const preferences = await this.getUserPreferences(params.userId);

        // Check if we should batch or send immediately
        if (this.shouldBatchEmail(preferences, params.type, params.priority)) {
            await this.batchingService.queueNotificationForBatch({
                notificationId: params.notificationId,
                userId: params.userId,
                userPreference: preferences,
                priority: params.priority,
            });
        } else {
            // Send immediately via EmailComposer
            await this.sendImmediateEmail({
                userId: params.userId,
                title: params.title,
                message: params.message,
                link: params.link,
                context: params.context,
                type: params.type,
            });
        }
    }

    /**
     * Determine if email should be batched
     */
    shouldBatchEmail(preferences: UserPreference, notificationType: string, priority: NotificationPriority): boolean {
        // HIGH priority always immediate
        if (priority === NotificationPriority.HIGH) {
            return false;
        }

        // Check batch mode
        const batchMode = preferences.emailBatchMode || BatchMode.IMMEDIATE;
        return batchMode !== BatchMode.IMMEDIATE;
    }

    /**
     * Get user preferences with caching
     */
    async getUserPreferences(userId: string): Promise<UserPreference> {
        // Check cache first
        const cached = this.preferencesCache.get(userId);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.preferences;
        }

        const preference = await this.prisma.userPreference.findUnique({
            where: { userID: userId },
        });

        const finalPreferences = preference || DEFAULT_PREFERENCES;

        // Update cache
        this.preferencesCache.set(userId, {
            preferences: finalPreferences,
            timestamp: Date.now(),
        });

        return finalPreferences;
    }
}
```

**컨트롤러에서 사용:**

```typescript
// Instantiate with dependencies
const notificationService = new NotificationService({
    prisma: PrismaService.main,
    batchingService: new BatchingService(PrismaService.main),
    emailComposer: new EmailComposer(),
});

// Use in controller
const notification = await notificationService.createNotification({
    recipientID: 'user-123',
    type: 'AFRLWorkflowNotification',
    context: { workflowName: 'AFRL Monthly Report' },
});
```

**핵심 정리:**
- 의존성은 생성자(constructor)로 전달
- 필요한 의존성을 명확한 인터페이스로 정의
- 테스트가 쉬움(mock 주입)
- 캐싱 로직이 캡슐화됨
- 비즈니스 규칙이 HTTP로부터 분리됨

---

## 싱글턴(Singleton) 패턴

### 싱글턴을 사용해야 하는 경우

**사용 대상:**
- 초기화 비용이 큰 서비스
- 공유 상태(캐싱)가 있는 서비스
- 여러 곳에서 접근하는 서비스
- 권한(permissions) 서비스
- 설정(configuration) 서비스

### 예시: PermissionService(싱글턴)

**File:** `/blog-api/src/services/permissionService.ts`

```typescript
import { PrismaClient } from '@prisma/client';

class PermissionService {
    private static instance: PermissionService;
    private prisma: PrismaClient;
    private permissionCache: Map<string, { canAccess: boolean; timestamp: number }> = new Map();
    private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    // Private constructor prevents direct instantiation
    private constructor() {
        this.prisma = PrismaService.main;
    }

    // Get singleton instance
    public static getInstance(): PermissionService {
        if (!PermissionService.instance) {
            PermissionService.instance = new PermissionService();
        }
        return PermissionService.instance;
    }

    /**
     * Check if user can complete a workflow step
     */
    async canCompleteStep(userId: string, stepInstanceId: number): Promise<boolean> {
        const cacheKey = `${userId}:${stepInstanceId}`;

        // Check cache
        const cached = this.permissionCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.canAccess;
        }

        try {
            const post = await this.prisma.post.findUnique({
                where: { id: postId },
                include: {
                    author: true,
                    comments: {
                        include: {
                            user: true,
                        },
                    },
                },
            });

            if (!post) {
                return false;
            }

            // Check if user has permission
            const canEdit = post.authorId === userId ||
                await this.isUserAdmin(userId);

            // Cache result
            this.permissionCache.set(cacheKey, {
                canAccess: isAssigned,
                timestamp: Date.now(),
            });

            return isAssigned;
        } catch (error) {
            console.error('[PermissionService] Error checking step permission:', error);
            return false;
        }
    }

    /**
     * Clear cache for user
     */
    clearUserCache(userId: string): void {
        for (const [key] of this.permissionCache) {
            if (key.startsWith(`${userId}:`)) {
                this.permissionCache.delete(key);
            }
        }
    }

    /**
     * Clear all cache
     */
    clearCache(): void {
        this.permissionCache.clear();
    }
}

// Export singleton instance
export const permissionService = PermissionService.getInstance();
```

**사용법:**

```typescript
import { permissionService } from '../services/permissionService';

// Use anywhere in the codebase
const canComplete = await permissionService.canCompleteStep(userId, stepId);

if (!canComplete) {
    throw new ForbiddenError('You do not have permission to complete this step');
}
```

---

## 리포지토리 패턴

### 리포지토리의 목적

**리포지토리는 데이터 접근을 추상화합니다** - 데이터 작업에서 “어떻게”에 해당하는 부분입니다:

```
Service: "Get me all active users sorted by name"
Repository: "Here's the Prisma query that does that"
```

**리포지토리의 책임:**
- ✅ 모든 Prisma 작업
- ✅ 쿼리 구성
- ✅ 쿼리 최적화(select, include)
- ✅ DB 에러 처리
- ✅ DB 결과 캐싱

**리포지토리가 하면 안 되는 것:**
- ❌ 비즈니스 로직 포함
- ❌ HTTP를 앎
- ❌ 의사결정을 함(그건 서비스 레이어)

### 리포지토리 템플릿

```typescript
// repositories/UserRepository.ts
import { PrismaService } from '@project-lifecycle-portal/database';
import type { User, Prisma } from '@project-lifecycle-portal/database';

export class UserRepository {
    /**
     * Find user by ID with optimized query
     */
    async findById(userId: string): Promise<User | null> {
        try {
            return await PrismaService.main.user.findUnique({
                where: { userID: userId },
                select: {
                    userID: true,
                    email: true,
                    name: true,
                    isActive: true,
                    roles: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        } catch (error) {
            console.error('[UserRepository] Error finding user by ID:', error);
            throw new Error(`Failed to find user: ${userId}`);
        }
    }

    /**
     * Find all active users
     */
    async findActive(options?: { orderBy?: Prisma.UserOrderByWithRelationInput }): Promise<User[]> {
        try {
            return await PrismaService.main.user.findMany({
                where: { isActive: true },
                orderBy: options?.orderBy || { name: 'asc' },
                select: {
                    userID: true,
                    email: true,
                    name: true,
                    roles: true,
                },
            });
        } catch (error) {
            console.error('[UserRepository] Error finding active users:', error);
            throw new Error('Failed to find active users');
        }
    }

    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<User | null> {
        try {
            return await PrismaService.main.user.findUnique({
                where: { email },
            });
        } catch (error) {
            console.error('[UserRepository] Error finding user by email:', error);
            throw new Error(`Failed to find user with email: ${email}`);
        }
    }

    /**
     * Create new user
     */
    async create(data: Prisma.UserCreateInput): Promise<User> {
        try {
            return await PrismaService.main.user.create({ data });
        } catch (error) {
            console.error('[UserRepository] Error creating user:', error);
            throw new Error('Failed to create user');
        }
    }

    /**
     * Update user
     */
    async update(userId: string, data: Prisma.UserUpdateInput): Promise<User> {
        try {
            return await PrismaService.main.user.update({
                where: { userID: userId },
                data,
            });
        } catch (error) {
            console.error('[UserRepository] Error updating user:', error);
            throw new Error(`Failed to update user: ${userId}`);
        }
    }

    /**
     * Delete user (soft delete by setting isActive = false)
     */
    async delete(userId: string): Promise<User> {
        try {
            return await PrismaService.main.user.update({
                where: { userID: userId },
                data: { isActive: false },
            });
        } catch (error) {
            console.error('[UserRepository] Error deleting user:', error);
            throw new Error(`Failed to delete user: ${userId}`);
        }
    }

    /**
     * Check if email exists
     */
    async emailExists(email: string): Promise<boolean> {
        try {
            const count = await PrismaService.main.user.count({
                where: { email },
            });
            return count > 0;
        } catch (error) {
            console.error('[UserRepository] Error checking email exists:', error);
            throw new Error('Failed to check if email exists');
        }
    }
}

// Export singleton instance
export const userRepository = new UserRepository();
```

**서비스에서 리포지토리 사용:**

```typescript
// services/userService.ts
import { userRepository } from '../repositories/UserRepository';
import { ConflictError, NotFoundError } from '../utils/errors';

export class UserService {
    /**
     * Create new user with business rules
     */
    async createUser(data: { email: string; name: string; roles: string[] }): Promise<User> {
        // Business rule: Check if email already exists
        const emailExists = await userRepository.emailExists(data.email);
        if (emailExists) {
            throw new ConflictError('Email already exists');
        }

        // Business rule: Validate roles
        const validRoles = ['admin', 'operations', 'user'];
        const invalidRoles = data.roles.filter((role) => !validRoles.includes(role));
        if (invalidRoles.length > 0) {
            throw new ValidationError(`Invalid roles: ${invalidRoles.join(', ')}`);
        }

        // Create user via repository
        return await userRepository.create({
            email: data.email,
            name: data.name,
            roles: data.roles,
            isActive: true,
        });
    }

    /**
     * Get user by ID
     */
    async getUser(userId: string): Promise<User> {
        const user = await userRepository.findById(userId);

        if (!user) {
            throw new NotFoundError(`User not found: ${userId}`);
        }

        return user;
    }
}
```

---

## 서비스 설계 원칙

### 1. 단일 책임(Single Responsibility)

각 서비스는 명확한 단 하나의 목적을 가져야 합니다:

```typescript
// ✅ GOOD - Single responsibility
class UserService {
    async createUser() {}
    async updateUser() {}
    async deleteUser() {}
}

class EmailService {
    async sendEmail() {}
    async sendBulkEmails() {}
}

// ❌ BAD - Too many responsibilities
class UserService {
    async createUser() {}
    async sendWelcomeEmail() {}  // Should be EmailService
    async logUserActivity() {}   // Should be AuditService
    async processPayment() {}    // Should be PaymentService
}
```

### 2. 명확한 메서드 이름

메서드 이름은 “무엇을 하는지”를 설명해야 합니다:

```typescript
// ✅ GOOD - Clear intent
async createNotification()
async getUserPreferences()
async shouldBatchEmail()
async routeNotification()

// ❌ BAD - Vague or misleading
async process()
async handle()
async doIt()
async execute()
```

### 3. 반환 타입

항상 명시적인 반환 타입을 사용하세요:

```typescript
// ✅ GOOD - Explicit types
async createUser(data: CreateUserDTO): Promise<User> {}
async findUsers(): Promise<User[]> {}
async deleteUser(id: string): Promise<void> {}

// ❌ BAD - Implicit any
async createUser(data) {}  // No types!
```

### 4. 에러 처리

서비스는 의미 있는 에러를 던져야 합니다:

```typescript
// ✅ GOOD - Meaningful errors
if (!user) {
    throw new NotFoundError(`User not found: ${userId}`);
}

if (emailExists) {
    throw new ConflictError('Email already exists');
}

// ❌ BAD - Generic errors
if (!user) {
    throw new Error('Error');  // What error?
}
```

### 5. God Service 피하기

모든 일을 다 하는 서비스를 만들지 마세요:

```typescript
// ❌ BAD - God service
class WorkflowService {
    async startWorkflow() {}
    async completeStep() {}
    async assignRoles() {}
    async sendNotifications() {}  // Should be NotificationService
    async validatePermissions() {}  // Should be PermissionService
    async logAuditTrail() {}  // Should be AuditService
    // ... 50 more methods
}

// ✅ GOOD - Focused services
class WorkflowService {
    constructor(
        private notificationService: NotificationService,
        private permissionService: PermissionService,
        private auditService: AuditService
    ) {}

    async startWorkflow() {
        // Orchestrate other services
        await this.permissionService.checkPermission();
        await this.workflowRepository.create();
        await this.notificationService.notify();
        await this.auditService.log();
    }
}
```

---

## 캐싱 전략

### 1. 인메모리 캐싱

```typescript
class UserService {
    private cache: Map<string, { user: User; timestamp: number }> = new Map();
    private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    async getUser(userId: string): Promise<User> {
        // Check cache
        const cached = this.cache.get(userId);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.user;
        }

        // Fetch from database
        const user = await userRepository.findById(userId);

        // Update cache
        if (user) {
            this.cache.set(userId, { user, timestamp: Date.now() });
        }

        return user;
    }

    clearUserCache(userId: string): void {
        this.cache.delete(userId);
    }
}
```

### 2. 캐시 무효화

```typescript
class UserService {
    async updateUser(userId: string, data: UpdateUserDTO): Promise<User> {
        // Update in database
        const user = await userRepository.update(userId, data);

        // Invalidate cache
        this.clearUserCache(userId);

        return user;
    }
}
```

---

## 서비스 테스트

### 유닛 테스트

```typescript
// tests/userService.test.ts
import { UserService } from '../services/userService';
import { userRepository } from '../repositories/UserRepository';
import { ConflictError } from '../utils/errors';

// Mock repository
jest.mock('../repositories/UserRepository');

describe('UserService', () => {
    let userService: UserService;

    beforeEach(() => {
        userService = new UserService();
        jest.clearAllMocks();
    });

    describe('createUser', () => {
        it('should create user when email does not exist', async () => {
            // Arrange
            const userData = {
                email: 'test@example.com',
                name: 'Test User',
                roles: ['user'],
            };

            (userRepository.emailExists as jest.Mock).mockResolvedValue(false);
            (userRepository.create as jest.Mock).mockResolvedValue({
                userID: '123',
                ...userData,
            });

            // Act
            const user = await userService.createUser(userData);

            // Assert
            expect(user).toBeDefined();
            expect(user.email).toBe(userData.email);
            expect(userRepository.emailExists).toHaveBeenCalledWith(userData.email);
            expect(userRepository.create).toHaveBeenCalled();
        });

        it('should throw ConflictError when email exists', async () => {
            // Arrange
            const userData = {
                email: 'existing@example.com',
                name: 'Test User',
                roles: ['user'],
            };

            (userRepository.emailExists as jest.Mock).mockResolvedValue(true);

            // Act & Assert
            await expect(userService.createUser(userData)).rejects.toThrow(ConflictError);
            expect(userRepository.create).not.toHaveBeenCalled();
        });
    });
});
```

---

**관련 파일:**
- [SKILL.md](SKILL.md) - 메인 가이드
- [routing-and-controllers.md](routing-and-controllers.md) - 서비스를 사용하는 컨트롤러
- [database-patterns.md](database-patterns.md) - Prisma 및 리포지토리 패턴
- [complete-examples.md](complete-examples.md) - 서비스/리포지토리 전체 예제
