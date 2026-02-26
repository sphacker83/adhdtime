# ADHD 타이머 앱 개발기획서 (MVP)

- 문서 버전: v1.0
- 작성일: 2026-02-26
- 문서 목적: ADHD 사용자 대상 타이머/일정관리 앱의 MVP 구현을 위한 개발 기준 정의

## 1. 프로젝트 개요

### 1.1 문제 정의
ADHD 사용자는 시간의 흐름 체감이 어렵고, 우선순위 판단 및 일정 마감 관리에서 반복적으로 어려움을 겪는다. 기존 타이머/캘린더 앱은 기능은 많지만 집중 유지와 시각적 피드백에 최적화되지 않은 경우가 많다.

### 1.2 제품 목표
- 시간 체감 강화: 원형 시각화 타이머로 남은 시간을 직관적으로 인지
- 실행 우선순위 명확화: 중요도와 우선순위를 분리하여 의사결정 부담 감소
- 마감 압박 가시화: 일정별 마감 진행률 표시로 지연 위험 조기 인지
- 기존 생태계 연결: 구글/애플 캘린더 연동으로 기존 일정 흐름과 통합

### 1.3 타겟 사용자
- 1차: 성인 ADHD 진단/의심 사용자 중 자기주도 일정관리가 필요한 직장인/학생
- 2차: 집중시간 관리가 필요한 일반 사용자

## 2. MVP 범위

### 2.1 필수 기능 (요구사항 반영)
1. 시각화 타이머 (뽀모도로, 원형 남은시간 표시)
2. 일정 등록/수정/삭제/완료 관리
3. 일정별 중요도/우선순위 분리 입력
4. 일정 마감 남은시간 Progress Bar
5. 구글/애플 캘린더 연동

### 2.2 MVP 제외 범위
- 팀 협업 기능(공유 보드, 멀티 유저 편집)
- AI 자동 일정 추천
- 웨어러블/음성비서 연동

## 3. 핵심 사용자 플로우

1. 사용자가 오늘 할 일을 등록한다.
2. 각 일정에 중요도(높음/중간/낮음)와 우선순위(1~5)를 설정한다.
3. 타이머를 시작하여 집중 세션을 진행한다.
4. 일정 카드에서 마감 Progress Bar로 위험 일정을 식별한다.
5. 외부 캘린더(구글/애플) 동기화 후 일정 충돌을 확인한다.

## 4. 기능 상세 명세

### 4.1 시각화 타이머
- 기본 뽀모도로 프리셋: 집중 25분 / 휴식 5분
- 커스텀 설정: 집중/휴식 시간 변경 가능
- UI: 원형 진행바(남은시간), 남은 분:초 숫자 표시
- 상태: 시작/일시정지/재개/건너뛰기/종료
- 세션 기록: 시작시각, 종료시각, 실제 집중시간, 중단 횟수
- 접근성: 소리/진동/시각 알림 옵션

### 4.2 일정 등록/관리
- 일정 속성: 제목, 설명, 시작일시, 마감일시, 완료여부, 태그(선택)
- 뷰: 오늘/이번주 기본 리스트 뷰
- 정렬: 우선순위순, 마감임박순, 생성순
- 필터: 완료/미완료, 중요도, 캘린더 출처(로컬/구글/애플)

### 4.3 중요도 / 우선순위
- 중요도(Importance): 업무 영향도 기준, `High/Medium/Low`
- 우선순위(Priority): 실행 순서 기준, `1~5` (1이 가장 우선)
- 규칙: 중요도와 우선순위는 독립 필드로 저장
- UI: 일정 카드에 배지 + 숫자 표시

### 4.4 마감 Progress Bar
- 목적: 마감까지의 시간 소진률 가시화
- 계산식:
  - `elapsedRatio = (현재시각 - 생성시각) / (마감시각 - 생성시각)`
  - 0~100%로 clamp
- 시각 규칙:
  - 0~59%: 녹색
  - 60~84%: 주황
  - 85~100%: 빨강
- 보조 텍스트: `마감까지 n일 n시간`

### 4.5 구글/애플 캘린더 연동
- 인증
  - Google Calendar: OAuth 2.0
  - Apple Calendar: iCloud 캘린더 연동(초기 MVP는 CalDAV 또는 iOS 네이티브 브리지 중 1개 선택)
- 동기화 범위
  - 1차: 외부 일정 읽기 + 앱 일정 외부 캘린더로 내보내기
  - 2차(선택): 양방향 수정 동기화
- 충돌 정책
  - 동일 일정 수정 충돌 시 최신수정우선 + 충돌 로그 기록
- 백그라운드 동기화 주기: 5~15분 + 수동 동기화 버튼

## 5. 정보 구조 및 화면 구성

1. 대시보드: 오늘 일정, 활성 타이머, 마감 임박 일정
2. 타이머 화면: 원형 타이머, 세션 제어 버튼, 오늘 집중 통계
3. 일정 화면: 일정 목록/등록/편집 모달, 중요도/우선순위 설정
4. 연동 설정: 구글/애플 연결 상태, 마지막 동기화 시간, 재동기화

