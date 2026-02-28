# 아키텍처 개요 - 백엔드 서비스

백엔드 마이크로서비스에서 사용하는 레이어드 아키텍처 패턴의 완전한 가이드입니다.

## 목차

- [레이어드 아키텍처 패턴](#layered-architecture-pattern)
- [요청 라이프사이클](#request-lifecycle)
- [서비스 비교](#service-comparison)
- [디렉터리 구조의 근거](#directory-structure-rationale)
- [모듈 구성](#module-organization)
- [관심사 분리](#separation-of-concerns)

---

## 레이어드 아키텍처 패턴

### 4개 레이어

```
┌─────────────────────────────────────┐
│         HTTP Request                │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│  Layer 1: ROUTES                    │
│  - Route definitions only           │
│  - Middleware registration          │
│  - Delegate to controllers          │
│  - NO business logic                │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│  Layer 2: CONTROLLERS               │
│  - Request/response handling        │
│  - Input validation                 │
│  - Call services                    │
│  - Format responses                 │
│  - Error handling                   │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│  Layer 3: SERVICES                  │
│  - Business logic                   │
│  - Orchestration                    │
│  - Call repositories                │
│  - No HTTP knowledge                │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│  Layer 4: REPOSITORIES              │
│  - Data access abstraction          │
│  - Prisma operations                │
│  - Query optimization               │
│  - Caching                          │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│         Database (MySQL)            │
└─────────────────────────────────────┘
```

### 왜 이 아키텍처인가?

**테스트 용이성(Testability):**
- 각 레이어를 독립적으로 테스트 가능
- 의존성 mocking이 쉬움
- 테스트 경계가 명확함

**유지보수성(Maintainability):**
- 변경이 특정 레이어로 격리됨
- 비즈니스 로직이 HTTP 관심사와 분리됨
- 버그 위치를 찾기 쉬움

**재사용성(Reusability):**
- 서비스는 라우트/크론 잡/스크립트 등에서 재사용 가능
- 리포지토리가 DB 구현을 숨김
- 비즈니스 로직이 HTTP에 종속되지 않음

**확장성(Scalability):**
- 새 엔드포인트 추가가 쉬움
- 따라야 할 패턴이 명확함
- 구조가 일관됨

---

## 요청 라이프사이클

### 전체 흐름 예시

```typescript
1. HTTP POST /api/users
   ↓
2. Express matches route in userRoutes.ts
   ↓
3. Middleware chain executes:
   - SSOMiddleware.verifyLoginStatus (authentication)
   - auditMiddleware (context tracking)
   ↓
4. Route handler delegates to controller:
   router.post('/users', (req, res) => userController.create(req, res))
   ↓
5. Controller validates and calls service:
   - Validate input with Zod
   - Call userService.create(data)
   - Handle success/error
   ↓
6. Service executes business logic:
   - Check business rules
   - Call userRepository.create(data)
   - Return result
   ↓
7. Repository performs database operation:
   - PrismaService.main.user.create({ data })
   - Handle database errors
   - Return created user
   ↓
8. Response flows back:
   Repository → Service → Controller → Express → Client
```

### 미들웨어 실행 순서

**중요:** 미들웨어는 등록 순서대로 실행됩니다

```typescript
app.use(Sentry.Handlers.requestHandler());  // 1. Sentry tracing (FIRST)
app.use(express.json());                     // 2. Body parsing
app.use(express.urlencoded({ extended: true })); // 3. URL encoding
app.use(cookieParser());                     // 4. Cookie parsing
app.use(SSOMiddleware.initialize());         // 5. Auth initialization
// ... routes registered here
app.use(auditMiddleware);                    // 6. Audit (if global)
app.use(errorBoundary);                      // 7. Error handler (LAST)
app.use(Sentry.Handlers.errorHandler());     // 8. Sentry errors (LAST)
```

**규칙:** 에러 핸들러는 반드시 라우트 등록 **이후**에 등록해야 합니다!

---

## 서비스 비교

### Email Service (성숙한 패턴 ✅)

**강점:**
- Sentry 통합을 포함한 포괄적인 BaseController
- 깔끔한 라우트 위임(라우트에 비즈니스 로직 없음)
- 일관된 의존성 주입 패턴
- 좋은 미들웨어 구성
- 전반적으로 타입 안전
- 훌륭한 에러 처리

**예시 구조:**
```
email/src/
├── controllers/
│   ├── BaseController.ts          ✅ Excellent template
│   ├── NotificationController.ts  ✅ Extends BaseController
│   └── EmailController.ts         ✅ Clean patterns
├── routes/
│   ├── notificationRoutes.ts      ✅ Clean delegation
│   └── emailRoutes.ts             ✅ No business logic
├── services/
│   ├── NotificationService.ts     ✅ Dependency injection
│   └── BatchingService.ts         ✅ Clear responsibility
└── middleware/
    ├── errorBoundary.ts           ✅ Comprehensive
    └── DevImpersonationSSOMiddleware.ts
```

새 서비스를 만들 때 **템플릿으로 사용하세요**!

### Form Service (전환 중 ⚠️)

**강점:**
- 훌륭한 워크플로 아키텍처(event sourcing)
- 좋은 Sentry 통합
- 혁신적인 audit 미들웨어(AsyncLocalStorage)
- 포괄적인 권한 시스템

**약점:**
- 일부 라우트에 비즈니스 로직이 200줄 이상 존재
- 컨트롤러 네이밍이 일관되지 않음
- process.env 직접 사용(60+회)
- 리포지토리 패턴 사용이 미미함

**예시:**
```
form/src/
├── routes/
│   ├── responseRoutes.ts          ❌ Business logic in routes
│   └── proxyRoutes.ts             ✅ Good validation pattern
├── controllers/
│   ├── formController.ts          ⚠️ Lowercase naming
│   └── UserProfileController.ts   ✅ PascalCase naming
├── workflow/                      ✅ Excellent architecture!
│   ├── core/
│   │   ├── WorkflowEngineV3.ts   ✅ Event sourcing
│   │   └── DryRunWrapper.ts      ✅ Innovative
│   └── services/
└── middleware/
    └── auditMiddleware.ts         ✅ AsyncLocalStorage pattern
```

**배울 점:** workflow/, middleware/auditMiddleware.ts
**피하기:** responseRoutes.ts, process.env 직접 사용

---

## 디렉터리 구조의 근거

### controllers 디렉터리

**목적:** HTTP 요청/응답 관심사 처리

**내용:**
- `BaseController.ts` - 공통 메서드가 있는 베이스 클래스
- `{Feature}Controller.ts` - 기능(feature)별 컨트롤러

**네이밍:** PascalCase + Controller

**책임:**
- 요청 파라미터 파싱
- 입력 검증(Zod)
- 적절한 서비스 메서드 호출
- 응답 포맷팅
- 에러 처리(BaseController 경유)
- HTTP 상태 코드 설정

### services 디렉터리

**목적:** 비즈니스 로직 및 오케스트레이션

**내용:**
- `{feature}Service.ts` - 기능(feature) 비즈니스 로직

**네이밍:** camelCase + Service (또는 PascalCase + Service)

**책임:**
- 비즈니스 규칙 구현
- 여러 리포지토리 오케스트레이션
- 트랜잭션 관리
- 비즈니스 검증
- HTTP 지식 없음(Request/Response 타입에 의존하지 않음)

### repositories 디렉터리

**목적:** 데이터 접근 추상화

**내용:**
- `{Entity}Repository.ts` - 엔티티 DB 작업

**네이밍:** PascalCase + Repository

**책임:**
- Prisma 쿼리 작업
- 쿼리 최적화
- DB 에러 처리
- 캐싱 레이어
- Prisma 구현 세부사항 숨김

**현재 공백:** 리포지토리가 1개만 존재(WorkflowRepository)

### routes 디렉터리

**목적:** 라우트 등록 **전용**

**내용:**
- `{feature}Routes.ts` - 기능(feature) Express 라우터

**네이밍:** camelCase + Routes

**책임:**
- Express에 라우트 등록
- 미들웨어 적용
- 컨트롤러로 위임
- **비즈니스 로직 금지!**

### middleware 디렉터리

**목적:** 횡단 관심사(Cross-cutting concerns)

**내용:**
- 인증(Authentication) 미들웨어
- 감사(Audit) 미들웨어
- 에러 바운더리
- 검증(Validation) 미들웨어
- 커스텀 미들웨어

**네이밍:** camelCase

**유형:**
- 요청 처리(핸들러 이전)
- 응답 처리(핸들러 이후)
- 에러 처리(error boundary)

### config 디렉터리

**목적:** 설정(Configuration) 관리

**내용:**
- `unifiedConfig.ts` - 타입 안전한 설정
- 환경별 설정

**패턴:** 단일 진실 공급원(Single source of truth)

### types 디렉터리

**목적:** TypeScript 타입 정의

**내용:**
- `{feature}.types.ts` - 기능(feature) 전용 타입
- DTO(데이터 전송 객체, Data Transfer Objects)
- Request/Response 타입
- 도메인 모델

---

## 모듈 구성

### 기능(Feature) 기반 구성

규모가 큰 기능(feature)은 하위 디렉터리를 사용하세요:

```
src/workflow/
├── core/              # Core engine
├── services/          # Workflow-specific services
├── actions/           # System actions
├── models/            # Domain models
├── validators/        # Workflow validation
└── utils/             # Workflow utilities
```

**사용 시점:**
- 기능에 파일이 5개 이상
- 명확한 하위 도메인이 존재
- 논리적 그룹화가 가독성을 개선

### 플랫(Flat) 구성

단순한 기능(feature)에는:

```
src/
├── controllers/UserController.ts
├── services/userService.ts
├── routes/userRoutes.ts
└── repositories/UserRepository.ts
```

**사용 시점:**
- 단순한 기능(파일 5개 미만)
- 명확한 하위 도메인이 없음
- 플랫 구조가 더 명확함

---

## 관심사 분리(Separation of Concerns)

### 무엇을 어디에 두나

**Routes 레이어:**
- ✅ 라우트 정의
- ✅ 미들웨어 등록
- ✅ 컨트롤러 위임
- ❌ 비즈니스 로직
- ❌ DB 작업
- ❌ 검증 로직(validator 또는 controller에 있어야 함)

**Controllers 레이어:**
- ✅ 요청 파싱(params, body, query)
- ✅ 입력 검증(Zod)
- ✅ 서비스 호출
- ✅ 응답 포맷팅
- ✅ 에러 처리
- ❌ 비즈니스 로직
- ❌ DB 작업

**Services 레이어:**
- ✅ 비즈니스 로직
- ✅ 비즈니스 규칙 강제
- ✅ 오케스트레이션(여러 리포지토리)
- ✅ 트랜잭션 관리
- ❌ HTTP 관심사(Request/Response)
- ❌ Prisma 직접 호출(리포지토리 사용)

**Repositories 레이어:**
- ✅ Prisma 작업
- ✅ 쿼리 구성
- ✅ DB 에러 처리
- ✅ 캐싱
- ❌ 비즈니스 로직
- ❌ HTTP 관심사

### 예시: 사용자 생성

**라우트:**
```typescript
router.post('/users',
    SSOMiddleware.verifyLoginStatus,
    auditMiddleware,
    (req, res) => userController.create(req, res)
);
```

**컨트롤러:**
```typescript
async create(req: Request, res: Response): Promise<void> {
    try {
        const validated = createUserSchema.parse(req.body);
        const user = await this.userService.create(validated);
        this.handleSuccess(res, user, 'User created');
    } catch (error) {
        this.handleError(error, res, 'create');
    }
}
```

**서비스:**
```typescript
async create(data: CreateUserDTO): Promise<User> {
    // Business rule: check if email already exists
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) throw new ConflictError('Email already exists');

    // Create user
    return await this.userRepository.create(data);
}
```

**리포지토리:**
```typescript
async create(data: CreateUserDTO): Promise<User> {
    return PrismaService.main.user.create({ data });
}

async findByEmail(email: string): Promise<User | null> {
    return PrismaService.main.user.findUnique({ where: { email } });
}
```

**포인트:** 각 레이어의 책임이 명확히 분리되어 있습니다!

---

**관련 파일:**
- [SKILL.md](SKILL.md) - 메인 가이드
- [routing-and-controllers.md](routing-and-controllers.md) - 라우트/컨트롤러 상세
- [services-and-repositories.md](services-and-repositories.md) - 서비스/리포지토리 패턴
