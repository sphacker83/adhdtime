# 테스트 가이드 - 백엔드 테스트 전략

Jest를 사용해 백엔드 서비스를 테스트하는 방법과 모범 사례를 다루는 완전한 가이드입니다.

## 목차

- [유닛 테스트](#unit-testing)
- [통합 테스트](#integration-testing)
- [Mocking 전략](#mocking-strategies)
- [테스트 데이터 관리](#test-data-management)
- [인증된 라우트 테스트](#testing-authenticated-routes)
- [커버리지 목표](#coverage-targets)

---

## 유닛 테스트(Unit Testing)

### 테스트 구조

```typescript
// services/userService.test.ts
import { UserService } from './userService';
import { UserRepository } from '../repositories/UserRepository';

jest.mock('../repositories/UserRepository');

describe('UserService', () => {
    let service: UserService;
    let mockRepository: jest.Mocked<UserRepository>;

    beforeEach(() => {
        mockRepository = {
            findByEmail: jest.fn(),
            create: jest.fn(),
        } as any;

        service = new UserService();
        (service as any).userRepository = mockRepository;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should throw error if email exists', async () => {
            mockRepository.findByEmail.mockResolvedValue({ id: '123' } as any);

            await expect(
                service.create({ email: 'test@test.com' })
            ).rejects.toThrow('Email already in use');
        });

        it('should create user if email is unique', async () => {
            mockRepository.findByEmail.mockResolvedValue(null);
            mockRepository.create.mockResolvedValue({ id: '123' } as any);

            const user = await service.create({
                email: 'test@test.com',
                firstName: 'John',
                lastName: 'Doe',
            });

            expect(user).toBeDefined();
            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: 'test@test.com'
                })
            );
        });
    });
});
```

---

## 통합 테스트(Integration Testing)

### 실제 DB로 테스트

```typescript
import { PrismaService } from '@project-lifecycle-portal/database';

describe('UserService Integration', () => {
    let testUser: any;

    beforeAll(async () => {
        // Create test data
        testUser = await PrismaService.main.user.create({
            data: {
                email: 'test@test.com',
                profile: { create: { firstName: 'Test', lastName: 'User' } },
            },
        });
    });

    afterAll(async () => {
        // Cleanup
        await PrismaService.main.user.delete({ where: { id: testUser.id } });
    });

    it('should find user by email', async () => {
        const user = await userService.findByEmail('test@test.com');
        expect(user).toBeDefined();
        expect(user?.email).toBe('test@test.com');
    });
});
```

---

## Mocking 전략

### PrismaService Mock

```typescript
jest.mock('@project-lifecycle-portal/database', () => ({
    PrismaService: {
        main: {
            user: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
        },
        isAvailable: true,
    },
}));
```

### 서비스 Mock

```typescript
const mockUserService = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
} as jest.Mocked<UserService>;
```

---

## 테스트 데이터 관리

### Setup 및 Teardown

```typescript
describe('PermissionService', () => {
    let instanceId: number;

    beforeAll(async () => {
        // Create test post
        const post = await PrismaService.main.post.create({
            data: { title: 'Test Post', content: 'Test', authorId: 'test-user' },
        });
        instanceId = post.id;
    });

    afterAll(async () => {
        // Cleanup
        await PrismaService.main.post.delete({
            where: { id: instanceId },
        });
    });

    beforeEach(() => {
        // Clear caches
        permissionService.clearCache();
    });

    it('should check permissions', async () => {
        const hasPermission = await permissionService.checkPermission(
            'user-id',
            instanceId,
            'VIEW_WORKFLOW'
        );
        expect(hasPermission).toBeDefined();
    });
});
```

---

## 인증된 라우트 테스트

### test-auth-route.js 사용

```bash
# Test authenticated endpoint
node scripts/test-auth-route.js http://localhost:3002/form/api/users

# Test with POST data
node scripts/test-auth-route.js http://localhost:3002/form/api/users POST '{"email":"test@test.com"}'
```

### 테스트에서 인증 Mock

```typescript
// Mock auth middleware
jest.mock('../middleware/SSOMiddleware', () => ({
    SSOMiddlewareClient: {
        verifyLoginStatus: (req, res, next) => {
            res.locals.claims = {
                sub: 'test-user-id',
                preferred_username: 'testuser',
            };
            next();
        },
    },
}));
```

---

## 커버리지 목표

### 권장 커버리지

- **Unit Tests**: 70%+ coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Happy paths covered

### 커버리지 실행

```bash
npm test -- --coverage
```

---

**관련 파일:**
- [SKILL.md](SKILL.md)
- [services-and-repositories.md](services-and-repositories.md)
- [complete-examples.md](complete-examples.md)
