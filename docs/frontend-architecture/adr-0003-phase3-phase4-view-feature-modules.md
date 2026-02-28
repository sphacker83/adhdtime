# ADR-0003: Phase 3~4 탭 뷰 분리와 기능 모듈 경계 도입

- Date: 2026-02-28
- Status: Accepted
- Owners: @codex
- Related:
  - `docs/frontend-architecture/refactor-blueprint.md`
  - `docs/frontend-architecture/refactor-roadmap.md`
  - `dev/active/frontend-architecture-refactor/frontend-architecture-refactor-plan.md`

## Context

Phase 2 이후에도 `mvp-dashboard.tsx`는 탭별 JSX와 기능 UI 조각(입력/타이머/복구)이 한 파일에 집중되어 있었다.

- 현재 상태:
  - 탭 렌더링(home/tasks/stats/settings)이 단일 컴포넌트에 내장
  - task-input/task-list/timer-runtime/recovery 기능 UI가 섞여 있음
- 문제점:
  - 탭별 수정 시 회귀 범위가 넓고 props 계약이 불명확
  - 기능별 재사용(UI 조합)이 어려움
- 제약:
  - 기존 이벤트/상태 전이 로직의 동작 동일성 유지
  - CSS module 클래스명과 UI 표현 유지
  - `typecheck/lint/test:mvp/build` 통과

## Decision

탭 뷰를 분리하고 기능 UI를 `task-input`, `task-list`, `timer-runtime`, `recovery` 모듈로 분해한다.

- 선택한 옵션:
  - `features/mvp/task-input/components/task-input-section.tsx`
  - `features/mvp/task-list/components/home-view.tsx`
  - `features/mvp/task-list/components/tasks-view.tsx`
  - `features/mvp/stats/components/stats-view.tsx`
  - `features/mvp/settings/components/settings-view.tsx`
  - `features/mvp/timer-runtime/components/chunk-primary-actions.tsx`
  - `features/mvp/timer-runtime/components/chunk-quick-adjust-actions.tsx`
  - `features/mvp/recovery/components/recovery-actions.tsx`
  - 각 feature 공개 API `index.ts`
- 선택 근거:
  - Phase 3 목표(탭/화면 분해)와 Phase 4 목표(기능 모듈 분해)를 한 번에 충족
  - shell(`mvp-dashboard.tsx`)은 상태/핸들러 오케스트레이션 책임에 집중
  - 기능 UI 조각을 feature 경계 안에서 재사용 가능
- 적용 범위:
  - 탭 렌더링 영역
  - 입력/실행/복구 UI 조합 영역

## Alternatives Considered

1. 탭 뷰만 분리하고 기능 모듈 분해는 미룸
  - 장점: 단계 분리가 명확
  - 단점: 동일 UI 조각 중복 유지, Phase 4에서 재작업 필요
2. 도메인 핸들러까지 즉시 모듈로 이전
  - 장점: 장기 구조로 빠르게 수렴
  - 단점: 이번 단계에서 동작 회귀 리스크 급증

## Consequences

- 긍정적 효과:
  - 탭/기능 단위 파일 경계가 명확해짐
  - `mvp-dashboard.tsx` 라인 수 감소(2,541 -> 2,078)
  - feature 공개 API 경유 참조 구조 확보
- 부정적 영향/기술 부채:
  - props 전달량이 아직 많아, Phase 5~6에서 추가 정리가 필요
  - 일부 도메인 핸들러는 여전히 shell에 위치
- 후속 액션:
  - Phase 5에서 browser/external 연동을 `integrations` 계층으로 이관
  - Phase 6에서 props 조합/중복 selector를 정리

## Validation Plan

- 수동 시나리오:
  - 입력 -> 청킹 -> 시작/일시정지/완료 -> 복구(재청킹/재스케줄) -> 설정 변경
- 자동 테스트:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:mvp`
  - `npm run build`
- 관찰 지표:
  - `mvp-dashboard.tsx` line count 감소
  - 기존 MVP 테스트 및 빌드 게이트 통과
