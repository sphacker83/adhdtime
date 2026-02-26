# ADHD 타이머 앱 MVP 작업/함수단위 Task (체크리스트)

- 기준 문서: `docs/adhd-timer-app-mvp-prd.md`
- 작성일: 2026-02-26
- 목적: PRD를 개발 실행 가능한 작업 단위(Jira/Linear 티켓)와 함수 단위(구현 체크리스트)로 분해
- 현재 진행 상태: `Phase 2 구현 완료 + 홈 UI/상태머신 고도화 반영`

## 1. 사용 규칙

- 대기: `[ ] ⏳`
- 진행중: `[ ] 🚧`
- 완료: `[x] ✅`
- 이모지는 항상 체크박스 바로 뒤에 표기한다.
- 상태 변경 시 `업데이트 로그`에 날짜와 변경 내용을 기록한다.
- 선행조건이 있는 항목은 선행 Task 완료 후 체크한다.

## 1.1 함수단위 체크리스트 운영 원칙

- Phase 1~2(가시화/UX 구간)에서는 `FN-*` 체크를 선택 적용한다. 우선순위는 `Phase/FR` 완료다.
- Phase 3부터는 `FN-*` 체크를 필수 적용한다. 구현 PR에는 대응 `FN-*` ID를 반드시 명시한다.
- `FN-*` 항목은 코드가 존재하고 동작 검증(최소 수동 확인 또는 테스트)이 끝난 시점에만 `[x] ✅`로 변경한다.
- 함수명 변경/분할 시 문서의 `FN-*` 목록을 같은 커밋에서 함께 갱신한다.
- 릴리스 전(QA 단계)에는 완료된 `FR` 항목이 대응 `FN-*` 체크와 모순되지 않는지 최종 점검한다.

## 2. 가시화 우선 원칙

- [ ] ⏳ 화면 가시화가 가능한 FE Task는 API 연결 전 `mock data`로 먼저 구현한다.
- [ ] ⏳ UI가 보이는 상태를 먼저 만든 뒤, BE 연결/정합성/최적화를 붙인다.
- [ ] ⏳ 캘린더 연동은 설정 화면 가시화 후 실제 OAuth/Sync를 연결한다.

## 3. 빠른 가시화 실행 순서 (권장)

## Phase 1: 오늘 바로 보이는 화면 만들기 (데모 우선, 완료)

- [x] ✅ `TSK-04` 일정 목록/상태토글(시작/완료/리셋)/삭제 UI 구현 (mock)
- [x] ✅ `TSK-03` 일정 생성/수정 모달(UI + 검증) 구현 (mock)
- [x] ✅ `PRI-02` 중요도 배지 UI 구현 (우선순위 입력 FE 제거 반영)
- [x] ✅ `DDL-02` 일정 카드 Progress Bar UI 구현
- [x] ✅ `DDL-03` 색상 규칙(녹/주/빨) + Overdue 상태 구현
- [x] ✅ `DDL-04` `마감까지 n일 n시간` 텍스트 렌더링 구현
- [x] ✅ `TMR-01` 원형 타이머 컴포넌트(`TimerCircle`) 구현
- [x] ✅ `TMR-03` 타이머 상태머신(store/reducer) 구현
- [x] ✅ `TMR-02` 타이머 제어 UI(`시작/일시정지/재개/종료/다음세션`) 구현

## Phase 2: 사용감 강화 (프론트 동작 완성)

- [x] ✅ `TSK-05` 검색 제거 + 필터/정렬 1줄 드롭다운 UI 구현
- [x] ✅ `PRI-03` 인라인 수정 제거 + 편집 액션 기반 독립 수정 플로우 구현
- [x] ✅ `PRI-04` 중요도 기준 정렬/필터 옵션 추가
- [x] ✅ `TMR-06` 백그라운드 복귀 시 경과시간 보정 처리
- [x] ✅ `TMR-08` 타이머 이벤트 트래킹 연동
- [x] ✅ `CAL-06` 연동 설정 화면(연결상태/마지막 동기화/동기화 버튼) 구현 (mock)
- [x] ✅ `CAL-07` 동기화 결과(성공/실패/충돌) 로그 UI 구현 (mock)
- [x] ✅ `UI-ALIGN-01` `docs/ui.md` 홈화면 1:1 정합화(상단 타임바/링도넛/카드 액션/캘린더 접기)
- [x] ✅ `TSK-08` FE: 시작대기/진행중/완료 상태 전이 + `startedAt` 기반 진행률 적용
- [x] ✅ `DDL-06` FE: 진행률 색상 스케일 통일(최대값=`완료 버튼` 초록)
- [x] ✅ `UI-ALIGN-02` FE: sticky 타이틀바 + 날짜포맷 확장 + 링 배경 시각화 + 상태버튼 인터랙션

