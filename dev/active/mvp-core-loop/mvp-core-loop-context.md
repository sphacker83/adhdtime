# MVP Core Loop Context

Last Updated: 2026-02-28

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
- `domain.ts`에 PRD 필드/정책 상수 반영(`Task.summary`, `MissionStatus`, `parentMissionId`, `rescheduledFor`)
- `events.ts` 이벤트 공통 필드(`sessionId`, `source`, nullable `taskId/missionId`) 통일
- 위험 입력 차단 시 `safety_blocked` 이벤트 기록 연결
- 재청킹/재등록 상태 전이 반영(`archived`, `abandoned`, `rescheduledFor`, `parentMissionId`, `mission_abandoned`)
- 상태 배지(`abandoned`/`archived`) 및 실행 가능 상태 필터 UI 정합화
- 청킹 validator 강화(개수 권장 경고, 행동성/동사성 판정, 시간 범위 메시지 표준화)
- raw input 최소 저장 정책 강화(요약 정규화/길이 제한, 저장 시 sanitize)
- 최근 이벤트 리스트에 `source`/`meta` 요약 노출
- MVP-009 복귀 UX 카피 톤 통일(재청킹/재등록/차단) 및 가이드 테이블 문서 추가
- 타이머 정확도 회귀 테스트(`MVP-007`) 추가: 드리프트(±2초), 백그라운드 복귀, 0초 클램프
- 손상된 localStorage 방어 로직 추가(필드별 타입가드 + 안전 기본값 복구)
- 실행 중 미션가 홈에서 항상 일관되게 보이도록 표시 대상 정합화
- 실행 중 미션 삭제 시 타이머 세션 종료/누수 방지 처리
- 퀘스트 추천을 50개 일상형 퀘스트 JSON 기반 문장 유사도 검색으로 확장(`features/mvp/lib/missioning.ts`, `docs/adhd_mission_presets.json`)
- 검색 실패/검증 실패 시 자동 생성 fallback 제거(`features/mvp/components/mvp-dashboard.tsx`)
- 퀘스트/미션 매핑 문서 추가(`docs/QUEST_MISSION_MAP.md`)
- 일상형 퀘스트 카탈로그 문서 추가(`docs/DAILY_LIFE_QUEST_CATALOG_50.md`)
- 유사도 튜닝: 제목 벡터 반영, intent 힌트 점수 추가, 신호 임계값 완화(`features/mvp/lib/missioning.ts`)
- 헤더 롤링 팁 노출/오류성 피드백 토스트 분기 동작 정리(`features/mvp/components/mvp-dashboard.tsx`)
- STT 입력 아이콘 우측 고정 및 입력 패딩 정합화(`features/mvp/components/mvp-dashboard.module.css`)
- 상태 카드 레이더 크기 재조정(카드 높이 과대 확장 억제 + 데스크톱 우측 점유 강화)
- 미션 기반 일정 동기화 시 due-only 과업의 시작시간 재주입 버그 수정(`mvp-dashboard.tsx`)
- 편집 모달 오픈 시 due-only 스케줄 보존(시작시간 자동 역산 표시 차단)
- 총 소요시간 편집 중 due-only 입력의 시작시간 자동 파생 차단
- PRD/개발플랜에 Post-MVP 성장 2축(XP vs 스탯 랭크) 및 단체 이벤트(Room 기반) 기획 반영
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
- 이벤트 스키마는 `sessionId` + nullable `taskId/missionId`로 통일하여 누락 필드 마이그레이션 허용

## Files In Scope
- `features/mvp/types/domain.ts`
- `features/mvp/lib/missioning.ts`
- `features/mvp/lib/reward.ts`
- `features/mvp/lib/events.ts`
- `features/mvp/components/mvp-dashboard.tsx`
- `features/mvp/components/mvp-dashboard.module.css`
- `app/page.tsx`

## Quick Resume
1. P1 착수 문서 확인: `dev/archive/post-mvp-p1/*`
2. FR-10(알림) UI 연결부터 구현 시작
3. 변경 후 `npm run typecheck && npm run lint && npm run test:mvp && npm run build` 재검증

## Session Notes (2026-02-28, Dashboard UX Polish + Due-Only Fix)
- 원인: `missions` 변경 시 동작하는 task schedule 동기화 `useEffect`가 `normalizeTaskScheduleIso` 결과를 그대로 반영하면서, `dueAt`만 있던 과업에 `scheduledFor`를 역산 주입함.
- 수정: `normalizeTaskScheduleIso` 직후 `applyDueOnlyScheduleInputOverride`와 동일 정책을 `task.scheduledFor/task.dueAt` 기준으로 공통 적용해, 시작시간 미입력 + 마감시간만 입력된 경우 `scheduledFor`를 `undefined`로 유지.
- 보강: 퀘스트 편집 모달 초기 입력 구성에서도 same override를 적용해 due-only 과업을 열었을 때 시작시간이 UI에 재주입되지 않도록 수정.
- 보강: 총 소요시간 입력으로 파생 계산 시 due-only 입력(`scheduledFor` 공란 + `dueAt` 존재) 조건에서는 `scheduledFor` 역산을 건너뛰도록 가드 추가.
- 상태: 코드 반영 및 검증 게이트 재실행 완료(`npm run typecheck`, `npm run test:mvp`, `npm run lint` 모두 통과).
- 다음 확인: due-only 생성/수정/미션 상태 전이 후에도 시작시간이 자동 복원되지 않는지 수동 시나리오 점검.

