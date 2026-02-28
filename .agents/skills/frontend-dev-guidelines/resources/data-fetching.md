# 데이터 페칭 패턴

Suspense 경계, 캐시 우선(cache-first) 전략, 중앙화된 API 서비스를 활용하는 TanStack Query 기반의 현대적 데이터 페칭 가이드입니다.

---

## 기본(Primary) 패턴: useSuspenseQuery

### 왜 useSuspenseQuery인가?

**새로 만드는 모든 컴포넌트**에서는 일반 `useQuery` 대신 `useSuspenseQuery`를 사용하세요:

**장점:**
- `isLoading` 체크가 필요 없음
- Suspense 경계(boundary)와 자연스럽게 통합
- 컴포넌트 코드가 더 깔끔해짐
- 일관된 로딩 UX
- 에러 바운더리로 더 나은 에러 처리

### 기본 패턴

```typescript
import { useSuspenseQuery } from '@tanstack/react-query';
import { myFeatureApi } from '../api/myFeatureApi';

export const MyComponent: React.FC<Props> = ({ id }) => {
    // No isLoading - Suspense handles it!
    const { data } = useSuspenseQuery({
        queryKey: ['myEntity', id],
        queryFn: () => myFeatureApi.getEntity(id),
    });

    // data is ALWAYS defined here (not undefined | Data)
    return <div>{data.name}</div>;
};

// Wrap in Suspense boundary
<SuspenseLoader>
    <MyComponent id={123} />
</SuspenseLoader>
```

### useSuspenseQuery vs useQuery

| 항목 | useSuspenseQuery | useQuery |
|---------|------------------|----------|
| 로딩 상태 | Suspense가 처리 | `isLoading` 수동 체크 |
| 데이터 타입 | 항상 정의됨 | `Data \| undefined` |
| 함께 쓰는 방식 | Suspense 경계 | 전통적인 컴포넌트 |
| 권장 대상 | **새 컴포넌트** | 레거시 코드만 |
| 에러 처리 | 에러 바운더리 | 수동 에러 상태 |

**일반 useQuery를 써야 하는 경우:**
- 레거시 코드를 유지보수할 때
- Suspense 없이도 충분히 단순한 경우
- 백그라운드 폴링 업데이트가 필요한 경우

**새 컴포넌트에서는: 항상 useSuspenseQuery를 우선하세요**

---

## 캐시 우선(Cache-First) 전략

### 캐시 우선 패턴 예시

**스마트 캐싱**은 API를 호출하기 전에 React Query 캐시를 먼저 확인하여 호출 횟수를 줄입니다:

```typescript
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { postApi } from '../api/postApi';

export function useSuspensePost(postId: number) {
    const queryClient = useQueryClient();

    return useSuspenseQuery({
        queryKey: ['post', postId],
        queryFn: async () => {
            // Strategy 1: Try to get from list cache first
            const cachedListData = queryClient.getQueryData<{ posts: Post[] }>([
                'posts',
                'list'
            ]);

            if (cachedListData?.posts) {
                const cachedPost = cachedListData.posts.find(
                    (post) => post.id === postId
                );

                if (cachedPost) {
                    return cachedPost;  // Return from cache!
                }
            }

            // Strategy 2: Not in cache, fetch from API
            return postApi.getPost(postId);
        },
        staleTime: 5 * 60 * 1000,      // Consider fresh for 5 minutes
        gcTime: 10 * 60 * 1000,         // Keep in cache for 10 minutes
        refetchOnWindowFocus: false,    // Don't refetch on focus
    });
}
```

**핵심 포인트:**
- API 호출 전에 그리드/리스트 캐시를 먼저 확인
- 중복 요청 방지
- `staleTime`: 데이터를 신선(fresh)하다고 간주하는 시간
- `gcTime`: 사용되지 않는 데이터가 캐시에 유지되는 시간
- `refetchOnWindowFocus: false`: 사용자 경험(포커스 시 재요청 방지)