## 6. 기술 아키텍처 제안

### 6.1 권장 스택
- Frontend: Next.js + TypeScript + React Query
- Backend: Next.js API Route 또는 NestJS
- DB: PostgreSQL
- Auth: OAuth(구글), 이메일 기반 로컬 로그인(선택)
- Infra: Vercel/Render + Managed PostgreSQL

### 6.2 모듈 구성
- `timer`: 뽀모도로 상태머신, 세션 로그
- `tasks`: 일정 CRUD, 중요도/우선순위, 마감 계산
- `calendar-sync`: 외부 API 연동, 토큰 갱신, 충돌 처리
- `analytics`: 집중시간/완료율 집계

## 7. 데이터 모델 (초안)

### 7.1 users
- id (PK)
- email
- timezone
- created_at

### 7.2 tasks
- id (PK)
- user_id (FK)
- title
- description
- importance (`HIGH|MEDIUM|LOW`)
- priority (`1..5`)
- status (`TODO|DOING|DONE`)
- start_at
- due_at
- created_at
- updated_at

### 7.3 pomodoro_sessions
- id (PK)
- user_id (FK)
- task_id (nullable FK)
- focus_minutes
- break_minutes
- started_at
- ended_at
- interruption_count

### 7.4 calendar_integrations
- id (PK)
- user_id (FK)
- provider (`GOOGLE|APPLE`)
- access_token (암호화 저장)
- refresh_token (암호화 저장)
- token_expires_at
- last_synced_at

### 7.5 sync_events
- id (PK)
- integration_id (FK)
- external_event_id
- task_id (nullable FK)
- sync_status (`SUCCESS|FAILED|CONFLICT`)
- synced_at
- error_message

## 8. API 설계 (초안)

- `POST /api/tasks` 일정 생성
- `GET /api/tasks?from&to&status&importance&priority` 일정 조회
- `PATCH /api/tasks/:id` 일정 수정
- `DELETE /api/tasks/:id` 일정 삭제
- `POST /api/timer/start` 타이머 시작
- `POST /api/timer/pause` 타이머 일시정지
- `POST /api/timer/complete` 세션 완료 저장
- `POST /api/integrations/google/connect` 구글 연결
- `POST /api/integrations/apple/connect` 애플 연결
- `POST /api/integrations/:provider/sync` 수동 동기화

## 9. 개발 일정 (6주 기준)

### Week 1
- 요구사항 확정, IA/와이어프레임
- DB 스키마/프로젝트 초기 셋업

### Week 2
- 일정 CRUD + 중요도/우선순위 구현
- 기본 목록/필터/정렬 UI

### Week 3
- 원형 뽀모도로 타이머 구현
- 세션 기록 및 오늘 통계

### Week 4
- 마감 Progress Bar + 임박 알림 규칙
- 대시보드 통합

### Week 5
- 구글 캘린더 OAuth + 동기화
- 애플 캘린더 1차 연동

### Week 6
- 통합 QA, 버그 수정, 성능 최적화
- 베타 릴리스

## 10. 품질 기준 및 테스트

### 10.1 테스트 범위
- 단위 테스트: 타이머 상태 전이, 마감 진행률 계산
- 통합 테스트: 일정 CRUD, 동기화 API
- E2E 테스트: 일정 생성 → 타이머 실행 → 완료 → 캘린더 반영

### 10.2 성능 목표
- 주요 화면 초기 로딩: 2초 이내
- 타이머 UI 프레임 드랍 최소화(60fps 목표)
- 동기화 요청 실패율: 1% 이하(재시도 로직 포함)

## 11. 보안/개인정보

- OAuth 토큰 암호화 저장
- 최소 권한 원칙(캘린더 읽기/쓰기 범위 분리)
- 개인정보(이메일, 일정 내용) 전송/저장 시 암호화
- 로그에 민감정보 마스킹

## 12. 리스크 및 대응

- 애플 연동 복잡도 높음
  - 대응: MVP는 읽기 중심 + 수동 동기화 우선
- 사용자별 시간대(Timezone) 오차
  - 대응: 모든 서버 저장 UTC, 클라이언트 렌더링 시 로컬 변환
- 타이머 백그라운드 제한(모바일 브라우저)
  - 대응: PWA/네이티브 전환 고려, 알림 기반 보완

## 13. MVP 완료 정의 (Definition of Done)

- 최소 요구 기능 5개가 실제 사용자 흐름에서 모두 동작
- 크리티컬 버그 0건
- 핵심 시나리오 E2E 통과율 95% 이상
- 1차 베타 사용자 10명 이상 테스트 완료 및 피드백 반영

## 14. 출시 후 지표

- 주간 활성 사용자(WAU)
- 1인당 주간 집중 세션 수
- 일정 완료율
- 캘린더 연동 활성화율
- 7일/30일 리텐션

