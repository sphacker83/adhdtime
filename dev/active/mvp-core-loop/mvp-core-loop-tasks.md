# MVP Core Loop Tasks

Last Updated: 2026-02-28

## Active Backlog
- [x] 실제 구현 이슈 백로그 확인: `dev/active/mvp-core-loop/mvp-core-loop-implementation-issues.md`

## Phase 1: Domain + Engine
- [x] Task/Mission/TimerSession/Stats/Event 타입 정의
- [x] 로컬 청킹 룰셋 정의
- [x] 청킹 스키마 validator 구현
- [x] AI 폴백 어댑터 인터페이스 연결
- [x] XP/레벨/5스탯 계산 유틸 구현
- [x] 이벤트 큐 유틸 구현

## Phase 2: Dashboard
- [x] 홈 IA 레이아웃(상태 카드/입력/퀘스트/탭)
- [x] 입력 -> 청킹 생성 플로우
- [x] 현재 미션 강조 + 리스트 렌더링
- [x] 시작/일시정지/완료 동작
- [x] 완료 후 다음 미션 자동 포커스
- [x] 5분 햅틱 토글 구현
- [x] 기본 리포트/설정 섹션 구현

## Phase 3: Validation
- [x] 타입체크
- [x] 린트
- [x] 컨텍스트 문서 최종 업데이트

## Phase 4: PRD v3 P0-Critical 정합화 (코드 재점검: 2026-02-27)
- [x] MVP-001 타입 확장 반영 (`Task.summary`, `MissionStatus`, `parentMissionId`, `rescheduledFor`)
  - 검증 포인트: `features/mvp/types/domain.ts`
- [x] MVP-002 위험 입력 차단 시 `safety_blocked` 이벤트 기록
  - 검증 포인트: `features/mvp/components/mvp-dashboard.tsx` (`eventName: "safety_blocked"`)
- [x] MVP-004 이벤트 스키마 반영 (`sessionId`, nullable `taskId/missionId`, source 확장)
  - 검증 포인트: `features/mvp/lib/events.ts`, `features/mvp/components/mvp-dashboard.tsx` (`sessionIdRef`, `source`)
- [x] MVP-003 재청킹/재등록 상태 전이 정합화 (`archived`/`abandoned` + 연관 필드)
  - 검증 포인트: `features/mvp/components/mvp-dashboard.tsx` (`archived`/`abandoned` 상태 전이, `parentMissionId`, `rescheduledFor`, `mission_abandoned` 이벤트)
- [x] MVP-009 복귀 UX 카피/피드백 일관화(재청킹/재등록/차단 톤 통일 + 가이드 문서화)
  - 검증 포인트: `features/mvp/components/mvp-dashboard.tsx` (복귀/차단 피드백 문구, CTA 라벨), `docs/mvp-009-recovery-copy-guide.md`
- [x] 새 상태값(`abandoned`/`archived`) UI 배지 및 실행 가능 상태 필터 완성
  - 검증 포인트: `features/mvp/components/mvp-dashboard.module.css` (`.status_abandoned`, `.status_archived`), `features/mvp/components/mvp-dashboard.tsx` (`isActionableMissionStatus` 기반 필터/버튼 비활성화)
- [x] MVP-011 Phase 4 검증 게이트(typecheck/lint/build) 절차 문서화 및 최신 실행 확인
- [x] MVP-007 타이머 정확도 회귀 테스트 자동화
  - 검증 포인트: `features/mvp/lib/timer-accuracy.ts`, `features/mvp/lib/timer-accuracy.test.ts`, `package.json`(`test:mvp`)
- [x] 안정화 패치: 손상된 localStorage 방어 + 실행 중 미션 표시/삭제 정합화
  - 검증 포인트: `features/mvp/lib/storage.ts`(필드별 타입가드), `features/mvp/components/mvp-dashboard.tsx`(home 표시 대상/삭제 시 세션 종료)

## Phase 4 검증 게이트 (MVP-011)
1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:mvp`
4. `npm run build`

- 원칙: 앞 단계 실패 시 이후 단계 실행하지 않음
- 한 번에 실행: `npm run typecheck && npm run lint && npm run test:mvp && npm run build`
- 통과 기준: 네 명령 모두 exit code 0
- 최근 실행 결과 (2026-02-27): `typecheck` 통과, `lint` 통과, `test:mvp` 통과, `build` 통과
- MVP-009 카피 반영 재검증 (2026-02-27): `npm run typecheck` 통과, `npm run lint` 통과

## Session Close (2026-02-28)

- [x] `npm run verify:mvp` 통합 점검 PASS 확인
- [x] 트랙 문서(`plan/context/tasks`) `Last Updated` 동기화
- [x] 다음 세션 재개용 핸드오프 메모 반영