## Phase 3: 실제 데이터 연결 (핵심 백엔드)

- [ ] ⏳ `TSK-01` Task DB 스키마/마이그레이션 구현
- [ ] ⏳ `PRI-01` 중요도/우선순위 필드 및 유효성 검증 추가
- [ ] ⏳ `TSK-02` 일정 CRUD API 구현
- [ ] ⏳ `DDL-01` 마감 진행률 계산 유틸/도메인 로직 구현
- [ ] ⏳ `TMR-04` 세션 저장 API(`start/pause/complete`) 구현
- [ ] ⏳ `TMR-05` 앱 재진입 시 진행 세션 3초 내 복원
- [ ] ⏳ `TSK-06` 네트워크 실패 시 재시도 큐 처리

## Phase 4: 외부 연동 연결 (캘린더 실동작)

- [ ] ⏳ `CAL-01` 캘린더 연동 테이블/토큰 암호화 저장 구현
- [ ] ⏳ `CAL-02` Google OAuth 연결/해제 구현
- [ ] ⏳ `CAL-03` Apple Calendar 연결/해제 구현
- [ ] ⏳ `CAL-04` 수동 동기화 API + 15분 백그라운드 동기화 작업 구현
- [ ] ⏳ `CAL-05` 충돌 처리(최신 수정 우선) + 충돌 로그 저장 구현

## Phase 5: 검증/릴리스

- [ ] ⏳ `TMR-07` 타이머 상태 전이 단위/통합 테스트
- [ ] ⏳ `TSK-07` 일정 CRUD E2E 테스트 작성
- [ ] ⏳ `PRI-05` 중요도/우선순위 회귀 테스트 작성
- [ ] ⏳ `DDL-05` 경계값(59/60/84/85/100%) 테스트 작성
- [ ] ⏳ `CAL-08` 외부 캘린더 연동 통합 테스트 작성

## Phase 6: 모바일 앱 (최종 단계, 명시만)

- [ ] ⏳ `MOB-01` Flutter 모바일 앱 구현 (MVP 웹/백엔드 완료 후 마지막에 착수, 상세 Task는 추후 분해)

## 4. FR별 작업 단위 Task 체크리스트 (참조)

## FR-01 시각화 타이머

- [x] ✅ `TMR-01` FE: 원형 타이머 컴포넌트(`TimerCircle`) 구현
선행조건: 없음
- [x] ✅ `TMR-03` FE: 타이머 상태머신(store/reducer) 구현
선행조건: 없음
- [x] ✅ `TMR-02` FE: 타이머 제어 UI(`시작/일시정지/재개/종료/다음세션`) 구현
선행조건: `TMR-01`, `TMR-03`
- [x] ✅ `TMR-06` FE: 백그라운드 복귀 시 경과시간 보정 처리
선행조건: `TMR-03`
- [x] ✅ `TMR-08` FE: 타이머 이벤트 트래킹 연동
선행조건: `TMR-03`
- [ ] ⏳ `TMR-04` BE: 세션 저장 API(`start/pause/complete`) 구현
선행조건: DB 스키마
- [ ] ⏳ `TMR-05` FE/BE: 앱 재진입 시 진행 세션 3초 내 복원
선행조건: `TMR-03`, `TMR-04`
- [ ] ⏳ `TMR-07` QA: 타이머 상태 전이 단위/통합 테스트
선행조건: `TMR-01~06`

## FR-02 일정 등록/관리

