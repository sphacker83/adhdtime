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

### 🟡 IN PROGRESS
- 없음

### ⏳ NOT STARTED
- 코드 레벨 리팩터링 Phase 1~6

### ⚠️ BLOCKERS / DECISIONS NEEDED
- Blocker 없음
- 결정 필요:
  - Phase 1에서 우선 분리할 첫 모듈(`task-input` vs `timer-runtime`)

## Key Decisions

- Big-bang rewrite는 금지하고 단계별 분해를 강제한다.
- feature 내부는 공개 API(`index.ts`) 경유 참조를 원칙으로 한다.
- reducer는 순수 함수로 유지하고 브라우저 API는 integrations 계층으로 격리한다.

## Key Files

- `features/mvp/components/mvp-dashboard.tsx`
  - 현재 구조 병목(2,911 lines)
- `features/mvp/components/mvp-dashboard.module.css`
  - 스타일 책임 집중(988 lines)
- `docs/frontend-architecture/refactor-blueprint.md`
  - 목표 구조/규칙 정의
- `docs/frontend-architecture/refactor-roadmap.md`
  - 단계별 실행 순서

## Quick Resume

1. `refactor-roadmap.md` 기준으로 Phase 1 분해 대상 모듈을 확정한다.
2. `tasks.md` Phase 1 항목을 in-progress로 전환한다.
3. 코드 분해 후 회귀 게이트(`typecheck/lint/test:mvp`)를 실행하고 결과를 기록한다.
