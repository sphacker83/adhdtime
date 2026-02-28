---
name: backend-dev-guidelines
description: Node.js/Express/TypeScript 마이크로서비스를 위한 포괄적인 백엔드 개발 가이드입니다. 라우트/컨트롤러/서비스/리포지토리/미들웨어를 만들거나, Express API, Prisma DB 접근, Sentry 에러 트래킹, Zod 검증, unifiedConfig, 의존성 주입, 비동기 패턴을 다룰 때 사용하세요. 레이어드 아키텍처(라우트 → 컨트롤러 → 서비스 → 리포지토리), BaseController 패턴, 에러 처리, 성능 모니터링, 테스트 전략, 레거시 패턴에서의 마이그레이션을 다룹니다.
---

# 백엔드 개발 가이드라인

## 목적

현대적인 Node.js/Express/TypeScript 패턴을 사용해 백엔드 마이크로서비스(blog-api, auth-service, notifications-service) 전반의 일관성과 모범 사례를 확립합니다.

## 이 스킬을 사용해야 하는 경우

다음 작업을 할 때 자동으로 활성화됩니다:
- 라우트/엔드포인트/API를 생성하거나 수정할 때
- 컨트롤러/서비스/리포지토리를 만들 때
- 미들웨어(인증, 검증, 에러 처리)를 구현할 때
- Prisma로 DB 작업을 할 때
- Sentry로 에러 트래킹을 할 때
- Zod로 입력을 검증할 때
- 설정(config)을 관리할 때
- 백엔드를 테스트/리팩터링할 때

---

## 빠른 시작

### 새 백엔드 기능 체크리스트

- [ ] **라우트(Route)**: 정의는 간결하게, 컨트롤러로 위임
- [ ] **컨트롤러(Controller)**: BaseController를 상속
- [ ] **서비스(Service)**: DI를 사용하는 비즈니스 로직
- [ ] **리포지토리(Repository)**: DB 접근(복잡할 때)
- [ ] **검증(Validation)**: Zod 스키마
- [ ] **Sentry**: 에러 트래킹
- [ ] **테스트(Tests)**: 유닛 + 통합 테스트
- [ ] **설정(Config)**: unifiedConfig 사용

### 새 마이크로서비스 체크리스트

- [ ] 디렉터리 구조([architecture-overview.md](architecture-overview.md) 참고)
- [ ] Sentry용 instrument.ts
- [ ] unifiedConfig 설정
- [ ] BaseController 클래스
- [ ] 미들웨어 스택
- [ ] 에러 바운더리(error boundary)
- [ ] 테스트 프레임워크

---

## 아키텍처 개요

### 레이어드 아키텍처

```
HTTP 요청
    ↓
라우트(라우팅만)
    ↓
컨트롤러(요청 처리)
    ↓
서비스(비즈니스 로직)
    ↓
리포지토리(데이터 접근)
    ↓
데이터베이스(Prisma)
```

**핵심 원칙:** 각 레이어는 책임이 하나(ONE)입니다.

자세한 내용은 [architecture-overview.md](architecture-overview.md)를 참고하세요.

---

## 디렉터리 구조

```
service/src/
├── config/              # UnifiedConfig
├── controllers/         # 요청 핸들러
├── services/            # 비즈니스 로직
├── repositories/        # 데이터 접근
├── routes/              # 라우트 정의
├── middleware/          # Express 미들웨어
├── types/               # TypeScript 타입
├── validators/          # Zod 스키마
├── utils/               # 유틸리티
├── tests/               # 테스트
├── instrument.ts        # Sentry (가장 먼저 import)
├── app.ts               # Express 설정
└── server.ts            # HTTP 서버
```

**네이밍 규칙:**
- 컨트롤러: `PascalCase` - `UserController.ts`
- 서비스: `camelCase` - `userService.ts`
- 라우트: `camelCase + Routes` - `userRoutes.ts`
- 리포지토리: `PascalCase + Repository` - `UserRepository.ts`

---

## 핵심 원칙(7가지 규칙)

### 1. 라우트는 라우팅만, 컨트롤러는 제어를 담당

```typescript
// ❌ 절대 금지: 라우트에 비즈니스 로직 작성
router.post('/submit', async (req, res) => {
    // 200줄짜리 로직
});

// ✅ 항상: 컨트롤러로 위임
router.post('/submit', (req, res) => controller.submit(req, res));
```

### 2. 모든 컨트롤러는 BaseController를 상속

```typescript
export class UserController extends BaseController {
    async getUser(req: Request, res: Response): Promise<void> {
        try {
            const user = await this.userService.findById(req.params.id);
            this.handleSuccess(res, user);
        } catch (error) {
            this.handleError(error, res, 'getUser');
        }
    }
}
```

### 3. 모든 에러는 Sentry로