- [x] ✅ `TSK-04` FE: 일정 목록/상태토글(시작/완료/리셋)/삭제 UI 구현
선행조건: 없음 (mock 데이터 허용)
- [x] ✅ `TSK-03` FE: 일정 생성/수정 모달(UI + 검증) 구현
선행조건: 없음 (mock 데이터 허용)
- [x] ✅ `TSK-05` FE: 검색 제거 + 필터/정렬 1줄 드롭다운 UI 구현
선행조건: `TSK-04`
- [x] ✅ `TSK-08` FE: `runState(READY/RUNNING/COMPLETED)` + `startedAt` 기반 시작 플로우 구현
선행조건: `TSK-04`, `DDL-02`
- [ ] ⏳ `TSK-01` BE: Task DB 스키마/마이그레이션 구현
선행조건: 없음
- [ ] ⏳ `TSK-02` BE: 일정 CRUD API 구현
선행조건: `TSK-01`
- [ ] ⏳ `TSK-06` FE/BE: 네트워크 실패 시 재시도 큐 처리
선행조건: `TSK-02`
- [ ] ⏳ `TSK-07` QA: 일정 CRUD E2E 테스트 작성
선행조건: `TSK-02~06`

## FR-03 중요도/우선순위 분리

- [x] ✅ `PRI-02` FE: 중요도 배지 UI 구현 (우선순위 입력 FE 제거 정책 반영)
선행조건: 없음 (mock 데이터 허용)
- [x] ✅ `PRI-03` FE: 인라인 수정 제거 + 편집 액션 기반 독립 수정 플로우 구현
선행조건: `PRI-02`
- [x] ✅ `PRI-04` FE: 중요도 기준 정렬/필터 옵션 추가
선행조건: `PRI-02`
- [ ] ⏳ `PRI-01` BE: 중요도/우선순위 필드 및 유효성 검증 추가
선행조건: `TSK-01`
- [ ] ⏳ `PRI-05` QA: 중요도/우선순위 회귀 테스트 작성
선행조건: `PRI-01~04`

## FR-04 마감 Progress Bar

- [x] ✅ `DDL-02` FE: 일정 카드 Progress Bar UI 구현
선행조건: `TSK-04`
- [x] ✅ `DDL-03` FE: 색상 규칙(녹/주/빨) + Overdue 상태 구현
선행조건: `DDL-02`
- [x] ✅ `DDL-04` FE: `마감까지 n일 n시간` 텍스트 렌더링 구현
선행조건: `DDL-02`
- [x] ✅ `DDL-06` FE: 진행률 색상 스케일 통일(최대값=`완료 버튼` 초록)
선행조건: `DDL-02`, `DDL-03`
- [ ] ⏳ `DDL-01` BE: 마감 진행률 계산 유틸/도메인 로직 구현
선행조건: `TSK-01`
- [ ] ⏳ `DDL-05` QA: 경계값(59/60/84/85/100%) 테스트 작성
선행조건: `DDL-01~04`

## FR-05 구글/애플 캘린더 연동

- [x] ✅ `CAL-06` FE: 연동 설정 화면(연결상태/마지막 동기화/동기화 버튼) 구현
선행조건: 없음 (mock 상태 허용)
- [x] ✅ `CAL-07` FE: 동기화 결과(성공/실패/충돌) 로그 UI 구현
선행조건: `CAL-06`
- [ ] ⏳ `CAL-01` BE: 캘린더 연동 테이블/토큰 암호화 저장 구현
선행조건: 없음
- [ ] ⏳ `CAL-02` BE: Google OAuth 연결/해제 구현
선행조건: `CAL-01`
- [ ] ⏳ `CAL-03` BE: Apple Calendar 연결/해제 구현
선행조건: `CAL-01`
- [ ] ⏳ `CAL-04` BE: 수동 동기화 API + 15분 백그라운드 동기화 작업 구현
선행조건: `CAL-02`, `CAL-03`
- [ ] ⏳ `CAL-05` BE: 충돌 처리(최신 수정 우선) + 충돌 로그 저장 구현
선행조건: `CAL-04`
- [ ] ⏳ `CAL-08` QA: 외부 캘린더 연동 통합 테스트 작성
선행조건: `CAL-01~07`

## 5. 함수 단위 Task 체크리스트 (가시화 우선 순서)

