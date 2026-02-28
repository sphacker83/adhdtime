# KPI_PIPELINE

Last Updated: 2026-02-28  
Source of Truth: `features/mvp/lib/kpi.ts`, `features/mvp/lib/events.ts`, `features/mvp/lib/storage.ts`

## 1) 목적

MVP 핵심 KPI를 이벤트 로그에서 일관되게 계산하고, 스탯 탭 및 릴리즈 게이트에서 동일한 규칙으로 재사용하기 위한 운영 기준 문서다.

## 2) 입력 이벤트 계약

필수 이벤트 목록(코드 상수와 동일):

- `task_created`
- `mission_generated`
- `mission_started`
- `mission_paused`
- `mission_completed`
- `mission_abandoned`
- `remission_requested`
- `reschedule_requested`
- `xp_gained`
- `level_up`
- `haptic_fired`
- `safety_blocked`

공통 필드:

- `eventName`
- `timestamp` (ISO8601)
- `sessionId`
- `taskId` (nullable)
- `missionId` (nullable)
- `source` (`local` | `ai` | `system` | `user`)
- `meta` (옵션)

## 3) 파이프라인 단계

1. 이벤트 생성: `createEvent`로 표준 스키마 생성  
2. 큐 적재: `appendEvent`로 최대 400개 유지(최신 우선)  
3. 저장/복원: `savePersistedState` / `loadPersistedState`로 로컬 저장  
4. 계산: `computeMvpKpis(events)`에서 정렬/집계  
5. 표시: 스탯 탭 KPI 카드(`MVP KPI 스냅샷`)에 렌더링  
6. 게이트 검증: `scripts/verify-release-gate.mjs`에서 계산 가능성/필수 이벤트 정의 확인

## 4) KPI 산식

### 4.1 Activation Rate

- 분모: 유효 timestamp를 가진 `sessionId` 수
- 분자: 세션 첫 이벤트 시각부터 24시간 내 `mission_completed`가 1회 이상 있는 세션 수
- 공식: `activation = 분자 / 분모 * 100`

### 4.2 Time to Start

- 표본: `task_created(taskId)`와 동일 `taskId`의 첫 `mission_started`가 모두 존재하고, 시작시각 >= 생성시각인 과업
- 값: 각 과업 `(firstMissionStartedAt - taskCreatedAt)`의 평균(ms)
- 표시: `averageTimeToStartMs`, `averageTimeToStartSeconds`

### 4.3 Mission Completion Rate

- 분모: `mission_generated.meta.missionCount`의 합  
  - 규칙: 음수/NaN/누락은 0 처리, 소수는 내림
- 분자: `mission_completed` 이벤트 수
- 공식: `completion = 분자 / 분모 * 100`

### 4.4 Recovery Rate

- 분모: `mission_abandoned` 이벤트가 1회 이상 있는 `taskId` 수
- 분자: 같은 `taskId`에서 abandon 시각 이후 24시간 내 `remission_requested` 또는 `reschedule_requested`가 1회 이상 있는 과업 수
- 공식: `recovery = 분자 / 분모 * 100`

### 4.5 D1 / D7 Retention

- 기준시각(anchor): 단일 사용자 이벤트 타임라인의 최초 이벤트 시각
- D1 분자: `[기준+1일, 기준+2일)` 구간에 이벤트가 1회 이상 있으면 1, 없으면 0
- D7 분자: `[기준+7일, 기준+8일)` 구간에 이벤트가 1회 이상 있으면 1, 없으면 0
- 분모: 유효 timestamp 이벤트가 1개 이상이면 1, 없으면 0
- 공식: `retention = 분자 / 분모 * 100`

## 5) 샘플링/집계 정책

- 이벤트 정렬: `timestamp` 오름차순 정렬 후 계산
- timestamp 파싱 실패 이벤트: 집계에서 제외
- 분모가 0인 비율 KPI: `value = null` 반환
- 큐 상한: 최근 400개 이벤트만 유지 (`appendEvent`)
- 세션 단위: Activation 및 `samples.sessions`는 `sessionId` 기준
- 사용자 단위: D1/D7은 세션과 무관하게 단일 사용자 타임라인 기준
- 과업 단위: `taskId` 기준
- 표본 정보(`samples`) 동시 제공:
  - `sessions`, `tasksCreated`, `tasksStarted`, `tasksAbandoned`, `generatedMissions`, `completedMissions`

## 6) 이벤트 커버리지 정책

- `eventCoverage[eventName]`로 필수 이벤트별 관측 여부(boolean) 제공
- 커버리지는 “관측 여부”만 표현하며, 이벤트 품질/빈도 보장은 별도 검증 대상

## 7) 품질 보장 장치

- 단위 테스트:
  - `features/mvp/lib/kpi.test.ts`
  - `features/mvp/lib/timer-accuracy.test.ts`
- 게이트 스크립트:
  - `scripts/verify-release-gate.mjs`
  - 체크 항목:
    - 필수 이벤트 정의 일치
    - KPI 계산 가능성
    - KPI 수치 유효성 (NaN/Infinity/음수/퍼센트 범위 0~100)
    - 빈 입력 null 안전성

## 8) 운영 주의사항

- 로컬 큐 400개 상한으로 인해 장기 분석에는 데이터 손실 가능성이 있다.
- `mission_generated.meta.missionCount` 누락 시 Completion Rate 분모가 낮아질 수 있다.
- D1/D7은 세션 경계를 보지 않고 사용자 최초 이벤트 기준 윈도우로 집계된다.
