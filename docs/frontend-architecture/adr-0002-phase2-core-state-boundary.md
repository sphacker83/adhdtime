# ADR-0002: Phase 2 `core-state` 경계 분해와 `useMvpStore` 도입

- Date: 2026-02-27
- Status: Accepted
- Owners: @codex
- Related:
  - `docs/frontend-architecture/refactor-blueprint.md`
  - `docs/frontend-architecture/refactor-roadmap.md`
  - `dev/active/frontend-architecture-refactor/frontend-architecture-refactor-plan.md`

## Context

Phase 1 이후에도 `features/mvp/components/mvp-dashboard.tsx` 내부에 상태 저장/복원(hydration/persist)과 reducer wiring이 함께 남아 있었다.

- 현재 상태:
  - core 상태(`tasks/missions/timerSessions/stats/settings/events/activeTaskId/activeTab/remainingSecondsByMission`)를 대시보드에서 직접 관리
  - hydration/persist 로직이 대시보드 effect에 결합
  - 파생 상태 계산이 컴포넌트 내부 `useMemo`에 분산
- 문제점:
  - 상태 경계와 UI 오케스트레이션이 섞여 추적/테스트가 어려움
  - reset/hydration 경로가 다중 setter 호출로 흩어짐
- 제약:
  - 기능 동등성 유지
  - 기존 저장 포맷(localStorage) 유지
  - `typecheck/lint/test:mvp/build` 통과

## Decision

`core-state`를 model 계층으로 분해하고, 저장/복원 경로를 `useMvpStore` hook으로 단일화한다.

- 선택한 옵션:
  - `features/mvp/shell/model/core-state.types.ts`
  - `features/mvp/shell/model/core-state.actions.ts`
  - `features/mvp/shell/model/core-state.reducer.ts`
  - `features/mvp/shell/model/core-state.selectors.ts`
  - `features/mvp/shell/model/core-state.ts` (facade re-export)
  - `features/mvp/shell/hooks/use-mvp-store.ts`
- 선택 근거:
  - Phase 2 목표(reducer/action/selector 경계 + 저장 경로 단일화) 직접 충족
  - UI 계층에서 저장/복원 세부 구현을 제거해 shell 책임 축소
  - reducer/selector 단위 테스트로 회귀 감지 범위 강화
- 적용 범위:
  - 대시보드 core 상태 wiring
  - hydration/persist/reset 흐름
  - 주요 파생 상태 selector화(active task/missions/running/completion/home)

## Alternatives Considered

1. `mvp-dashboard.tsx` 내부 `useReducer` + effect 유지
  - 장점: 변경량 최소
  - 단점: 상태 경계 목표 미충족, 테스트성 낮음
2. 전역 상태 라이브러리(Zustand/Redux) 즉시 도입
  - 장점: 상태 추적 도구 확장
  - 단점: Phase 2 범위를 넘어 마이그레이션 비용/리스크 증가

## Consequences

- 긍정적 효과:
  - 상태 액션/리듀서/셀렉터 파일 경계 확립
  - hydration/persist/reset을 `useMvpStore`로 집중
  - 대시보드의 core-state boilerplate 제거
- 부정적 영향/기술 부채:
  - 대시보드 단일 파일 구조 자체는 여전히 큼(Phase 3 대상)
  - selector 적용 범위를 탭별 view 분해 시 추가 확장 필요
- 후속 액션:
  - Phase 3에서 탭/화면 컴포넌트 분해
  - shell 조립 레이어에서 selector 재사용 패턴 고정

## Validation Plan

- 수동 시나리오:
  - 과업 생성/미션 생성/타이머 시작-일시정지-완료/리셋
- 자동 테스트:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:mvp`
  - `npm run build`
- 관찰 지표:
  - `mvp-dashboard.tsx` line count 감소(2,629 -> 2,541)
  - `core-state`/`selectors` 단위 테스트 통과