---

## 병렬 데이터 페칭

### useSuspenseQueries

서로 독립적인 리소스를 여러 개 가져올 때:

```typescript
import { useSuspenseQueries } from '@tanstack/react-query';

export const MyComponent: React.FC = () => {
    const [userQuery, settingsQuery, preferencesQuery] = useSuspenseQueries({
        queries: [
            {
                queryKey: ['user'],
                queryFn: () => userApi.getCurrentUser(),
            },
            {
                queryKey: ['settings'],
                queryFn: () => settingsApi.getSettings(),
            },
            {
                queryKey: ['preferences'],
                queryFn: () => preferencesApi.getPreferences(),
            },
        ],
    });

    // All data available, Suspense handles loading
    const user = userQuery.data;
    const settings = settingsQuery.data;
    const preferences = preferencesQuery.data;

    return <Display user={user} settings={settings} prefs={preferences} />;
};
```

**장점:**
- 모든 쿼리를 병렬 실행
- 단일 Suspense 경계로 로딩 처리
- 타입 안전한 결과

---

## Query Key 구성

### 네이밍 컨벤션

```typescript
// Entity list
['entities', blogId]
['entities', blogId, 'summary']    // With view mode
['entities', blogId, 'flat']

// Single entity
['entity', blogId, entityId]

// Related data
['entity', entityId, 'history']
['entity', entityId, 'comments']

// User-specific
['user', userId, 'profile']
['user', userId, 'permissions']
```

**규칙:**
- 엔티티 이름으로 시작(리스트는 복수, 단건은 단수)
- 구체화를 위해 ID를 포함
- 뷰 모드/관계는 끝에 추가
- 앱 전반에서 일관성 유지

### Query Key 예시

```typescript
// From useSuspensePost.ts
queryKey: ['post', blogId, postId]
queryKey: ['posts-v2', blogId, 'summary']

// 무효화(invalidation) 패턴
queryClient.invalidateQueries({ queryKey: ['post', blogId] });  // All posts for form
queryClient.invalidateQueries({ queryKey: ['post'] });          // All posts
```

---

## API 서비스 레이어 패턴

### 파일 구조

기능(feature)별로 중앙화된 API 서비스를 만드세요:

```
features/
  my-feature/
    api/
      myFeatureApi.ts    # Service layer
```

### 서비스 패턴(postApi.ts 예시)

```typescript
/**
 * Centralized API service for my-feature operations
 * Uses apiClient for consistent error handling
 */
import apiClient from '@/lib/apiClient';
import type { MyEntity, UpdatePayload } from '../types';

export const myFeatureApi = {
    /**
     * Fetch a single entity
     */
    getEntity: async (blogId: number, entityId: number): Promise<MyEntity> => {
        const { data } = await apiClient.get(
            `/blog/entities/${blogId}/${entityId}`
        );
        return data;
    },

    /**
     * Fetch all entities for a form
     */
    getEntities: async (blogId: number, view: 'summary' | 'flat'): Promise<MyEntity[]> => {
        const { data } = await apiClient.get(
            `/blog/entities/${blogId}`,
            { params: { view } }
        );
        return data.rows;
    },

    /**
     * Update entity
     */
    updateEntity: async (
        blogId: number,
        entityId: number,
        payload: UpdatePayload
    ): Promise<MyEntity> => {
        const { data } = await apiClient.put(
            `/blog/entities/${blogId}/${entityId}`,
            payload
        );
        return data;
    },

    /**
     * Delete entity
     */
    deleteEntity: async (blogId: number, entityId: number): Promise<void> => {
        await apiClient.delete(`/blog/entities/${blogId}/${entityId}`);
    },
};
```

**핵심 포인트:**
- 메서드를 담은 단일 객체를 export
- `apiClient` 사용(`@/lib/apiClient`의 axios 인스턴스)
- 파라미터/반환 타입 안전성
- 각 메서드에 JSDoc 주석
- 중앙화된 에러 처리(apiClient가 처리)

