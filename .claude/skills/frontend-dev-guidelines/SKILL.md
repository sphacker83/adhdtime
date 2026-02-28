---
name: frontend-dev-guidelines
description: React/TypeScript 애플리케이션을 위한 프론트엔드 개발 가이드라인입니다. Suspense, 지연 로딩(lazy loading), useSuspenseQuery, features 디렉터리를 활용한 파일 구성, MUI v7 스타일링, TanStack Router, 성능 최적화, TypeScript 모범 사례 등 현대적인 패턴을 다룹니다. 컴포넌트/페이지/기능(feature) 생성, 데이터 페칭, 스타일링, 라우팅 설정, 프론트엔드 코드 작업 시 사용하세요.
---

# 프론트엔드 개발 가이드라인

## 목적

Suspense 기반 데이터 페칭, 지연 로딩, 올바른 파일 구성, 성능 최적화를 강조하는 현대적 React 개발을 위한 포괄 가이드입니다.

## 이 스킬을 사용해야 하는 경우

- 새 컴포넌트 또는 페이지를 만들 때
- 새 기능(feature)을 만들 때
- TanStack Query로 데이터를 가져올 때
- TanStack Router로 라우팅을 설정할 때
- MUI v7로 컴포넌트를 스타일링할 때
- 성능 최적화를 할 때
- 프론트엔드 코드를 구성/정리할 때
- TypeScript 모범 사례를 적용할 때

---

## 빠른 시작

### 새 컴포넌트 체크리스트

컴포넌트를 만들고 있나요? 아래 체크리스트를 따르세요:

- [ ] TypeScript와 함께 `React.FC<Props>` 패턴 사용
- [ ] 무거운 컴포넌트면 지연 로딩: `React.lazy(() => import())`
- [ ] 로딩 상태는 `<SuspenseLoader>`로 감싸기
- [ ] 데이터 페칭은 `useSuspenseQuery` 사용
- [ ] import 별칭: `@/`, `~types`, `~components`, `~features`
- [ ] 스타일: 100줄 미만이면 인라인, 100줄 초과면 파일 분리
- [ ] 자식에 전달하는 이벤트 핸들러는 `useCallback` 사용
- [ ] 기본 export는 파일 하단에 두기
- [ ] 로딩 스피너로 조기 return(early return) 금지
- [ ] 사용자 알림은 `useMuiSnackbar` 사용

### 새 기능(Feature) 체크리스트

기능(feature)을 만들고 있나요? 아래 구조로 구성하세요:

- [ ] `features/{feature-name}/` 디렉터리 생성
- [ ] 하위 디렉터리 생성: `api/`, `components/`, `hooks/`, `helpers/`, `types/`
- [ ] API 서비스 파일 생성: `api/{feature}Api.ts`
- [ ] `types/`에 TypeScript 타입 설정
- [ ] `routes/{feature-name}/index.tsx`에 라우트 생성
- [ ] 기능 컴포넌트를 지연 로딩
- [ ] Suspense 경계(boundary) 사용
- [ ] 기능의 공개 API는 `index.ts`에서 export

---

## Import 별칭 빠른 참조

| 별칭 | 해석 경로 | 예시 |
|-------|-------------|---------|
| `@/` | `src/` | `import { apiClient } from '@/lib/apiClient'` |
| `~types` | `src/types` | `import type { User } from '~types/user'` |
| `~components` | `src/components` | `import { SuspenseLoader } from '~components/SuspenseLoader'` |
| `~features` | `src/features` | `import { authApi } from '~features/auth'` |

정의 위치: [vite.config.ts](../../vite.config.ts) 180-185줄

---

## 자주 쓰는 import 치트시트

```typescript
// React & 지연 로딩
import React, { useState, useCallback, useMemo } from 'react';
const Heavy = React.lazy(() => import('./Heavy'));

// MUI 컴포넌트
import { Box, Paper, Typography, Button, Grid } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

// TanStack Query (Suspense)
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';

// TanStack Router
import { createFileRoute } from '@tanstack/react-router';

// 프로젝트 컴포넌트
import { SuspenseLoader } from '~components/SuspenseLoader';

// 훅
import { useAuth } from '@/hooks/useAuth';
import { useMuiSnackbar } from '@/hooks/useMuiSnackbar';

// 타입
import type { Post } from '~types/post';
```

---

## 토픽 가이드

### 🎨 컴포넌트 패턴

**현대적인 React 컴포넌트는 다음을 사용합니다:**
- 타입 안정성을 위한 `React.FC<Props>`
- 코드 스플리팅을 위한 `React.lazy()`
- 로딩 상태를 위한 `SuspenseLoader`
- 기본 export 패턴(이름 있는 const + default export)

