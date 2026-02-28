# Task Manual Mission Side Plan - Context

Last Updated: 2026-02-28

## SESSION PROGRESS

### ✅ COMPLETED
- 사이드 플랜 트랙 문서 3종 생성 및 본 세션 기준 상태 반영
  - `task-manual-mission-side-plan-plan.md`
  - `task-manual-mission-side-plan-context.md`
  - `task-manual-mission-side-plan-tasks.md`
- Feature 1~5 구현 완료
  - 수동 미션 생성/버튼 재배치, STT 입력창 내부 아이콘, 홈 퀘스트 폴딩, 실행 중 ±5 조정 반영
- Feature 6 구현 완료
  - 3개 조합 자동 계산만 허용(`총+시작=>마감`, `총+마감=>시작`, `시작+마감=>총`)
  - `last edited field` 우선 정책 + 입력 단계 즉시 검증(MIN/MAX, 시작<=마감) 반영
- 정적 검증 완료
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:mvp`
- Phase 5 마감 작업 완료
  - 주요 사용자 시나리오 수동 테스트 기록 정리 완료
  - 이벤트 로그/상태 전이 수동 회귀 확인 완료

### 🟡 IN PROGRESS
- 없음

### ⏳ NOT STARTED
- 없음

### ⚠️ BLOCKERS / DECISIONS NEEDED
- Blocker 없음
- 주요 의사결정 확정 완료
  - Feature 6 자동 계산: 마지막 편집 필드 우선
  - 홈 폴딩 기준: actionable(`todo/running/paused`) 집합 통일

## Key Decisions
- 이 작업은 기존 트랙과 분리된 사이드 플랜으로 관리한다.
- Feature 6 계산은 입력 이벤트 단일 핸들러에서만 처리하고, 3개 조합 외 자동 계산은 금지한다.
- 제약 위반(`MIN/MAX totalMinutes`, `scheduledFor <= dueAt`)은 제출 전이 아니라 입력 단계에서 즉시 피드백한다.
- 홈 오늘의 퀘스트에서 "남은 N개"와 펼침 목록은 동일한 actionable 미션 집합을 기준으로 한다.
- 폴딩 상태는 로컬 상태(`expandedHomeTaskId`)로 관리하고 persisted state에는 저장하지 않는다.

## Files In Scope
- 문서:
  - `dev/active/task-manual-mission-side-plan/task-manual-mission-side-plan-plan.md`
  - `dev/active/task-manual-mission-side-plan/task-manual-mission-side-plan-context.md`
  - `dev/active/task-manual-mission-side-plan/task-manual-mission-side-plan-tasks.md`
- 구현 반영 파일:
  - `features/mvp/components/mvp-dashboard.tsx`
  - `features/mvp/components/mvp-dashboard.module.css`

## Quick Resume (컨텍스트 리셋 인수인계)
1. 사이드 플랜 트랙(`manual-mission-side-plan`)의 모든 Phase/Validation Gate 완료 처리.
2. 잔여 Blocker/의사결정 항목 없음.
3. 후속 변경 요청 전까지 본 트랙은 마감 상태 유지.

## Session Close (2026-02-28)

- 전체 점검: `npm run verify:mvp` PASS (`typecheck/lint/test:mvp/build/verify:gate`).
- 오늘 반영: 대기 중 퀘스트 접힘 상태 메뉴 패널 잘림 UI 수정(`features/mvp/components/mvp-dashboard.module.css`), 루트 운영 가이드 `AGENTS.md` 추가.
- 인수인계: 다음 세션 시작 시 각 트랙의 `Quick Resume` 섹션을 기준으로 이어서 진행.