---

## 라우트 포맷 규칙(중요)

### 올바른 포맷

```typescript
// ✅ CORRECT - Direct service path
await apiClient.get('/blog/posts/123');
await apiClient.post('/projects/create', data);
await apiClient.put('/users/update/456', updates);
await apiClient.get('/email/templates');

// ❌ WRONG - Do NOT add /api/ prefix
await apiClient.get('/api/blog/posts/123');  // WRONG!
await apiClient.post('/api/projects/create', data); // WRONG!
```

**마이크로서비스 라우팅:**
- Form service: `/blog/*`
- Projects service: `/projects/*`
- Email service: `/email/*`
- Users service: `/users/*`

**이유:** API 라우팅은 프록시 설정이 처리하므로 `/api/` 접두사가 필요 없습니다.

---

## Mutations

### 기본 Mutation 패턴

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { myFeatureApi } from '../api/myFeatureApi';
import { useMuiSnackbar } from '@/hooks/useMuiSnackbar';

export const MyComponent: React.FC = () => {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useMuiSnackbar();

    const updateMutation = useMutation({
        mutationFn: (payload: UpdatePayload) =>
            myFeatureApi.updateEntity(blogId, entityId, payload),

        onSuccess: () => {
            // 무효화 후 재조회(refetch)
            queryClient.invalidateQueries({
                queryKey: ['entity', blogId, entityId]
            });
            showSuccess('Entity updated successfully');
        },

        onError: (error) => {
            showError('Failed to update entity');
            console.error('Update error:', error);
        },
    });

    const handleUpdate = () => {
        updateMutation.mutate({ name: 'New Name' });
    };

    return (
        <Button
            onClick={handleUpdate}
            disabled={updateMutation.isPending}
        >
            {updateMutation.isPending ? 'Updating...' : 'Update'}
        </Button>
    );
};
```

### 낙관적 업데이트(Optimistic Updates)

```typescript
const updateMutation = useMutation({
    mutationFn: (payload) => myFeatureApi.update(id, payload),

    // Optimistic update
    onMutate: async (newData) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: ['entity', id] });

        // Snapshot current value
        const previousData = queryClient.getQueryData(['entity', id]);

        // Optimistically update
        queryClient.setQueryData(['entity', id], (old) => ({
            ...old,
            ...newData,
        }));

        // Return rollback function
        return { previousData };
    },

    // Rollback on error
    onError: (err, newData, context) => {
        queryClient.setQueryData(['entity', id], context.previousData);
        showError('Update failed');
    },

    // Refetch after success or error
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['entity', id] });
    },
});
```

---

## 고급 Query 패턴

### 프리패칭(Prefetching)

```typescript
export function usePrefetchEntity() {
    const queryClient = useQueryClient();

    return (blogId: number, entityId: number) => {
        return queryClient.prefetchQuery({
            queryKey: ['entity', blogId, entityId],
            queryFn: () => myFeatureApi.getEntity(blogId, entityId),
            staleTime: 5 * 60 * 1000,
        });
    };
}

// 사용 예시: hover 시 프리패칭
<div onMouseEnter={() => prefetch(blogId, id)}>
    <Link to={`/entity/${id}`}>View</Link>
</div>
```

### 페칭 없이 캐시 접근

```typescript
export function useEntityFromCache(blogId: number, entityId: number) {
    const queryClient = useQueryClient();

    // Get from cache, don't fetch if missing
    const directCache = queryClient.getQueryData<MyEntity>(['entity', blogId, entityId]);

    if (directCache) return directCache;

    // Try grid cache
    const gridCache = queryClient.getQueryData<{ rows: MyEntity[] }>(['entities-v2', blogId]);

    return gridCache?.rows.find(row => row.id === entityId);
}
```

### 의존 쿼리(Dependent Queries)

```typescript
// Fetch user first, then user's settings
const { data: user } = useSuspenseQuery({
    queryKey: ['user', userId],
    queryFn: () => userApi.getUser(userId),
});

