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

## Session Update (2026-02-28, Similarity Quest Recommendation)
- [x] `docs/adhd_mission_presets.json`을 일상형 퀘스트 50개 기준으로 재구성
- [x] 문장 유사도 기반 추천(코사인 + 토큰 오버랩 + 실행성 가산) 적용
- [x] 유사도 튜닝(제목 유사도 반영, intent 힌트 가산, 신호 임계값 완화)
- [x] 검색 실패 시 강제 템플릿 생성 fallback 제거(`mvp-dashboard.tsx`)
- [x] 퀘스트/미션 매핑 문서 갱신(`docs/QUEST_MISSION_MAP.md`, 50 quests)
- [x] 일상형 퀘스트 카탈로그 문서 작성(`docs/DAILY_LIFE_QUEST_CATALOG_50.md`)
- [x] 검증 게이트 재실행(`typecheck/lint/test:mvp`)

## Session Update (2026-02-28, Dashboard Polish + Due-Only Schedule Fix)
- [x] 헤더 롤링 팁/피드백 토스트 동작 정리(오류성 문구 토스트 유지)
- [x] STT 입력 아이콘 우측 배치 및 입력 패딩 정합화
- [x] 상태 카드 레이더 UI 재조정(카드 높이 과확장 방지 + 데스크톱 2열 우측 점유 강화)
- [x] `missions` 기반 schedule 동기화에서 due-only 시작시간 재주입 버그 수정
- [x] 편집 모달 오픈 시 due-only 시작시간 재주입 차단
- [x] 총 소요시간 편집 시 due-only 입력에서 시작시간 자동 역산 차단
- [x] 원인/수정 포인트 문서화
  - 원인: `normalizeTaskScheduleIso`가 `dueAt`만 있는 과업에서 `scheduledFor`를 역산 생성
  - 조치: 동기화 `useEffect`에도 `applyDueOnlyScheduleInputOverride` 동일 정책 적용
- [x] 검증 게이트 재실행(`npm run typecheck`, `npm run test:mvp`, `npm run lint`)
- [ ] 다음 확인: due-only 시나리오(생성/수정/미션 변경)에서 `scheduledFor` 자동 재주입 여부 수동 점검

## Session Update (2026-02-28, Mobile Status Card Rebalance)
- [x] 요구사항 정리: 모바일 상태 카드 2열 고정(좌측 상태 정보 / 우측 레이더), 카드 세로 확장 방지
- [x] CSS 레이아웃 재조정 적용(`statusCard`, `levelBlock`, `radarBlock`, `radarWrap`)
- [x] 레이더 라벨 좌표를 카드 폭에 종속되지 않게 반응형 비율 좌표로 전환
- [x] 회귀 검증(`npm run typecheck`, `npm run lint`, `npm run test:mvp`)

## Session Update (2026-02-28, Status Card Micro Tuning)
- [x] 요구사항 정리(XP 바 길이 축소, 방사형 배지 외곽 이동, 배지 테두리 제거)
- [x] CSS/상수 조정 반영(`xpTrack`, `radarStatBadge`, `RADAR_LABEL_RADIUS_PERCENT`)
- [x] 회귀 검증(`npm run typecheck`, `npm run lint`, `npm run test:mvp`)
- [x] 추가 조정: `radarStatBadge` 배경 투명화
- [x] 추가 조정: `xpTrack` 폭 상한 2차 축소(`168px` -> `148px`)

## Session Update (2026-02-28, Growth/Rank/Co-op Planning)
- [x] 평가: XP와 스탯 랭크의 역할 분리 원칙 확정
- [x] PRD 반영: Post-MVP 성장/랭크/캐릭터랭크/단체 이벤트(Room) 기획 추가
- [x] 개발 플랜 반영: P2 에픽(Epic G/H) 백로그 추가
- [x] 구현 범위 제외 명시: MVP 게이트는 현행 유지
- [x] 성장 점수 모델 단일 기획 문서 신설(`docs/GROWTH_SCORE_MODEL_V1.md`)
- [x] 보완 반영: 일일 보상 상한(Daily Cap, 5퀘스트) 규칙을 모델/PRD/개발플랜에 동기화

## Session Close (2026-02-28)

- [x] `npm run verify:mvp` 통합 점검 PASS 확인
- [x] 트랙 문서(`plan/context/tasks`) `Last Updated` 동기화
- [x] 다음 세션 재개용 핸드오프 메모 반영
