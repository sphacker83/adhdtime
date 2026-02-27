# MVP Core Loop Context

Last Updated: 2026-02-27

## SESSION PROGRESS

### ✅ COMPLETED
- PRD/USECASE/DEVELOPMENT_PLAN 기준 구현 범위 재정의
- 기존 코드와 문서 간 갭 분석 완료
- 작업용 Dev Docs 구조 생성
- MVP 도메인 타입 및 엔진 구현
- 새 홈 대시보드 컴포넌트 구축
- 로컬 저장(localStorage) 기반 상태 복원/저장 연결
- 타이머 elapsed 재계산 + 5분 햅틱 이벤트 로깅 반영
- PRD v3 P0-Critical 정합화 반영
- `domain.ts`에 PRD 필드/정책 상수 반영(`Task.summary`, `ChunkStatus`, `parentChunkId`, `rescheduledFor`)
- `events.ts` 이벤트 공통 필드(`sessionId`, `source`, nullable `taskId/chunkId`) 통일
- 위험 입력 차단 시 `safety_blocked` 이벤트 기록 연결
- 재청킹/재등록 상태 전이 반영(`archived`, `abandoned`, `rescheduledFor`, `parentChunkId`, `chunk_abandoned`)
- 상태 배지(`abandoned`/`archived`) 및 실행 가능 상태 필터 UI 정합화
- 청킹 validator 강화(개수 권장 경고, 행동성/동사성 판정, 시간 범위 메시지 표준화)
- raw input 최소 저장 정책 강화(요약 정규화/길이 제한, 저장 시 sanitize)
- 최근 이벤트 리스트에 `source`/`meta` 요약 노출
- MVP-009 복귀 UX 카피 톤 통일(재청킹/재등록/차단) 및 가이드 테이블 문서 추가
- 타이머 정확도 회귀 테스트(`MVP-007`) 추가: 드리프트(±2초), 백그라운드 복귀, 0초 클램프
- 손상된 localStorage 방어 로직 추가(필드별 타입가드 + 안전 기본값 복구)
- 실행 중 청크가 홈에서 항상 일관되게 보이도록 표시 대상 정합화
- 실행 중 청크 삭제 시 타이머 세션 종료/누수 방지 처리
- `npm run typecheck`, `npm run lint`, `npm run test:mvp`, `npm run build` 통과

### 🟡 IN PROGRESS
- 없음 (MVP P0 범위 기준)

### ⚠️ BLOCKERS
- 없음

## Key Decisions
- 기존 `phase-one-dashboard`는 유지하되 엔트리에서는 새 MVP 컴포넌트 사용
- 청킹은 로컬 룰 우선, 미매칭 시 AI 폴백 스텁으로 즉시 동작 보장
- 타이머는 `remainingSeconds`를 elapsed 기반으로 보정하는 정책 채택
- 데이터는 localStorage 기반 local-first로 저장
- 이벤트 스키마는 `sessionId` + nullable `taskId/chunkId`로 통일하여 누락 필드 마이그레이션 허용

## Files In Scope
- `features/mvp/types/domain.ts`
- `features/mvp/lib/chunking.ts`
- `features/mvp/lib/reward.ts`
- `features/mvp/lib/events.ts`
- `features/mvp/components/mvp-dashboard.tsx`
- `features/mvp/components/mvp-dashboard.module.css`
- `app/page.tsx`

## Quick Resume
1. P1 착수 문서 확인: `dev/active/post-mvp-p1/*`
2. FR-10(알림) UI 연결부터 구현 시작
3. 변경 후 `npm run typecheck && npm run lint && npm run test:mvp && npm run build` 재검증
