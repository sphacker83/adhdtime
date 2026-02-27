# Frontend Architecture Refactor - Context

Last Updated: 2026-02-27

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

### 🟡 IN PROGRESS
- Phase 3 준비
  - 탭/화면 단위 컴포넌트 분해 경계(홈/할 일/스탯/설정) 확정

### ⏳ NOT STARTED
- Phase 3~6 본 구현

### ⚠️ BLOCKERS / DECISIONS NEEDED
- Blocker 없음
- 결정 필요:
  - Phase 3 분해 시 각 View의 props 계약을 shell/selectors 기준으로 고정할지 여부

## Key Decisions

- Big-bang rewrite는 금지하고 단계별 분해를 강제한다.
- feature 내부는 공개 API(`index.ts`) 경유 참조를 원칙으로 한다.
- reducer는 순수 함수로 유지하고 브라우저 API는 integrations 계층으로 격리한다.
- hydration/persist/reset 경계는 `useMvpStore`에 집중하고 UI는 오케스트레이션만 담당한다.

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
- `docs/frontend-architecture/refactor-blueprint.md`
  - 목표 구조/규칙 정의
- `docs/frontend-architecture/refactor-roadmap.md`
  - 단계별 실행 순서

## Quick Resume

1. Phase 3의 View 분해 단위를 고정한다(`HomeView`, `TasksView`, `StatsView`, `SettingsView`).
2. `mvp-dashboard.tsx` 렌더링 블록을 탭별 컴포넌트로 분리하고 shell 조립 책임만 남긴다.
3. 분해 후 회귀 게이트(typecheck/lint/test:mvp/build)를 다시 통과시킨다.