```typescript
try {
    await operation();
} catch (error) {
    Sentry.captureException(error);
    throw error;
}
```

### 4. unifiedConfig 사용, process.env 직접 사용 금지

```typescript
// ❌ 절대 금지
const timeout = process.env.TIMEOUT_MS;

// ✅ 항상
import { config } from './config/unifiedConfig';
const timeout = config.timeouts.default;
```

### 5. 모든 입력은 Zod로 검증

```typescript
const schema = z.object({ email: z.string().email() });
const validated = schema.parse(req.body);
```

### 6. 데이터 접근에는 리포지토리 패턴 사용

```typescript
// 서비스 → 리포지토리 → DB
const users = await userRepository.findActive();
```

### 7. 포괄적인 테스트 필수

```typescript
describe('UserService', () => {
    it('사용자를 생성해야 한다', async () => {
        expect(user).toBeDefined();
    });
});
```

---

## 자주 쓰는 import

```typescript
// Express
import express, { Request, Response, NextFunction, Router } from 'express';

// 검증
import { z } from 'zod';

// 데이터베이스
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

// Sentry
import * as Sentry from '@sentry/node';

// 설정
import { config } from './config/unifiedConfig';

// 미들웨어
import { SSOMiddlewareClient } from './middleware/SSOMiddleware';
import { asyncErrorWrapper } from './middleware/errorBoundary';
```

---

## 빠른 참조

### HTTP 상태 코드

| 코드 | 사용 사례 |
|------|----------|
| 200 | 성공 |
| 201 | 생성됨 |
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 찾을 수 없음 |
| 500 | 서버 오류 |

### 서비스 템플릿

**Blog API** (✅ 성숙) - REST API 템플릿으로 사용
**Auth Service** (✅ 성숙) - 인증 패턴 템플릿으로 사용

---

## 피해야 할 안티패턴

❌ 라우트에 비즈니스 로직 작성
❌ process.env 직접 사용
❌ 에러 처리 누락
❌ 입력 검증 없음
❌ 어디서나 Prisma 직접 호출
❌ console.log 대신 Sentry 미사용

---

## 탐색 가이드

| 필요하다면... | 이 문서를 읽으세요 |
|------------|-----------|
| 아키텍처 이해 | [architecture-overview.md](architecture-overview.md) |
| 라우트/컨트롤러 만들기 | [routing-and-controllers.md](routing-and-controllers.md) |
| 비즈니스 로직 구성 | [services-and-repositories.md](services-and-repositories.md) |
| 입력 검증 | [validation-patterns.md](validation-patterns.md) |
| 에러 트래킹 추가 | [sentry-and-monitoring.md](sentry-and-monitoring.md) |
| 미들웨어 만들기 | [middleware-guide.md](middleware-guide.md) |
| DB 접근 | [database-patterns.md](database-patterns.md) |
| 설정 관리 | [configuration.md](configuration.md) |
| 비동기/에러 처리 | [async-and-errors.md](async-and-errors.md) |
| 테스트 작성 | [testing-guide.md](testing-guide.md) |
| 예제 보기 | [complete-examples.md](complete-examples.md) |

---

## 리소스 파일

### [architecture-overview.md](architecture-overview.md)
레이어드 아키텍처, 요청 라이프사이클, 관심사 분리

### [routing-and-controllers.md](routing-and-controllers.md)
라우트 정의, BaseController, 에러 처리, 예제

### [services-and-repositories.md](services-and-repositories.md)
서비스 패턴, DI, 리포지토리 패턴, 캐싱

### [validation-patterns.md](validation-patterns.md)
Zod 스키마, 검증, DTO 패턴

### [sentry-and-monitoring.md](sentry-and-monitoring.md)
Sentry 초기화, 에러 캡처, 성능 모니터링

### [middleware-guide.md](middleware-guide.md)
인증, 감사(audit), 에러 바운더리, AsyncLocalStorage

### [database-patterns.md](database-patterns.md)
PrismaService, 리포지토리, 트랜잭션, 최적화

### [configuration.md](configuration.md)
UnifiedConfig, 환경별 설정, 시크릿(secrets)

### [async-and-errors.md](async-and-errors.md)
비동기 패턴, 커스텀 에러, asyncErrorWrapper

### [testing-guide.md](testing-guide.md)
유닛/통합 테스트, mocking, 커버리지

### [complete-examples.md](complete-examples.md)
전체 예제, 리팩터링 가이드

---

## 관련 스킬

- **database-verification** - 컬럼명 및 스키마 일관성 검증
- **error-tracking** - Sentry 통합 패턴
- **skill-developer** - 스킬 생성/관리를 위한 메타 스킬

---

**스킬 상태**: COMPLETE ✅
**라인 수**: < 500 ✅
**점진적 공개(Progressive Disclosure)**: 리소스 파일 11개 ✅

