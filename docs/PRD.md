# ADHDTime PRD (MVP 정합본)

문서 버전: v3.1  
작성일: 2026-02-28  
연계 문서: `docs/USECASE.md`, `docs/DEVELOPMENT_PLAN.md`, `docs/ui.png`  
대상: **Next.js 기반 모바일 우선 웹앱** MVP

---

## 1. 제품 정의

ADHDTime은 사용자가 과업을 직접 등록하고 총소요시간(`totalMinutes`)을 먼저 정한 뒤, 이를 작은 실행 청크로 분해해 타이머/보상/복귀 루프로 실행 지속을 돕는 ADHD 친화형 실행 보조 앱이다.

핵심 루프는 아래 5단계로 정의한다.

1. 과업 등록(`totalMinutes` 포함)
2. 청킹
3. 실행(타이머 + 실행 중 빠른 시간 조정)
4. 보상(스탯/XP)
5. 복귀(과업 재일정/재청킹)

---

## 2. 목표와 KPI

### 2.1 제품 목표

- 사용자가 과업 등록 후 빠르게 첫 청크를 시작하고 완료하도록 만든다.
- 중단/미완료를 이탈이 아닌 복귀 행동으로 전환한다.
- 계획 시간(`totalMinutes`)과 실제 실행 시간을 지속적으로 맞춰간다.

### 2.2 MVP KPI (측정 필수)

- Activation: 첫 방문 24시간 내 첫 청크 완료율
- Time to Start: 청크 생성 후 시작 버튼 클릭까지 평균 시간
- Chunk Completion Rate: 생성 청크 대비 완료 비율
- Recovery Rate: 미완료 후 24시간 내 재일정/재청킹 실행 비율
- Time Budget Fit: `sum(chunks.estMinutes) > task.totalMinutes` 위반률
- D1/D7 Retention

주의: MVP 단계에서는 KPI를 **반드시 수집**하고, 절대 목표치는 베타 데이터 2주 축적 후 확정한다.

---

## 3. 범위 정의

### 3.1 MVP 포함 범위 (P0)

1. 홈 화면: 상태 카드, 입력 영역, 오늘의 퀘스트
2. 과업 직접 등록: 텍스트 + `totalMinutes` + 선택 일정(`scheduledFor`, `dueAt`)
3. 하이브리드 청킹: 로컬 패턴 우선 + AI 폴백(`totalMinutes` 제약 준수)
4. 청크 편집/삭제 및 순서 재정렬
5. 시간 수정 정책: 실행 전/중 과업/청크 시간 편집 규칙
6. 타이머: 시작/일시정지/재개/완료 + 실행 중 청크 빠른 `+/-` 조정
7. 5분 미세 햅틱(앱 활성 상태) + 설정 ON/OFF
8. 보상: XP/레벨/5스탯 즉시 반영
9. 리포트: 오늘 완료 수, 완료율, 스탯 변화
10. 복귀 루프(기본): 과업 전체 재일정 + 재청킹 최소 동선
11. 이벤트 로깅: 핵심 행동 이벤트 저장
12. 시간 필드 정합성: `createdAt`, `scheduledFor`, `startedAt`, `dueAt`, `completedAt`
13. 프라이버시/안전 최소요건: 원문 장기 저장 최소화, 위험 입력 차단

### 3.2 v1 범위 (P1)

- 음성 입력 실제 인식(STT)
- 로컬 알림(시작/종료)
- 복귀 UX 고도화(사유 기반 추천, 자동 재배치)
- 구독 기반 기능 게이트
- 클라우드 동기화(선택)

### 3.3 제외 범위 (이번 턴)

- 소셜/레이드/랭킹
- 클리닉(B2B) 대시보드 구현
- 의료 규제 대응 기능

---

## 4. UX 원칙

- 비난/실패 중심 문구 금지, 조정/복귀 중심 언어 사용
- 첫 청크 시작까지 마찰 최소화(탭 수/인지 부하 최소화)
- 보상 피드백은 즉시, 과도하지 않게 제공
- 복귀 동선은 “다시 시작 가능함”을 명확히 전달
- 실행 중 시간 조정은 상세 편집 화면 이동 없이 1탭으로 수행 가능해야 한다.

---

## 5. 기능 요구사항 (Functional Requirements)

### FR-01 과업 직접 등록 + 총시간 설정 (P0)

- 설명: 텍스트로 과업을 직접 등록하고 `totalMinutes`를 설정한다.
- AC
  - `title`, `totalMinutes` 입력만으로 Task 생성 가능
  - `totalMinutes` 허용 범위는 10~480
  - `scheduledFor`, `dueAt`는 선택 입력
  - 입력 실패 시 재시도 동선 1탭 이내

### FR-02 하이브리드 청킹 (P0)

- 설명: 로컬 매칭 우선, 실패 시 AI 호출로 청크를 생성한다.
- AC
  - 로컬 성공 시 즉시 결과 표시
  - AI 호출 시 로딩 상태 표시
  - 로컬/AI 결과 스키마 동일
  - `sum(chunks.estMinutes) <= task.totalMinutes` 제약을 반드시 만족
  - 제약 위반 시 저장/적용 차단 및 수정 가이드 표시