**핵심 개념:**
- 무거운 컴포넌트(DataGrid, 차트, 에디터)는 지연 로딩
- 지연 로딩 컴포넌트는 항상 Suspense로 감싸기
- fade 애니메이션이 있는 SuspenseLoader 컴포넌트 사용
- 컴포넌트 구조: Props → Hooks → Handlers → Render → Export

**[📖 전체 가이드: resources/component-patterns.md](resources/component-patterns.md)**

---

### 📊 데이터 페칭

**기본(Primary) 패턴: useSuspenseQuery**
- Suspense 경계(boundary)와 함께 사용
- 캐시 우선 전략(그리드 캐시를 API 호출 전에 확인)
- `isLoading` 체크를 대체
- 제네릭으로 타입 안정성 확보

**API 서비스 레이어:**
- `features/{feature}/api/{feature}Api.ts` 생성
- `apiClient` axios 인스턴스 사용
- 기능별 메서드를 한 곳에 중앙화
- 라우트 포맷: `/form/route` (NOT `/api/form/route`)

**[📖 전체 가이드: resources/data-fetching.md](resources/data-fetching.md)**

---

### 📁 파일 구성

**features/ vs components/:**
- `features/`: 도메인 중심(게시글, 댓글, 인증 등)
- `components/`: 정말로 재사용 가능한 것(SuspenseLoader, CustomAppBar)

**기능(Feature) 하위 디렉터리:**
```
features/
  my-feature/
    api/          # API 서비스 레이어
    components/   # 기능 컴포넌트
    hooks/        # 커스텀 훅
    helpers/      # 유틸리티 함수
    types/        # TypeScript 타입
```

**[📖 전체 가이드: resources/file-organization.md](resources/file-organization.md)**

---

### 🎨 스타일링

**인라인 vs 분리 파일:**
- 100줄 미만: 인라인 `const styles: Record<string, SxProps<Theme>>`
- 100줄 초과: `.styles.ts` 파일로 분리

**기본 방법(Primary Method):**
- MUI 컴포넌트는 `sx` prop 사용
- `SxProps<Theme>`로 타입 안정성 확보
- 테마 접근: `(theme) => theme.palette.primary.main`

**MUI v7 Grid:**
```typescript
<Grid size={{ xs: 12, md: 6 }}>  // ✅ v7 문법
<Grid xs={12} md={6}>             // ❌ 이전 문법
```

**[📖 전체 가이드: resources/styling-guide.md](resources/styling-guide.md)**

---

### 🛣️ 라우팅

**TanStack Router - 폴더 기반:**
- 디렉터리: `routes/my-route/index.tsx`
- 컴포넌트 지연 로딩
- `createFileRoute` 사용
- loader에 breadcrumb 데이터 포함

**예시:**
```typescript
import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const MyPage = lazy(() => import('@/features/my-feature/components/MyPage'));

export const Route = createFileRoute('/my-route/')({
    component: MyPage,
    loader: () => ({ crumb: 'My Route' }),
});
```

**[📖 전체 가이드: resources/routing-guide.md](resources/routing-guide.md)**

---

### ⏳ 로딩 & 에러 상태

**핵심 규칙: 조기 return 금지**

```typescript
// ❌ 절대 금지 - 레이아웃 시프트 유발
if (isLoading) {
    return <LoadingSpinner />;
}

// ✅ 항상 - 일관된 레이아웃
<SuspenseLoader>
    <Content />
</SuspenseLoader>
```

**이유:** Cumulative Layout Shift(CLS)를 방지하고 UX를 개선합니다.

**에러 처리:**
- 사용자 피드백은 `useMuiSnackbar` 사용
- `react-toastify` 절대 금지
- TanStack Query `onError` 콜백 사용

**[📖 전체 가이드: resources/loading-and-error-states.md](resources/loading-and-error-states.md)**

---

### ⚡ 성능

**최적화 패턴:**
- `useMemo`: 비용이 큰 계산(filter, sort, map)
- `useCallback`: 자식에 전달되는 이벤트 핸들러
- `React.memo`: 비용이 큰 컴포넌트
- 디바운스 검색(300-500ms)
- 메모리 누수 방지(useEffect cleanup)

**[📖 전체 가이드: resources/performance.md](resources/performance.md)**

---

### 📘 TypeScript

**표준(Standards):**
- strict mode, `any` 타입 금지
- 함수에 명시적 반환 타입
- 타입 import: `import type { User } from '~types/user'`
- JSDoc을 포함한 컴포넌트 props 인터페이스

**[📖 전체 가이드: resources/typescript-standards.md](resources/typescript-standards.md)**

---

### 🔧 공통 패턴

