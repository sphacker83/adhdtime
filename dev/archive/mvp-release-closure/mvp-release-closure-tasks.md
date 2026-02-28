# MVP Release Closure Tasks

Last Updated: 2026-02-28

## Phase 0: Track Setup
- [x] Dev Docs 3파일 생성(plan/context/tasks)
- [x] MVP 마감 범위/제외 범위 확정

## Phase 1: due-only QA
- [x] 생성/수정/미션 상태 전이에서 due-only 입력 검증
- [x] `scheduledFor` 자동 재주입 없음 확인 결과 기록
- [x] `mvp-core-loop` 잔여 체크박스 마감 반영

## Phase 2: FR-09 정책 정합화
- [x] 재일정을 Task 단위 정책으로 고정(미션 단위 재일정 제거/차단)
- [x] 미완료 미션 동반 이동 규칙 검증
- [x] 관련 이벤트/상태 전이 회귀 확인

## Phase 3: Gate Automation
- [x] 게이트 3/7/8/9 자동 판정 근거 구현 또는 테스트화
- [x] `verify-release-gate` 실패 메시지 보강

## Phase 4: Test Script Hardening
- [x] `package.json` `test:mvp`에 `reward.test.ts` 포함
- [x] `npm run test:mvp`로 reward 테스트 실행 확인

## Phase 5: Final Verification + Docs Sync
- [x] `npm run verify:mvp` PASS
- [x] `docs/TRACEABILITY_MATRIX.md` 상태 최신화
- [x] `docs/RELEASE_GATE_LOG.md` 실행 로그 최신화
- [x] `dev/archive/mvp-core-loop/context/tasks` 동기화
- [x] 본 트랙 `context/tasks` 세션 마감 상태 반영

## Session Close (2026-02-28)
- [x] FR-09 Task 단위 재일정 반영(`mvp-dashboard.tsx`, `home-view.tsx`, `recovery-actions.tsx`)
- [x] due-only 회귀 검증 자동화(`task-schedule.ts`, `task-meta-and-schedule.test.ts`)
- [x] 게이트 자동화 보강(`scripts/verify-release-gate.mjs`, Gate-3/7/8/9 메시지 포함)
- [x] 최종 검증 실행(`npm run verify:mvp` PASS, 12 files / 65 tests PASS)