### FR-03 청크 편집/삭제 (P0)

- 설명: 생성된 청크를 수정/삭제한다.
- AC
  - 3탭 이내 편집 완료
  - 삭제 시 순서 재정렬
  - `estMinutes` 편집 허용 범위는 2~15
  - 편집 결과는 항상 `sum(chunks.estMinutes) <= task.totalMinutes`를 만족

### FR-04 퀘스트 리스트/현재 청크 강조 (P0)

- 설명: 오늘의 청크 리스트 표시 및 현재 청크 확장
- AC
  - 완료/미완료 즉시 반영
  - 현재 청크에 시작 CTA 항상 노출

### FR-05 타이머 + 실행 중 빠른 시간 조정 (P0)

- 설명: 시작/일시정지/재개/완료 가능한 청크 타이머와 실행 중 `+/-` 시간을 제공한다.
- AC
  - 실행 중 시간 감소가 안정적
  - 실행 중 현재 청크 카드에서 `-1분`, `+1분` 1탭 조정 제공
  - 빠른 조정도 `estMinutes`(2~15)와 `totalMinutes` 제약을 위반하지 않음
  - 완료 후 다음 청크로 1탭 전환

### FR-06 5분 미세 햅틱 (P0)

- 설명: 타이머 실행 중 5분 간격 진동
- AC
  - 설정에서 ON/OFF 가능
  - 미지원 환경은 조용히 폴백

### FR-07 보상/성장 (P0)

- 설명: 행동 이벤트를 XP/스탯에 반영
- AC
  - 완료 직후 XP 반영
  - 레벨업 시 즉시 피드백
  - 상태 카드 즉시 업데이트

### FR-08 리포트 (P0)

- 설명: 일간 성과 요약 표시
- AC
  - 완료 수, 완료율, 스탯 변화 제공
  - 5초 내 파악 가능한 레이아웃

### FR-09 복귀 루프 기본 (P0)

- 설명: 미완료 시 과업 전체 재일정 또는 재청킹 동선을 제공한다.
- AC
  - 재일정 또는 재청킹 중 1개를 2탭 이내로 실행 가능
  - 재일정은 **청크 단위가 아닌 Task 단위**로만 수행
  - 재일정 시 `task.scheduledFor`를 갱신하고 미완료 청크를 함께 이동
  - 복귀 행동 시 회복력 스탯 보상 지급
  - 비난형 카피 금지

### FR-10 알림 (P1)

- 설명: 시작/종료 알림
- AC
  - 설정에서 ON/OFF 가능
  - 권한 거부 시 안내 문구 제공

### FR-11 시간 수정 정책 (과업/청크) (P0)

- 설명: 실행 전/중 상태별 시간 편집 가능 범위를 고정한다.
- AC
  - 실행 전(`task.status=todo`)에는 `task.totalMinutes`, `chunk.estMinutes` 폼 편집 허용
  - 실행 중(청크 `running` 또는 `paused`)에는 현재 청크의 빠른 `+/-`만 허용
  - 실행 중에는 `task.totalMinutes` 증가만 허용, 감소는 차단
  - 실행 중 직접 입력형 청크 시간 편집 시도 시 빠른 조정 UX로 유도

### FR-12 시간 필드 정합성 (date...At) (P0)

- 설명: 일정/실행/완료 시각 필드의 의미와 전이 규칙을 통일한다.
- AC
  - 시간 필드는 ISO 8601 UTC 문자열로 저장
  - `createdAt`은 생성 시 1회 기록 후 불변
  - `scheduledFor`는 사용자 재일정 시 갱신 가능
  - `completedAt`은 status=`done`일 때만 존재
  - `scheduledFor`와 `dueAt`가 함께 존재하면 `scheduledFor <= dueAt`를 강제

---

## 6. 데이터 모델 (MVP)

```ts
type Task = {
  id: string;
  title: string;
  summary?: string; // rawInput 장기 저장 대신 요약 저장
  totalMinutes: number; // 10~480
  createdAt: string;
  scheduledFor?: string; // 사용자가 계획한 실행 시각
  startedAt?: string; // 첫 청크가 시작된 시각
  dueAt?: string; // 사용자 지정 마감 시각
  completedAt?: string;
  status: "todo" | "in_progress" | "done" | "archived";
};

type Chunk = {
  id: string;
  taskId: string;
  order: number;
  action: string;
  estMinutes: number; // 2~15
  status: "todo" | "running" | "paused" | "done" | "abandoned" | "archived";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  actualSeconds?: number;
  parentChunkId?: string; // 재청킹으로 생성된 경우 원본 chunk
};

type TimerSession = {
  id: string;
  chunkId: string;
  state: "running" | "paused" | "ended";
  startedAt: string;
  pausedAt?: string;
  endedAt?: string;
  pauseCount: number;
};

type StatsSnapshot = {
  date: string;
  initiation: number;
  focus: number;
  breakdown: number;
  recovery: number;
  consistency: number;
  xp: number;
  level: number;
};
```