## 화면 가시화 공통 유틸

- [ ] ⏳ `FN-TMR-07` `formatRemainingTime(ms)`
- [ ] ⏳ `FN-DDL-02` `resolveProgressColor(progress)`
- [ ] ⏳ `FN-DDL-03` `formatTimeToDeadline(now, dueAt)`
- [ ] ⏳ `FN-DDL-04` `isOverdue(now, dueAt)`
- [ ] ⏳ `FN-DDL-05` `getUrgencyBucket(progress)`

## Timer 도메인

- [ ] ⏳ `FN-TMR-06` `calculateRemainingMs(now, startedAt, durationMs, pausedMs)`
- [ ] ⏳ `FN-TMR-01` `startPomodoroSession(userId, taskId, focusMin, breakMin)`
- [ ] ⏳ `FN-TMR-02` `pausePomodoroSession(sessionId, pausedAt)`
- [ ] ⏳ `FN-TMR-03` `resumePomodoroSession(sessionId, resumedAt)`
- [ ] ⏳ `FN-TMR-05` `skipToNextPhase(sessionId)`
- [ ] ⏳ `FN-TMR-09` `compensateElapsedAfterBackground(session, now)`
- [ ] ⏳ `FN-TMR-04` `completePomodoroSession(sessionId, endedAt)`
- [ ] ⏳ `FN-TMR-08` `rehydrateActiveSession(userId)`

## Task 도메인

- [ ] ⏳ `FN-TSK-01` `validateTaskPayload(payload)`
- [ ] ⏳ `FN-TSK-06` `listTasks(userId, query)`
- [ ] ⏳ `FN-TSK-02` `createTask(userId, payload)`
- [ ] ⏳ `FN-TSK-03` `updateTask(taskId, payload)`
- [x] ✅ `FN-TSK-05` `cycleTaskRunState(task, nowIso)`
- [x] ✅ `FN-TSK-09` `getTaskProgressPercent(task, now)`
- [ ] ⏳ `FN-TSK-04` `deleteTask(taskId)`
- [ ] ⏳ `FN-TSK-07` `enqueueFailedMutation(mutation)`
- [ ] ⏳ `FN-TSK-08` `flushMutationQueue()`

## Importance/Priority 도메인

- [ ] ⏳ `FN-PRI-01` `normalizeImportance(value)`
- [ ] ⏳ `FN-PRI-02` `normalizePriority(value)`
- [ ] ⏳ `FN-PRI-03` `updateTaskRankFields(taskId, importance, priority)`
- [ ] ⏳ `FN-PRI-04` `sortTasksByImportance(tasks, direction)`
- [ ] ⏳ `FN-PRI-05` `sortTasksByPriority(tasks, direction)`

## Deadline 도메인

- [ ] ⏳ `FN-DDL-01` `calculateDeadlineProgress(now, createdAt, dueAt)`
- [x] ✅ `FN-DDL-06` `getProgressPalette(percent)`

## Calendar Sync 도메인

- [ ] ⏳ `FN-CAL-01` `encryptIntegrationToken(token)`
- [ ] ⏳ `FN-CAL-02` `startGoogleOAuth(userId, redirectUri)`
- [ ] ⏳ `FN-CAL-03` `handleGoogleOAuthCallback(code)`
- [ ] ⏳ `FN-CAL-04` `startAppleCalendarConnect(userId)`
- [ ] ⏳ `FN-CAL-05` `refreshProviderToken(integrationId)`
- [ ] ⏳ `FN-CAL-06` `fetchProviderEvents(integrationId, range)`
- [ ] ⏳ `FN-CAL-07` `mapExternalEventToTask(event)`
- [ ] ⏳ `FN-CAL-08` `exportTaskToProvider(taskId, integrationId)`
- [ ] ⏳ `FN-CAL-09` `resolveCalendarConflict(local, remote)`
- [ ] ⏳ `FN-CAL-10` `runCalendarSync(integrationId)`
- [ ] ⏳ `FN-CAL-11` `scheduleRecurringSync(intervalMin)`
- [ ] ⏳ `FN-CAL-12` `recordSyncResult(integrationId, status, detail)`