## Session Notes (2026-02-28, Mobile Status Card Rebalance)
- 요구사항: 카드 전체 크기 확장은 피하고, 모바일에서도 좌측 상태 정보 + 우측 레이더가 한 줄 2열로 안정적으로 보이도록 조정.
- 적용:
  - `statusCard` 기본 레이아웃을 모바일 포함 2열(좌: 상태/레벨/XP, 우: 레이더)로 전환.
  - `radarWrap` 크기를 카드 폭에 맞게 축소하고 우측 정렬을 기본화.
  - 레이더 라벨 좌표를 px 고정값에서 `%` 기반 반응형 좌표로 전환.
- 상태: 코드 반영 및 검증 완료(`npm run typecheck`, `npm run lint`, `npm run test:mvp` 통과).

## Session Notes (2026-02-28, Status Card Micro Tuning)
- 요구사항: XP 막대를 조금 더 짧게 조정하고, 방사형 수치 배지를 모서리 방향으로 약간 더 바깥으로 이동, 배지 테두리 제거.
- 추가 요구사항: 배지 배경을 투명 처리하여 방사형 스탯 도형 가림 해소.
- 추가 요구사항: XP 막대를 한 단계 더 짧게 축소.
- 적용:
  - `RADAR_LABEL_RADIUS_PERCENT`를 상향해 배지 위치를 외곽 방향으로 이동.
  - `xpTrack` 폭 상한을 설정해 XP 막대가 이전보다 짧게 보이도록 조정.
  - `xpTrack` 폭 상한을 `148px`로 추가 축소.
  - `radarStatBadge`의 `border` 제거.
  - `radarStatBadge` 배경을 `transparent`로 전환해 도형 가림 제거.
- 상태: 추가 조정 반영 및 `npm run lint` 통과.

## Session Notes (2026-02-28, Growth/Rank/Co-op Planning)
- 요청: 경험치/스탯 관계 재정의(스탯=레벨 수렴 방지), 스탯 랭크 및 캐릭터 랭크 규칙 평가/보완, 향후 단체 이벤트(주말 대청소 방) 확장 계획 문서 반영.
- 추가 요청: 일일 보상 상한(최대 5퀘스트까지 XP/스탯 지급) 정책 추가.
- 반영 문서:
  - `docs/PRD.md` v3.3: Post-MVP 섹션에 성장 2축, 스탯 랭크(100 도달 시 랭크업), 캐릭터 랭크 평균 산식, Co-op Room Event 및 계측 이벤트 추가.
  - `docs/DEVELOPMENT_PLAN.md` v2.3: P2 백로그(Epic G/H)로 성장/협동 확장 작업 분해.
- 산출물:
  - `docs/GROWTH_SCORE_MODEL_V1.md` 신설(공식 점수모델 초안, 산식/분배/페이싱/악용방지/Room 연계 규칙 포함).
- 보완 반영:
  - `GROWTH_SCORE_MODEL_V1`: Daily Cap(일일 최대 5퀘스트 보상), 04:00 리셋, 6번째 이후 기록 전용 완료 규칙 추가.
  - `PRD`: Post-MVP 보상 분리 정책에 Daily Cap 명시.
  - `DEVELOPMENT_PLAN`: Epic G에 `G-05 일일 보상 상한` 구현 항목 추가.
- 상태: 구현 변경 없이 기획/문서 반영 완료.

## Session Notes (2026-02-28, Daily Reward Gate Implementation)
- 요구사항: 로컬 타임존 04:00 기준으로 일일 보상 게이트를 적용하고, 하루 최대 5퀘스트 + 동일 taskId 1회 보상 제한을 실제 로직에 반영.
- 적용:
  - `features/mvp/lib/reward.ts`에 04:00 기준 `getDateKey`, `xp_gained` 기반 오늘 보상 task 집합 helper, 게이트 판정 helper, no-reward `RewardOutcome` helper 추가.
  - `features/mvp/components/mvp-dashboard.tsx`의 `handleCompleteMission`/`handleRemission`/`handleReschedule`에 게이트 적용.
  - `mission_completed` 이벤트 meta에 `rewardGranted`, `rewardReason` 필드 추가.
  - 보상 차단 시 `xp_gained`/`level_up` 미기록, 사용자 피드백(한도 도달/동일 task 중복 보상) 분기 적용.
- 검증:
  - `npm run test:mvp` 통과.
  - `npx vitest run features/mvp/lib/reward.test.ts` 통과(게이트/리셋 경계/중복 제한/no-reward todayCompleted 검증).

## Session Close (2026-02-28)

- 전체 점검: `npm run verify:mvp` PASS (`typecheck/lint/test:mvp/build/verify:gate`).
- 오늘 반영: 대기 중 퀘스트 접힘 상태 메뉴 패널 잘림 UI 수정(`features/mvp/components/mvp-dashboard.module.css`), 루트 운영 가이드 `AGENTS.md` 추가.
- 인수인계: 다음 세션 시작 시 각 트랙의 `Quick Resume` 섹션을 기준으로 이어서 진행.
