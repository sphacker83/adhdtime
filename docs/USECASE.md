# ADHDTime Use Case 명세 (MVP/v1)

문서 버전: v2.1  
작성일: 2026-02-28  
기준 문서: `docs/PRD.md` v3.1

---

## 1. 목적과 범위

이 문서는 PRD의 기능 요구사항을 사용자 시나리오 관점으로 구체화한다.

- MVP(P0): UC-01 ~ UC-08
- v1(P1): UC-09 ~ UC-10

---

## 2. 액터

- User: 앱 사용자
- App: Next.js 웹앱 클라이언트
- AI Chunking Service: AI 폴백 청킹 서비스(옵션)

---

## 3. 공통 상태 정의

### 3.1 Task 상태

- `todo`
- `in_progress`
- `done`
- `archived`

### 3.2 Chunk 상태

- `todo`
- `running`
- `paused`
- `done`
- `abandoned`
- `archived`

### 3.3 TimerSession 상태

- `running`
- `paused`
- `ended`

### 3.4 시간 필드 규칙

- `createdAt`: 생성 시점(불변)
- `scheduledFor`: Task 계획 실행 시점(재일정 시 갱신)
- `startedAt`: 실제 시작 시점
- `dueAt`: 선택 마감 시점
- `completedAt`: 완료 시점(status=`done`에서만 존재)

---

## 4. Use Case

## UC-01 과업 직접 등록 + 총시간 설정 (FR-01, FR-12)

목적: 청킹 이전에 과업과 시간 예산(`totalMinutes`)을 명확히 등록한다.

- Actor: User, App
- Precondition: 앱 실행 상태
- Trigger: 사용자가 "과업 추가" 실행

Main Flow

1. User가 `title`, `totalMinutes`를 입력한다.
2. 필요 시 `scheduledFor`, `dueAt`를 입력한다.
3. App이 입력 유효성을 검사한다.
4. App이 Task를 생성하고 목록에 표시한다.
5. App이 "쪼개기" CTA를 노출한다.

Alternate / Exception

- A1: `totalMinutes` 범위 이탈(10~480) -> 저장 차단 + 오류 표시
- A2: `scheduledFor > dueAt` -> 저장 차단 + 오류 표시

Postcondition

- Task 1개 생성(status=`todo`)
- `createdAt` 기록

AC

- 필수 입력 2개(`title`, `totalMinutes`)만으로 저장 가능
- 저장 후 1탭 이내 청킹 진입 가능

---

## UC-02 등록 과업 청킹 생성 (FR-02)

목적: 등록된 과업을 실행 가능한 청크로 변환한다.

- Actor: User, App, AI(optional)
- Precondition: Task 존재, `totalMinutes` 설정 완료
- Trigger: 사용자가 "쪼개기" 실행

Main Flow

1. App이 로컬 패턴 매칭을 시도한다.
2. 로컬 성공 시 청크를 즉시 생성/표시한다.
3. 로컬 실패 시 AI 폴백 호출 후 결과를 표시한다.
4. App이 첫 청크를 현재 퀘스트로 강조한다.

Alternate / Exception

- A1: 네트워크 없음 -> 로컬 템플릿 폴백
- A2: AI 실패/타임아웃 -> 로컬 템플릿 폴백 + 재시도 버튼
- A3: `sum(chunks.estMinutes) > task.totalMinutes` -> 생성 차단 + 시간 조정 가이드
- A4: 위험 입력 감지 -> 생성 차단 + 안전 안내 + `safety_blocked` 이벤트 기록

Postcondition

- Chunk N개 생성(status=`todo`)

AC

- 청크는 행동 동사로 시작
- `chunks.length` 5~12 권장
- `estMinutes` 2~15
- `sum(chunks.estMinutes) <= task.totalMinutes`
- 10초 내 결과 표시(네트워크+폴백 포함)

---

## UC-03 청크 수정/삭제 + 시간 수정 정책 (FR-03, FR-11)

목적: 사용자가 상황에 맞게 시간을 조정하되 실행 상태에 맞는 편집 제약을 유지한다.

- Actor: User, App
- Precondition: Task/Chunk 존재
- Trigger: 사용자가 시간 또는 청크 편집 실행

Main Flow (실행 전)

1. User가 `task.totalMinutes` 또는 `chunk.estMinutes`를 수정한다.
2. App이 제약(`estMinutes` 범위, 청크 합<=총시간)을 검증한다.
3. User 저장 후 App이 리스트를 즉시 갱신한다.

Main Flow (실행 중)

1. User가 실행 중 청크 시간 조정을 시도한다.
2. App이 상세 입력 편집을 차단하고 빠른 `+/-` 조정을 노출한다.
3. User가 빠른 조정을 수행하면 App이 즉시 반영한다.

Alternate

- A1: 삭제 시 `order` 재정렬
- A2: `estMinutes` 범위 이탈(2~15) 시 오류 표시
- A3: `sum(chunks.estMinutes) > task.totalMinutes` 시 저장 차단
- A4: 실행 중 `task.totalMinutes` 감소 시도 시 차단(증가만 허용)

Postcondition

- Chunk가 업데이트 또는 삭제된다.
- 시간 정책 위반 없는 상태로 저장된다.

AC

- 3탭 이내 편집 완료
- 실행 중에는 현재 청크 빠른 `+/-`만 허용
- 삭제 후 현재 청크/리스트 동작 정상

---

## UC-04 청크 타이머 시작/일시정지/재개/완료 + 빠른 +/- (FR-05)

목적: 청크 실행 상태를 안정적으로 관리하고 진행 중 시간 조정을 빠르게 제공한다.

- Actor: User, App
- Precondition: Chunk status=`todo`
- Trigger: 시작 버튼