### 6.1 시간 필드 정합 규칙

- 공통 저장 형식: UTC 기준 ISO 8601 문자열(`YYYY-MM-DDTHH:mm:ss.sssZ`)
- `createdAt`: 엔티티 생성 시점(불변)
- `scheduledFor`: 사용자 계획 실행 시점(Task 단위, 재일정 시 갱신)
- `startedAt`: 실제 실행 시작 시점(Task은 첫 청크 시작, Chunk는 해당 청크 시작)
- `dueAt`: 사용자 지정 마감 시점(선택)
- `completedAt`: 완료 확정 시점(status=`done` 조건에서만 존재)
- 재일정은 Task의 `scheduledFor`만 수정하며, Chunk 단독 일정 필드는 두지 않는다.

---

## 7. 청킹 출력 계약 (로컬/AI 공통)

```json
{
  "taskId": "uuid",
  "title": "방 청소",
  "context": "원문 요약",
  "totalMinutes": 45,
  "chunks": [
    {
      "chunkId": "uuid",
      "order": 1,
      "action": "바닥에 있는 옷을 바구니에 넣기",
      "estMinutes": 5,
      "difficulty": 1,
      "notes": "5분만 시도"
    }
  ],
  "safety": {
    "requiresCaution": false,
    "notes": ""
  }
}
```

스키마 룰:

- `chunks.length`: 5~12 권장
- `action`: 행동 동사로 시작
- `estMinutes`: 2~15
- `sum(chunks.estMinutes) <= totalMinutes`
- 위험 입력 탐지 시 `requiresCaution=true` 또는 생성 차단

---

## 8. 이벤트 택소노미 (MVP 필수)

필수 이벤트:

- `task_created`
- `task_time_updated`
- `task_rescheduled`
- `chunk_generated`
- `chunk_edited`
- `chunk_time_adjusted`
- `chunk_started`
- `chunk_paused`
- `chunk_completed`
- `chunk_abandoned`
- `rechunk_requested`
- `xp_gained`
- `level_up`
- `haptic_fired`
- `safety_blocked`

공통 필드:

- `eventName`
- `timestamp`
- `sessionId`
- `taskId` (해당 시)
- `chunkId` (해당 시)
- `source` (`local` | `ai` | `system` | `user`)

---

## 9. 비기능 요구사항

- 성능: 홈 최초 로딩 후 주요 상호작용 100ms 내 반응 목표
- 안정성: 타이머 상태 꼬임(중복 실행, 음수 시간) 0건
- 정확도: 10분 세션 기준 타이머 드리프트 ±2초 이내
- 접근성: 주요 CTA 엄지 영역 배치, 대비/폰트 가독성 확보
- 오프라인: 로컬 저장 기반으로 핵심 루프 동작

---

## 10. 프라이버시 및 안전

- 원문 입력(raw text) 장기 저장 금지, 요약/구조화 데이터만 저장
- 민감 정보 동의는 옵트인
- 위험 입력(자해/불법) 감지 시 생성 차단 및 안전 안내
- 안전 차단/폴백 동작도 이벤트로 기록

---

## 11. 릴리즈 게이트 (MVP)

1. 과업 등록 시 `title`, `totalMinutes` 필수값 검증이 동작한다.
2. 청킹 결과가 10초 내 표시되고 `sum(chunks.estMinutes) <= totalMinutes`를 보장한다.
3. 첫 청크 시작까지 3탭 이내이며, 온보딩 첫 시작은 3분 내 가능하다.
4. 타이머 시작/일시정지/재개/완료 상태 전이가 안정적이며 실행 중 `+/-` 조정이 정상 동작한다.
5. 5분 햅틱 ON/OFF가 설정대로 동작한다.
6. 완료 보상과 상태 카드 업데이트가 즉시 반영된다.
7. 미완료 흐름에서 과업 재일정/재청킹 중 하나로 2탭 이내 복귀 가능하다.
8. 과업 재일정이 청크 단위가 아닌 Task 단위로 동작한다.
9. 핵심 이벤트 로그 누락이 없다.
10. rawInput 장기 저장이 발생하지 않는다.
11. `createdAt/scheduledFor/startedAt/dueAt/completedAt` 정합 규칙을 위반하지 않는다.

---

## 12. 결정 고정 사항 (MVP)

1. 플랫폼: Next.js 기반 모바일 우선 웹앱
2. 저장: 로컬 우선(IndexedDB/LocalStorage) + 추후 서버 확장
3. AI 전략: 로컬 패턴 우선, AI 폴백
4. 기본 알림 전략: MVP는 앱 활성 중 햅틱 중심, 시스템 알림은 P1
5. 음성 입력: MVP는 UI 슬롯만, 실제 STT는 P1
6. 문구 원칙: 실패 대신 조정/복귀 중심 언어 사용
7. 재일정 정책: 청크 단위 재일정은 미지원, Task 단위 재일정만 지원
8. 시간 필드 원칙: 실행 시각은 `*At`, 계획 시각은 `scheduledFor`로 통일
