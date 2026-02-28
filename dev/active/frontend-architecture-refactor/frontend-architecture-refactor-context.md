# Frontend Architecture Refactor - Context

Last Updated: 2026-02-28

## SESSION PROGRESS

### ✅ COMPLETED
- 프론트엔드 아키텍처 전용 문서 세트 생성
  - `docs/frontend-architecture/refactor-blueprint.md`
  - `docs/frontend-architecture/refactor-roadmap.md`
  - `docs/frontend-architecture/adr-template.md`
- 대규모 리팩터링용 Dev Docs 트랙 생성
  - `frontend-architecture-refactor-plan.md`
  - `frontend-architecture-refactor-context.md`
  - `frontend-architecture-refactor-tasks.md`
- 아키텍처 설계 전용 에이전트 추가
  - `.codex/agents/frontend-architecture-designer.md`
- Phase 1 1차 코드 분해 완료(순수 유틸 추출 + 대시보드 치환)
  - `features/mvp/shared/types/task-meta.ts`
  - `features/mvp/shared/model/task-meta-constraints.ts`
  - `features/mvp/shared/model/task-schedule.ts`
  - `features/mvp/shared/model/chunk-runtime.ts`
  - `features/mvp/shared/model/display-utils.ts`
  - `features/mvp/shared/model/radar-shape.ts`
  - `features/mvp/shared/model/events-normalize.ts`
  - `features/mvp/shared/index.ts`
  - `features/mvp/components/mvp-dashboard.tsx` import 치환 및 로컬 순수 함수 제거
- 회귀 게이트(1차) 통과
  - `npm run typecheck`
  - `npm run lint -- features/mvp/components/mvp-dashboard.tsx ...`
  - `npm run test:mvp`
  - `npm run build`
- 추출 유틸 단위 테스트 추가
  - `features/mvp/shared/model/task-meta-and-schedule.test.ts`
  - `features/mvp/shared/model/chunk-runtime.test.ts`
  - `features/mvp/shared/model/display-and-events.test.ts`
- ADR 기록 추가
  - `docs/frontend-architecture/adr-0001-phase1-shared-model-extraction.md`
- Phase 2 상태 경계 재구성 완료
  - `features/mvp/shell/model/core-state.types.ts`
  - `features/mvp/shell/model/core-state.actions.ts`
  - `features/mvp/shell/model/core-state.reducer.ts`
  - `features/mvp/shell/model/core-state.selectors.ts`
  - `features/mvp/shell/model/core-state.ts` (re-export facade)
  - `features/mvp/shell/hooks/use-mvp-store.ts` (hydrate/persist/reset 단일화)
  - `features/mvp/components/mvp-dashboard.tsx` store hook/selector 기반 치환
- Phase 2 단위 테스트 추가
  - `features/mvp/shell/model/core-state.test.ts`
  - `features/mvp/shell/model/core-state.selectors.test.ts`
- 회귀 게이트(Phase 2) 통과
  - `npm run typecheck`
  - `npm run lint -- features/mvp/components/mvp-dashboard.tsx ...`
  - `npm run test:mvp`
  - `npm run build`
- ADR 기록 추가
  - `docs/frontend-architecture/adr-0002-phase2-core-state-boundary.md`
- Phase 3 탭/화면 분해 완료
  - `features/mvp/task-list/components/home-view.tsx`
  - `features/mvp/task-list/components/tasks-view.tsx`
  - `features/mvp/stats/components/stats-view.tsx`
  - `features/mvp/settings/components/settings-view.tsx`
  - `features/mvp/components/mvp-dashboard.tsx` 탭별 view 조립 전환
- Phase 4 기능 모듈 분해 완료
  - `features/mvp/task-input/*`
  - `features/mvp/task-list/*`
  - `features/mvp/timer-runtime/*`
  - `features/mvp/recovery/*`
  - 각 feature `index.ts` 공개 API 경계 추가
- 회귀 게이트(Phase 3~4) 통과
  - `npm run typecheck`
  - `npm run lint -- features/mvp/components/mvp-dashboard.tsx ...`
  - `npm run test:mvp`
  - `npm run build`
- Phase 5 integrations 계층 분리 완료
  - `features/mvp/integrations/notification/notification-adapter.ts`
  - `features/mvp/integrations/stt/stt-adapter.ts`
  - `features/mvp/integrations/sync/sync-domain.ts`
  - `features/mvp/integrations/sync/sync-mock-adapter.ts`
  - `features/mvp/integrations/index.ts`
  - `mvp-dashboard` 및 분리 view에서 `features/p1/*` 직접 의존 제거
- 회귀 게이트(Phase 5) 통과
  - `npm run typecheck`
  - `npm run lint -- features/mvp/components/mvp-dashboard.tsx ...`
  - `npm run test:mvp`
  - `npm run build`
  - `npm run verify:mvp`
- ADR 기록 추가
  - `docs/frontend-architecture/adr-0004-phase5-integrations-boundary.md`