Main Flow

1. User가 시작을 누른다.
2. App이 TimerSession(state=`running`)을 생성한다.
3. 진행 UI와 남은 시간을 표시한다.
4. User가 일시정지/재개를 수행할 수 있다.
5. User가 필요 시 `-1분`, `+1분` 버튼으로 시간을 빠르게 조정한다.
6. User가 완료를 누르면 Chunk status=`done`으로 전환한다.
7. 다음 청크를 현재 퀘스트로 자동 제안한다.

Alternate / Exception

- A1: 백그라운드 전환 -> 복귀 시각 기준 재계산 정책 적용
- A2: 실행 중 다른 청크 선택 -> 기존 세션 종료 후 새 세션 시작
- A3: 빠른 조정 결과가 제약(2~15, 총시간) 위반 시 차단
- A4: 중도 포기 -> UC-07으로 연결

Postcondition

- 완료 청크의 `actualSeconds` 기록
- 보상 트리거 발생

AC

- 타이머 1초 단위 안정 동작
- 음수 시간/중복 실행 없음
- 빠른 시간 조정은 1탭 동작
- 완료 후 다음 청크 1탭 이동

---

## UC-05 5분 미세 햅틱 (FR-06)

목적: 시간 감각을 주기적으로 환기한다.

- Actor: App
- Precondition: TimerSession=`running`, 설정 ON
- Trigger: 5분 경과

Main Flow

1. App이 5분마다 미세 햅틱을 실행한다.
2. `haptic_fired` 이벤트를 기록한다.

Alternate

- A1: 미지원 환경 -> 무동작 또는 조용한 폴백

AC

- 설정 ON/OFF 즉시 반영
- 과도한 강도/빈도 금지

---

## UC-06 보상/스탯 반영 (FR-07)

목적: 실행 행동을 즉시 강화로 연결한다.

- Actor: App
- Precondition: `chunk_completed` 또는 복귀 행동 발생
- Trigger: 보상 대상 이벤트 발생

Main Flow

1. XP를 계산한다.
2. 5스탯(시작력/몰입력/분해력/회복력/지속력)을 갱신한다.
3. 레벨업 조건 충족 시 `level_up` 처리한다.
4. 상태 카드를 즉시 갱신한다.

AC

- 보상 노출 지연 체감 없음
- MVP 산식은 단순하지만 일관적

---

## UC-07 미완료/중단 -> 과업 재일정 또는 재청킹 (FR-09)

목적: 실패를 복귀 행동으로 전환한다.

- Actor: User, App, AI(optional)
- Precondition: Chunk가 `running` 중 중단되었거나 장시간 미완료
- Trigger: 사용자가 "다시 시작" 계열 CTA 선택

Main Flow (과업 재일정)

1. App이 과업 재일정 옵션을 제안한다.
2. User가 새로운 `scheduledFor`를 선택한다.
3. App이 Task의 `scheduledFor`를 갱신한다.
4. App이 미완료 청크를 과업과 함께 이동 처리한다.
5. 회복력 보상을 반영한다.

Main Flow (재청킹)

1. User가 "더 작게 쪼개기"를 선택한다.
2. App이 새 청크를 생성한다(로컬 우선, 필요 시 AI).
3. 기존 청크를 `archived` 처리하고 새 청크에 `parentChunkId`를 기록한다.
4. 회복력/분해력 보상을 반영한다.

AC

- 재일정/재청킹 중 1개를 2탭 이내 실행 가능
- 재일정은 Task 단위로만 수행(청크 단위 재일정 미지원)
- 비난형 문구 금지
- 재청킹 결과도 표준 스키마 + 총시간 제약 준수
- 수행 즉시 다음 실행 CTA 제공

---

## UC-08 일간 리포트 확인 (FR-08)

목적: 사용자가 오늘의 성취를 빠르게 확인한다.

- Actor: User, App
- Precondition: 최소 1개 이벤트 발생
- Trigger: 스탯(리포트) 화면 진입

Main Flow

1. App이 완료 수/완료율/스탯 변화를 요약 표시한다.
2. App이 다음 행동 CTA를 제공한다.

AC

- 5초 내 이해 가능한 요약
- 자책 유발 카피 금지

---

## UC-09 알림 (P1, FR-10)

목적: 시작/종료 시점을 OS 알림으로 안내한다.

- Actor: User, App
- Precondition: 알림 권한 허용, 설정 ON
- Trigger: 시작/종료 이벤트

AC

- ON/OFF 정상 동작
- 권한 거부 시 대체 안내 제공

---

## UC-10 외부 동기화 (P1)

목적: 앱 내 작업을 외부 일정/태스크와 동기화한다.

- Actor: User, App, External API
- Precondition: OAuth 연결 및 동기화 설정 ON
- Trigger: 수동/자동 동기화

AC

- 기본 동기화 범위 제한(예: 7일)
- 충돌 정책(우선순위/병합) 명시

---

## 5. 릴리즈 게이트 매핑 (MVP)

1. UC-01: `title`, `totalMinutes` 필수 검증
2. UC-02: 청킹 10초 이내 + 총시간 제약 준수
3. UC-02/04: 첫 청크 시작 3탭 이내, 첫 시작 3분 이내
4. UC-04: 타이머 상태 꼬임 없음 + 실행 중 빠른 `+/-` 정상
5. UC-05: 햅틱 ON/OFF 정상
6. UC-06: 보상 즉시 반영
7. UC-07: 복귀 동선 2탭 이내
8. UC-07: 과업 단위 재일정 정책 준수
9. UC-01~08: 핵심 이벤트 누락 없음
10. UC-01: rawInput 장기 저장 없음
11. UC-01/07: 시간 필드 정합 규칙 준수