const { data: settings } = useSuspenseQuery({
    queryKey: ['user', userId, 'settings'],
    queryFn: () => settingsApi.getUserSettings(user.id),
    // Automatically waits for user to load due to Suspense
});
```

---

## API 클라이언트 설정

### apiClient 사용

```typescript
import apiClient from '@/lib/apiClient';

// apiClient is a configured axios instance
// Automatically includes:
// - Base URL configuration
// - Cookie-based authentication
// - Error interceptors
// - Response transformers
```

**새 axios 인스턴스를 만들지 마세요** - 일관성을 위해 apiClient를 사용하세요.

---

## 쿼리 에러 처리

### onError 콜백

```typescript
import { useMuiSnackbar } from '@/hooks/useMuiSnackbar';

const { showError } = useMuiSnackbar();

const { data } = useSuspenseQuery({
    queryKey: ['entity', id],
    queryFn: () => myFeatureApi.getEntity(id),

    // Handle errors
    onError: (error) => {
        showError('Failed to load entity');
        console.error('Load error:', error);
    },
});
```

### 에러 바운더리(Error Boundaries)

에러 바운더리와 함께 사용하면 더 포괄적인 에러 처리가 가능합니다:

```typescript
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary
    fallback={<ErrorDisplay />}
    onError={(error) => console.error(error)}
>
    <SuspenseLoader>
        <ComponentWithSuspenseQuery />
    </SuspenseLoader>
</ErrorBoundary>
```

---

## 완성 예제

### 예제 1: 단순 엔티티 페칭

```typescript
import React from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { userApi } from '../api/userApi';

interface UserProfileProps {
    userId: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
    const { data: user } = useSuspenseQuery({
        queryKey: ['user', userId],
        queryFn: () => userApi.getUser(userId),
        staleTime: 5 * 60 * 1000,
    });

    return (
        <Box>
            <Typography variant='h5'>{user.name}</Typography>
            <Typography>{user.email}</Typography>
        </Box>
    );
};

// Suspense와 함께 사용
<SuspenseLoader>
    <UserProfile userId='123' />
</SuspenseLoader>
```

### 예제 2: 캐시 우선 전략

```typescript
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { postApi } from '../api/postApi';
import type { Post } from '../types';

/**
 * Hook with cache-first strategy
 * Checks grid cache before API call
 */