## 6. 테스트 단위 Task 체크리스트

- [ ] ⏳ `QAT-01` Unit: `FN-TMR-*`, `FN-DDL-*` 경계값 테스트
- [ ] ⏳ `QAT-02` Integration: Task CRUD + 중요도/우선순위 + Progress 계산 통합 테스트
- [ ] ⏳ `QAT-03` Integration: 캘린더 동기화 성공/실패/충돌 시나리오 테스트
- [ ] ⏳ `QAT-04` E2E: 일정 생성 → 타이머 실행 → 완료 → 캘린더 동기화 시나리오
- [ ] ⏳ `QAT-05` Performance: 대시보드 로딩 2초, 타이머 60fps 목표 점검

## 7. 스프린트 체크리스트 (가시화 우선 6주)

- [x] ✅ Week 1 (보이는 화면): `TSK-04`, `TSK-03`, `PRI-02`, `DDL-02`, `DDL-03`, `DDL-04`, `TMR-01`, `TMR-03`, `TMR-02`
- [x] ✅ Week 2 (사용감): `TSK-05`, `PRI-03`, `PRI-04`, `TMR-06`, `TMR-08`, `CAL-06`, `CAL-07`, `UI-ALIGN-01`, `TSK-08`, `DDL-06`, `UI-ALIGN-02`
- [ ] ⏳ Week 3 (핵심 데이터 연결): `TSK-01`, `PRI-01`, `TSK-02`, `DDL-01`, `TMR-04`, `TMR-05`, `TSK-06`
- [ ] ⏳ Week 4 (캘린더 연결): `CAL-01`, `CAL-02`, `CAL-03`, `CAL-04`
- [ ] ⏳ Week 5 (동기화 완성): `CAL-05`, 안정화/버그 수정
- [ ] ⏳ Week 6 (QA/릴리스): `TMR-07`, `TSK-07`, `PRI-05`, `DDL-05`, `CAL-08`, `QAT-01~05`
- [ ] ⏳ Post-MVP 마지막 단계: `MOB-01` (Flutter 모바일 앱 구현, 상세 분해 추후)

## 8. 업데이트 로그

- [x] ✅ 2026-02-26: 체크리스트 포맷으로 문서 구조 개편
- [x] ✅ 2026-02-26: 가시화 우선(빠른 데모) 기준으로 태스크 순서 재배치
- [x] ✅ 2026-02-26: 기술 스택(웹/백엔드 Next.js, 모바일 Flutter 후속) 기준으로 문서 정렬 및 `MOB-01` 명시
- [x] ✅ 2026-02-26: Phase 1 착수 반영 (`Phase 1`/`Week 1` 상태를 `🚧`로 전환)
- [x] ✅ 2026-02-26: Phase 1 구현 완료 (TSK-04, TSK-03, PRI-02, DDL-02, DDL-03, DDL-04, TMR-01, TMR-03, TMR-02)
- [x] ✅ 2026-02-26: Phase 2 프론트 구현 완료 (TSK-05, PRI-03, PRI-04, TMR-06, TMR-08, CAL-06, CAL-07)
- [x] ✅ 2026-02-26: 함수단위 체크리스트 운영 원칙 추가 (Phase 1~2 선택, Phase 3+ 필수)
- [x] ✅ 2026-02-26: `ui.md` 홈화면 정합화 리팩터 적용 (`UI-ALIGN-01`, 타임바/필터행/카드액션/캘린더 접기)
- [x] ✅ 2026-02-26: 홈 UI 2차 정합화 반영 (`UI-ALIGN-02`, sticky 타이틀바, 날짜포맷 확장, 링 배경 시각화)
- [x] ✅ 2026-02-26: 일정 실행상태 3단계 도입 (`TSK-08`, READY/RUNNING/COMPLETED, startedAt 기반 진행률)
- [x] ✅ 2026-02-26: 진행률 색상 통일 반영 (`DDL-06`, 최대 초록값=완료 버튼 초록 `#2f7e55`)
- [x] ✅ 2026-02-26: 사용자 요청으로 FE 우선순위 입력/표시 제거, 중요도 중심 UX로 보정 (`PRI-02` 문구 갱신)