### 🟡 IN PROGRESS
- Phase 6 준비
  - 미사용 로직/스타일 정리 후보 수집 및 테스트 갭 보강 포인트 정리

### ⏳ NOT STARTED
- Phase 6 본 구현

### ⚠️ BLOCKERS / DECISIONS NEEDED
- Blocker 없음
- 결정 필요:
  - Phase 6에서 `mvp-dashboard.tsx` 추가 축소를 우선할지, `mvp-dashboard.module.css` 분할을 우선할지

## Key Decisions

- Big-bang rewrite는 금지하고 단계별 분해를 강제한다.
- feature 내부는 공개 API(`index.ts`) 경유 참조를 원칙으로 한다.
- reducer는 순수 함수로 유지하고 브라우저 API는 integrations 계층으로 격리한다.
- hydration/persist/reset 경계는 `useMvpStore`에 집중하고 UI는 오케스트레이션만 담당한다.
- Phase 3/4에서는 탭 렌더링과 기능 UI를 분리하되, 도메인 핸들러 시그니처는 유지해 behavior parity를 우선한다.
- Phase 5에서는 `mvp` feature 내부 연동 접근을 `features/mvp/integrations/*`로 통일해 cross-feature 결합을 제거한다.

## Key Files

- `features/mvp/components/mvp-dashboard.tsx`
  - 구조 병목이지만 Phase 1 1차 분해로 순수 유틸 로컬 정의 축소
- `features/mvp/components/mvp-dashboard.module.css`
  - 스타일 책임 집중(988 lines)
- `features/mvp/shell/hooks/use-mvp-store.ts`
  - core state hydration/persist/reset 경계
- `features/mvp/shell/model/core-state.types.ts`
  - core state 타입 및 기본 설정
- `features/mvp/shell/model/core-state.actions.ts`
  - 타입드 action 생성기
- `features/mvp/shell/model/core-state.reducer.ts`
  - 순수 reducer 및 updater 해석
- `features/mvp/shell/model/core-state.selectors.ts`
  - 파생 상태 selector 집합
- `features/mvp/task-input/components/task-input-section.tsx`
  - 입력/STT/메타 폼 뷰 모듈
- `features/mvp/task-list/components/home-view.tsx`
  - 홈 탭 뷰 모듈
- `features/mvp/task-list/components/tasks-view.tsx`
  - 할 일 탭 뷰 모듈
- `features/mvp/timer-runtime/components/chunk-primary-actions.tsx`
  - 실행 컨트롤(시작/일시정지/완료)
- `features/mvp/timer-runtime/components/chunk-quick-adjust-actions.tsx`
  - 실행 중 시간 미세 조정 컨트롤
- `features/mvp/recovery/components/recovery-actions.tsx`
  - 복구 액션(다시 나누기/내일로 이동)
- `features/mvp/integrations/notification/notification-adapter.ts`
  - 알림 capability/권한/표시 가능 여부 adapter
- `features/mvp/integrations/stt/stt-adapter.ts`
  - STT capability/recognition adapter
- `features/mvp/integrations/sync/sync-mock-adapter.ts`
  - 외부 sync mock adapter 및 transition 모델
- `features/mvp/shared/types/task-meta.ts`
  - Task meta 입력 타입/우선순위 규칙
- `features/mvp/shared/model/task-meta-constraints.ts`
  - 입력 검증/제약 피드백/요약 정규화
- `features/mvp/shared/model/task-schedule.ts`
  - 일정 입력 파싱/포맷/시간 계산
- `features/mvp/shared/model/chunk-runtime.ts`
  - 청크 예산/상태/정렬 로직
- `features/mvp/shared/model/display-utils.ts`
  - 화면 표시 포맷/지표 문자열 변환
- `features/mvp/shared/model/radar-shape.ts`
  - 레이더 그래프 데이터 생성
- `features/mvp/shared/model/events-normalize.ts`
  - 이벤트 로드 정규화
- `docs/frontend-architecture/adr-0001-phase1-shared-model-extraction.md`
  - Phase 1 경로/경계 의사결정 기록
- `docs/frontend-architecture/adr-0002-phase2-core-state-boundary.md`
  - Phase 2 상태 경계/저장 경로 의사결정 기록
- `docs/frontend-architecture/adr-0003-phase3-phase4-view-feature-modules.md`
  - Phase 3~4 뷰/기능 모듈 분해 의사결정 기록
- `docs/frontend-architecture/adr-0004-phase5-integrations-boundary.md`
  - Phase 5 integrations 경계 의사결정 기록
- `docs/frontend-architecture/refactor-blueprint.md`
  - 목표 구조/규칙 정의
- `docs/frontend-architecture/refactor-roadmap.md`
  - 단계별 실행 순서

## Quick Resume

1. Phase 6 정리 대상(미사용 상태/함수/CSS rule)을 목록화한다.
2. `mvp-dashboard.tsx`와 `mvp-dashboard.module.css`를 정리 우선순위에 따라 축소한다.
3. 정리 후 회귀 게이트(typecheck/lint/test:mvp/build/verify:mvp)를 다시 통과시킨다.