export function useSuspensePost(blogId: number, postId: number) {
    const queryClient = useQueryClient();

    return useSuspenseQuery<Post, Error>({
        queryKey: ['post', blogId, postId],
        queryFn: async () => {
            // 1. Check grid cache first
            const gridCache = queryClient.getQueryData<{ rows: Post[] }>([
                'posts-v2',
                blogId,
                'summary'
            ]) || queryClient.getQueryData<{ rows: Post[] }>([
                'posts-v2',
                blogId,
                'flat'
            ]);

            if (gridCache?.rows) {
                const cached = gridCache.rows.find(row => row.S_ID === postId);
                if (cached) {
                    return cached;  // Reuse grid data
                }
            }

            // 2. Not in cache, fetch directly
            return postApi.getPost(blogId, postId);
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}
```

**장점:**
- 중복 API 호출 방지
- 이미 로드된 경우 즉시 데이터 사용
- 캐시에 없으면 API로 폴백

### 예제 3: 병렬 페칭

```typescript
import { useSuspenseQueries } from '@tanstack/react-query';

export const Dashboard: React.FC = () => {
    const [statsQuery, projectsQuery, notificationsQuery] = useSuspenseQueries({
        queries: [
            {
                queryKey: ['stats'],
                queryFn: () => statsApi.getStats(),
            },
            {
                queryKey: ['projects', 'active'],
                queryFn: () => projectsApi.getActiveProjects(),
            },
            {
                queryKey: ['notifications', 'unread'],
                queryFn: () => notificationsApi.getUnread(),
            },
        ],
    });

    return (
        <Box>
            <StatsCard data={statsQuery.data} />
            <ProjectsList projects={projectsQuery.data} />
            <Notifications items={notificationsQuery.data} />
        </Box>
    );
};
```

---

## 캐시 무효화를 포함한 Mutations

### 업데이트 Mutation

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postApi } from '../api/postApi';
import { useMuiSnackbar } from '@/hooks/useMuiSnackbar';

export const useUpdatePost = () => {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useMuiSnackbar();

    return useMutation({
        mutationFn: ({ blogId, postId, data }: UpdateParams) =>
            postApi.updatePost(blogId, postId, data),

        onSuccess: (data, variables) => {
            // Invalidate specific post
            queryClient.invalidateQueries({
                queryKey: ['post', variables.blogId, variables.postId]
            });

            // Invalidate list to refresh grid
            queryClient.invalidateQueries({
                queryKey: ['posts-v2', variables.blogId]
            });

            showSuccess('Post updated');
        },

        onError: (error) => {
            showError('Failed to update post');
            console.error('Update error:', error);
        },
    });
};

// Usage
const updatePost = useUpdatePost();

const handleSave = () => {
    updatePost.mutate({
        blogId: 123,
        postId: 456,
        data: { responses: { '101': 'value' } }
    });
};
```

### 삭제 Mutation

```typescript
export const useDeletePost = () => {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useMuiSnackbar();

    return useMutation({
        mutationFn: ({ blogId, postId }: DeleteParams) =>
            postApi.deletePost(blogId, postId),

        onSuccess: (data, variables) => {
            // Remove from cache manually (optimistic)
            queryClient.setQueryData<{ rows: Post[] }>(
                ['posts-v2', variables.blogId],
                (old) => ({
                    ...old,
                    rows: old?.rows.filter(row => row.S_ID !== variables.postId) || []
                })
            );

            showSuccess('Post deleted');
        },

        onError: (error, variables) => {
            // Rollback - refetch to get accurate state
            queryClient.invalidateQueries({
                queryKey: ['posts-v2', variables.blogId]
            });
            showError('Failed to delete post');
        },
    });
};
```

---

## Query 설정 모범 사례

### 기본 설정

```typescript
// In QueryClientProvider setup
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,        // 5 minutes
            gcTime: 1000 * 60 * 10,           // 10 minutes (was cacheTime)
            refetchOnWindowFocus: false,       // Don't refetch on focus
            refetchOnMount: false,             // Don't refetch on mount if fresh
            retry: 1,                          // Retry failed queries once
        },
    },
});
```

### 쿼리별 오버라이드

```typescript
// Frequently changing data - shorter staleTime
useSuspenseQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationApi.getUnread(),
    staleTime: 30 * 1000,  // 30 seconds
});

// Rarely changing data - longer staleTime
useSuspenseQuery({
    queryKey: ['form', blogId, 'structure'],
    queryFn: () => formApi.getStructure(blogId),
    staleTime: 30 * 60 * 1000,  // 30 minutes
});
```

---

## 요약

**현대적 데이터 페칭 레시피:**

1. **Create API Service**: `features/X/api/XApi.ts` using apiClient
2. **Use useSuspenseQuery**: In components wrapped by SuspenseLoader
3. **Cache-First**: Check grid cache before API call
4. **Query Keys**: Consistent naming ['entity', id]
5. **Route Format**: `/blog/route` NOT `/api/blog/route`
6. **Mutations**: invalidateQueries after success
7. **Error Handling**: onError + useMuiSnackbar
8. **Type Safety**: Type all parameters and returns

**함께 보기:**
- [component-patterns.md](component-patterns.md) - Suspense integration
- [loading-and-error-states.md](loading-and-error-states.md) - SuspenseLoader usage
- [complete-examples.md](complete-examples.md) - Full working examples
