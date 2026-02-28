# Post-MVP P1 Context

Last Updated: 2026-02-28

## SESSION PROGRESS

### ✅ COMPLETED
- P1 착수용 Dev Docs 3종 생성
- P1 우선순위 제안 수립 (`알림 FR-10 -> STT -> 외부 동기화`)
- `features/p1` 신규 스캐폴딩 생성
  - 알림 capability/permission 헬퍼
  - STT capability 헬퍼(실제 인식 로직은 미연결)
  - 동기화 도메인 타입 초안

### 🟡 IN PROGRESS
- 없음 (다음 턴에서 Phase 1 구현 시작 가능)

### ⚠️ BLOCKERS
- 외부 동기화의 실제 provider OAuth 정책 미정
- STT 브라우저별 이벤트 차이 대응 정책 미정

## Key Decisions
- 기존 MVP 동작 리스크를 줄이기 위해 신규 경로(`features/p1`, `dev/active/post-mvp-p1`) 중심으로 추가한다.
- capability 체크는 SSR 안전하게 동작하도록 브라우저 존재 여부를 먼저 검증한다.
- 동기화는 구현보다 타입 계약을 먼저 확정해 다음 턴에서 adapter/UI를 빠르게 붙일 수 있게 한다.

## Files In Scope
- `dev/active/post-mvp-p1/post-mvp-p1-plan.md`
- `dev/active/post-mvp-p1/post-mvp-p1-context.md`
- `dev/active/post-mvp-p1/post-mvp-p1-tasks.md`
- `features/p1/helpers/notification-capability.ts`
- `features/p1/helpers/stt-capability.ts`
- `features/p1/helpers/index.ts`
- `features/p1/types/sync-domain.ts`
- `features/p1/types/index.ts`
- `features/p1/index.ts`

## Quick Resume
1. FR-10 알림 UI 엔트리(권한 상태/요청 버튼)부터 연결한다.
2. STT 버튼/상태를 과업 입력 UI에 연결하고 transcript 표시까지 구현한다.
3. 동기화 mock adapter를 추가해 `ExternalSyncJobStatus` 상태 전이 검증을 붙인다.

## Session Close (2026-02-28)

- 전체 점검: `npm run verify:mvp` PASS (`typecheck/lint/test:mvp/build/verify:gate`).
- 오늘 반영: 대기 중 퀘스트 접힘 상태 메뉴 패널 잘림 UI 수정(`features/mvp/components/mvp-dashboard.module.css`), 루트 운영 가이드 `AGENTS.md` 추가.
- 인수인계: 다음 세션 시작 시 각 트랙의 `Quick Resume` 섹션을 기준으로 이어서 진행.
