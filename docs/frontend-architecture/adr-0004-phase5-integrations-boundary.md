# ADR-0004: Phase 5 integrations 계층 분리와 cross-feature 의존 제거

- Date: 2026-02-28
- Status: Accepted
- Owners: @codex
- Related:
  - `docs/frontend-architecture/refactor-blueprint.md`
  - `docs/frontend-architecture/refactor-roadmap.md`
  - `dev/active/frontend-architecture-refactor/frontend-architecture-refactor-plan.md`

## Context

Phase 4까지 완료한 시점에서 `mvp` feature는 UI 모듈 분리는 됐지만, 브라우저/외부 연동은 `features/p1/helpers`와 `features/p1/types`를 직접 참조하고 있었다.

- 현재 상태:
  - 알림/STT/동기화 mock 호출이 `mvp-dashboard.tsx`에서 `features/p1/*`를 직접 import
  - 일부 분리된 view 컴포넌트도 `p1` 타입에 의존
- 문제점:
  - `mvp`와 `p1` 간 cross-feature 결합이 남아 경계가 모호
  - 연동 정책 변경 시 영향 범위를 예측하기 어려움
- 제약:
  - 동작 동일성 유지
  - 기존 capability/permission/error 동작을 변경하지 않음
  - 회귀 게이트(`typecheck/lint/test:mvp/build/verify:mvp`) 통과

## Decision

notification/stt/sync 연동을 `features/mvp/integrations/*`로 분리하고, `mvp` 영역에서 `features/p1/*` 직접 import를 제거한다.

- 선택한 옵션:
  - `features/mvp/integrations/notification/notification-adapter.ts`
  - `features/mvp/integrations/stt/stt-adapter.ts`
  - `features/mvp/integrations/sync/sync-domain.ts`
  - `features/mvp/integrations/sync/sync-mock-adapter.ts`
  - `features/mvp/integrations/index.ts`
- 선택 근거:
  - Phase 5 목표(연동 계층 분리, UI 직접 API 접근 제거) 직접 충족
  - `mvp` feature 내부에서 연동 접근 경로를 단일화
  - 이후 Phase 6에서 리팩토링 범위를 `mvp` 내부로 제한 가능
- 적용 범위:
  - `mvp-dashboard.tsx`
  - `task-input/settings` view의 연동 타입 의존

## Alternatives Considered

1. `p1/helpers`를 그대로 유지하고 `mvp`에서 계속 재사용
  - 장점: 변경량 최소
  - 단점: feature 경계 불명확, Phase 5 목표 미충족
2. 연동 어댑터와 도메인 타입까지 별도 패키지로 분리
  - 장점: 재사용성/독립성 강화
  - 단점: 현재 단계 범위를 넘어 구조 변경 비용 증가

## Consequences

- 긍정적 효과:
  - `mvp`의 외부 연동 접근이 `integrations` 경계로 고정
  - `mvp` 내부 모듈이 `p1`에 직접 의존하지 않음
  - adapter 변경 영향 범위 축소
- 부정적 영향/기술 부채:
  - `p1`와 `mvp/integrations`에 유사 코드가 중복됨
  - 중장기적으로 공통 연동 레이어 통합 전략이 필요
- 후속 액션:
  - Phase 6에서 중복 정리 후보를 분류
  - 필요 시 공통 adapter 패키지화 여부를 ADR로 별도 결정

## Validation Plan

- 수동 시나리오:
  - 알림 권한 요청/알림 발송, STT 시작/중지, sync mock 성공/실패/충돌
- 자동 테스트:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:mvp`
  - `npm run build`
  - `npm run verify:mvp`
- 관찰 지표:
  - `features/mvp` 내 `@/features/p1` import 0건
  - 기존 MVP 게이트 통과