**다루는 토픽:**
- Zod 검증을 사용하는 React Hook Form
- DataGrid 래퍼 계약(contracts)
- Dialog 컴포넌트 표준
- 현재 사용자용 `useAuth` 훅
- 캐시 무효화를 포함한 mutation 패턴

**[📖 전체 가이드: resources/common-patterns.md](resources/common-patterns.md)**

---

### 📚 완성 예제

**완전히 동작하는 예제:**
- 모든 패턴을 포함한 현대적 컴포넌트
- 완전한 feature 구조
- API 서비스 레이어
- 지연 로딩이 있는 라우트
- Suspense + useSuspenseQuery
- 검증이 있는 폼

**[📖 전체 가이드: resources/complete-examples.md](resources/complete-examples.md)**

---

## 탐색 가이드

| 필요하다면... | 이 리소스를 읽으세요 |
|------------|-------------------|
| 컴포넌트 만들기 | [component-patterns.md](resources/component-patterns.md) |
| 데이터 가져오기 | [data-fetching.md](resources/data-fetching.md) |
| 파일/폴더 구성 | [file-organization.md](resources/file-organization.md) |
| 컴포넌트 스타일링 | [styling-guide.md](resources/styling-guide.md) |
| 라우팅 설정 | [routing-guide.md](resources/routing-guide.md) |
| 로딩/에러 처리 | [loading-and-error-states.md](resources/loading-and-error-states.md) |
| 성능 최적화 | [performance.md](resources/performance.md) |
| TypeScript 타입 | [typescript-standards.md](resources/typescript-standards.md) |
| 폼/인증/DataGrid | [common-patterns.md](resources/common-patterns.md) |
| 전체 예제 보기 | [complete-examples.md](resources/complete-examples.md) |

---

## 핵심 원칙

1. **무거운 것은 전부 지연 로딩**: 라우트, DataGrid, 차트, 에디터
2. **로딩은 Suspense로**: 조기 return이 아니라 SuspenseLoader 사용
3. **useSuspenseQuery**: 새 코드의 기본 데이터 페칭 패턴
4. **features는 구조적으로 구성**: api/, components/, hooks/, helpers/ 하위 디렉터리
5. **스타일은 크기에 따라**: 100줄 미만은 인라인, 100줄 초과는 분리
6. **import 별칭 사용**: @/, ~types, ~components, ~features
7. **조기 return 금지**: 레이아웃 시프트 방지
8. **useMuiSnackbar**: 모든 사용자 알림에 사용

---

## 빠른 참조: 파일 구조

```
src/
  features/
    my-feature/
      api/
        myFeatureApi.ts       # API 서비스
      components/
        MyFeature.tsx         # 메인 컴포넌트
        SubComponent.tsx      # 관련 컴포넌트
      hooks/
        useMyFeature.ts       # 커스텀 훅
        useSuspenseMyFeature.ts  # Suspense 훅
      helpers/
        myFeatureHelpers.ts   # 유틸리티
      types/
        index.ts              # TypeScript 타입
      index.ts                # 공개 export

  components/
    SuspenseLoader/
      SuspenseLoader.tsx      # 재사용 로더
    CustomAppBar/
      CustomAppBar.tsx        # 재사용 앱 바

  routes/
    my-route/
      index.tsx               # 라우트 컴포넌트
      create/
        index.tsx             # 중첩 라우트
```

---

## 현대적 컴포넌트 템플릿(빠른 복사)

```typescript
import React, { useState, useCallback } from 'react';
import { Box, Paper } from '@mui/material';
import { useSuspenseQuery } from '@tanstack/react-query';
import { featureApi } from '../api/featureApi';
import type { FeatureData } from '~types/feature';

interface MyComponentProps {
    id: number;
    onAction?: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ id, onAction }) => {
    const [state, setState] = useState<string>('');

    const { data } = useSuspenseQuery({
        queryKey: ['feature', id],
        queryFn: () => featureApi.getFeature(id),
    });

    const handleAction = useCallback(() => {
        setState('updated');
        onAction?.();
    }, [onAction]);

    return (
        <Box sx={{ p: 2 }}>
            <Paper sx={{ p: 3 }}>
                {/* 내용 */}
            </Paper>
        </Box>
    );
};

export default MyComponent;
```

전체 예제는 [resources/complete-examples.md](resources/complete-examples.md)를 참고하세요.

---

## 관련 스킬

- **error-tracking**: Sentry를 통한 에러 트래킹(프론트엔드에도 적용)
- **backend-dev-guidelines**: 프론트엔드가 소비하는 백엔드 API 패턴

---

**스킬 상태**: 컨텍스트 관리를 최적화하기 위한 점진적 로딩 기반의 모듈 구조

