# 라우팅 가이드

폴더 기반 라우팅과 지연 로딩 패턴을 사용하는 TanStack Router 구현 가이드입니다.

---

## TanStack Router 개요

파일 기반 라우팅을 사용하는 **TanStack Router**:
- 폴더 구조로 라우트를 정의
- 코드 스플리팅을 위한 지연 로딩
- 타입 안전한 라우팅
- breadcrumb loader

---

## 폴더 기반 라우팅

### 디렉터리 구조

```
routes/
  __root.tsx                    # Root layout
  index.tsx                     # Home route (/)
  posts/
    index.tsx                   # /posts
    create/
      index.tsx                 # /posts/create
    $postId.tsx                 # /posts/:postId (dynamic)
  comments/
    index.tsx                   # /comments
```

**패턴**:
- `index.tsx` = 해당 경로의 라우트
- `$param.tsx` = 동적 파라미터
- 중첩 폴더 = 중첩 라우트

---

## 기본 라우트 패턴

### posts/index.tsx 예시

```typescript
/**
 * Posts route component
 * Displays the main blog posts list
 */

import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

// Lazy load the page component
const PostsList = lazy(() =>
    import('@/features/posts/components/PostsList').then(
        (module) => ({ default: module.PostsList }),
    ),
);

export const Route = createFileRoute('/posts/')({
    component: PostsPage,
    // Define breadcrumb data
    loader: () => ({
        crumb: 'Posts',
    }),
});

function PostsPage() {
    return (
        <PostsList
            title='All Posts'
            showFilters={true}
        />
    );
}

export default PostsPage;
```

**핵심 포인트:**
- 무거운 컴포넌트는 지연 로딩
- 라우트 경로와 함께 `createFileRoute` 사용
- breadcrumb 데이터는 `loader`에서 제공
- 페이지 컴포넌트가 콘텐츠를 렌더링
- Route와 컴포넌트를 모두 export

---

## 라우트 지연 로딩

### Named export 패턴

```typescript
import { lazy } from 'react';

// For named exports, use .then() to map to default
const MyPage = lazy(() =>
    import('@/features/my-feature/components/MyPage').then(
        (module) => ({ default: module.MyPage })
    )
);
```

### Default export 패턴

```typescript
import { lazy } from 'react';

// For default exports, simpler syntax
const MyPage = lazy(() => import('@/features/my-feature/components/MyPage'));
```

### 라우트를 지연 로딩하는 이유

- 코드 스플리팅 - 초기 번들 크기 감소
- 초기 페이지 로드 속도 향상
- 해당 라우트로 이동할 때만 코드 로드
- 전반적인 성능 향상

---

## createFileRoute

### 기본 설정

```typescript
export const Route = createFileRoute('/my-route/')({
    component: MyRoutePage,
});

function MyRoutePage() {
    return <div>My Route Content</div>;
}
```

### Breadcrumb loader 포함

```typescript
export const Route = createFileRoute('/my-route/')({
    component: MyRoutePage,
    loader: () => ({
        crumb: 'My Route Title',
    }),
});
```

breadcrumb는 내비게이션/앱 바에 자동으로 표시됩니다.

### 데이터 loader 포함

```typescript
export const Route = createFileRoute('/my-route/')({
    component: MyRoutePage,
    loader: async () => {
        // Can prefetch data here
        const data = await api.getData();
        return { crumb: 'My Route', data };
    },
});
```

### Search Params 포함

```typescript
export const Route = createFileRoute('/search/')({
    component: SearchPage,
    validateSearch: (search: Record<string, unknown>) => {
        return {
            query: (search.query as string) || '',
            page: Number(search.page) || 1,
        };
    },
});

function SearchPage() {
    const { query, page } = Route.useSearch();
    // Use query and page
}
```

---

## 동적 라우트

### 파라미터 라우트

```typescript
// routes/users/$userId.tsx

export const Route = createFileRoute('/users/$userId')({
    component: UserPage,
});

function UserPage() {
    const { userId } = Route.useParams();

    return <UserProfile userId={userId} />;
}
```

### 다중 파라미터

```typescript
// routes/posts/$postId/comments/$commentId.tsx

export const Route = createFileRoute('/posts/$postId/comments/$commentId')({
    component: CommentPage,
});

function CommentPage() {
    const { postId, commentId } = Route.useParams();

    return <CommentEditor postId={postId} commentId={commentId} />;
}
```

---

## 내비게이션

### 프로그래밍 방식 내비게이션

```typescript
import { useNavigate } from '@tanstack/react-router';

export const MyComponent: React.FC = () => {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate({ to: '/posts' });
    };

    return <Button onClick={handleClick}>View Posts</Button>;
};
```

### 파라미터 포함

```typescript
const handleNavigate = () => {
    navigate({
        to: '/users/$userId',
        params: { userId: '123' },
    });
};
```

### Search Params 포함

```typescript
const handleSearch = () => {
    navigate({
        to: '/search',
        search: { query: 'test', page: 1 },
    });
};
```

---

## 라우트 레이아웃 패턴

### 루트 레이아웃(__root.tsx)

```typescript
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Box } from '@mui/material';
import { CustomAppBar } from '~components/CustomAppBar';

export const Route = createRootRoute({
    component: RootLayout,
});

function RootLayout() {
    return (
        <Box>
            <CustomAppBar />
            <Box sx={{ p: 2 }}>
                <Outlet />  {/* Child routes render here */}
            </Box>
        </Box>
    );
}
```

### 중첩 레이아웃

```typescript
// routes/dashboard/index.tsx
export const Route = createFileRoute('/dashboard/')({
    component: DashboardLayout,
});

function DashboardLayout() {
    return (
        <Box>
            <DashboardSidebar />
            <Box sx={{ flex: 1 }}>
                <Outlet />  {/* Nested routes */}
            </Box>
        </Box>
    );
}
```

---

## 완성 라우트 예제

```typescript
/**
 * User profile route
 * Path: /users/:userId
 */

import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { SuspenseLoader } from '~components/SuspenseLoader';

// Lazy load heavy component
const UserProfile = lazy(() =>
    import('@/features/users/components/UserProfile').then(
        (module) => ({ default: module.UserProfile })
    )
);

export const Route = createFileRoute('/users/$userId')({
    component: UserPage,
    loader: () => ({
        crumb: 'User Profile',
    }),
});

function UserPage() {
    const { userId } = Route.useParams();

    return (
        <SuspenseLoader>
            <UserProfile userId={userId} />
        </SuspenseLoader>
    );
}

export default UserPage;
```

---

## 요약

**라우팅 체크리스트:**
- ✅ Folder-based: `routes/my-route/index.tsx`
- ✅ Lazy load components: `React.lazy(() => import())`
- ✅ Use `createFileRoute` with route path
- ✅ Add breadcrumb in `loader` function
- ✅ Wrap in `SuspenseLoader` for loading states
- ✅ Use `Route.useParams()` for dynamic params
- ✅ Use `useNavigate()` for programmatic navigation

**함께 보기:**
- [component-patterns.md](component-patterns.md) - Lazy loading patterns
- [loading-and-error-states.md](loading-and-error-states.md) - SuspenseLoader usage
- [complete-examples.md](complete-examples.md) - Full route examples
