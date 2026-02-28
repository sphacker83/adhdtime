# QUEST_PRESET_PERSONA_WEEKLY_DESIGN

작성일: 2026-02-28  
대상: 학생/직장인/주부/개발자/회사원(일반 사무직)/작가 + 비일상 트랙(엔터테인먼트/여행/운동)의 하루~일주일 일과 기반 퀘스트 단위 재설계 명세

## 1) 목적/범위

### 목적
- 기존 퀘스트 프리셋을 단순 카테고리 중심에서 `페르소나 + 시간대 + 주간 리듬` 중심으로 재설계한다.
- 일상형(학생/직장인/주부/개발자/회사원/작가)과 비일상형(엔터테인먼트/여행/운동) 트랙을 분리해 추천 정확도를 높인다.
- 사용자가 실제 생활 흐름에서 바로 시작 가능한 퀘스트를 추천받도록 퀘스트 단위를 표준화한다.
- `presets.json` 확장 시 기존 구조(`intent`, `missions`, `estimatedTimeMin`)를 유지하면서 페르소나/타입/주기 정보를 추가한다.

### 범위
- 일상형 6개 페르소나의 하루/주간 일과 맵 정의
- 비일상형 3개 트랙(엔터테인먼트/여행/운동) 운영 맵 정의
- 퀘스트 단위(난이도/시간/트리거/완료기준) 규칙 정의
- 카테고리 체계와 intent 매핑 규칙 제시
- 페르소나/트랙 균형형 퀘스트 후보 96개 제시
  - 학생 20, 직장인 20, 주부 20, 개발자 6, 회사원 6, 작가 6, 엔터테인먼트 6, 여행 6, 운동 6
- `presets.json` 운영 데이터 계약(v1) 확정

### 범위 제외(상세는 7절 비목표 참조)
- 실제 앱 코드 수정, JSON 파일 실반영, 보상 시스템 개편, 추천 모델 학습

---

## 2) 페르소나별 일과 맵(하루/주간)

## 2-1. 학생 페르소나 일과 맵

가정: 평일 수업 + 과제/시험 + 동아리/팀플을 병행하는 중고등/대학생 공통 패턴

| 시간대 | 하루 맥락 | 주요 마찰 | 퀘스트 기회 |
|---|---|---|---|
| 06:30-08:30 | 기상/등교 준비 | 늦잠, 준비물 누락 | 기상 재시동, 준비물 체크, 아침 섭취 |
| 09:00-12:00 | 오전 수업 | 수업 전환 지연, 집중 저하 | 수업 시작 루틴, 필기 정리 |
| 12:00-14:00 | 점심/공강 | 공강 시간 소실 | 공강 미니복습, 일정 업데이트 |
| 14:00-18:00 | 오후 수업/과제 | 과제 착수 지연 | 과제 스타트, 25분 집중 블록 |
| 18:00-22:00 | 동아리/자율학습 | 피로 누적, 우선순위 혼선 | 복습 회독, 팀플 정리 |
| 22:00-24:00 | 취침 준비 | 야간 폰 사용, 수면 지연 | 디지털 차단, 내일 계획 1개 설정 |

| 요일 | 주간 이벤트 | 핵심 퀘스트 묶음 |
|---|---|---|
| 월 | 강의/학습 시작 | 주간 강의자료 정리, 우선순위 설정 |
| 화-목 | 과제/시험 누적 | 과제 마감 관리, 회독/복습 |
| 금 | 누적 정리 | 미완료 과제 정리, 생활비 점검 |
| 토 | 보충/활동 | 동아리/대외활동 행정 처리 |
| 일 | 리셋 | 방 정리, 세탁, 다음 주 학습 프리셋 |

## 2-2. 직장인 페르소나 일과 맵

가정: 평일 8~10시간 근무 + 통근 + 저녁 가사/회복 루틴

| 시간대 | 하루 맥락 | 주요 마찰 | 퀘스트 기회 |
|---|---|---|---|
| 06:30-08:30 | 기상/출근 준비 | 지연 출발, 준비 누락 | 출근 준비물 점검, 아침 런치 |
| 09:00-12:00 | 업무 시작/집중 | 시작 지연, 회의 전환 | 탑3 설정, 딥워크 시작 |
| 12:00-13:30 | 점심/재정비 | 점심 후 처짐 | 재시동 루틴, 인박스 정리 |
| 13:30-18:30 | 협업/실행 | 회의 과다, 작업 단절 | 회의 전 아젠다, 블로커 표시 |
| 19:00-22:00 | 귀가/가사 | 체력 저하, 정리 미루기 | 귀가 정리, 식사/주방 루틴 |
| 22:00-24:00 | 회복/취침 | 디지털 과몰입 | 스트레칭, 수면 준비, 내일 첫작업 설정 |

| 요일 | 주간 이벤트 | 핵심 퀘스트 묶음 |
|---|---|---|
| 월 | 주간 업무 킥오프 | 우선순위 재정렬, 일정 캘린더 정리 |
| 화-목 | 실행 집중 | 리스크/블로커 관리, 딥워크 유지 |
| 금 | 주간 마감 | 업무 로그, 후속 일정 예약 |
| 토 | 생활 운영 | 장보기/청소/영수증 정리 |
| 일 | 회복+준비 | 운동/수면 리셋, 월요일 첫작업 사전 설정 |

## 2-3. 주부 페르소나 일과 맵

가정: 가정 운영(식사/정리/행정/돌봄)을 중심으로 한 다중 태스크 패턴

| 시간대 | 하루 맥락 | 주요 마찰 | 퀘스트 기회 |
|---|---|---|---|
| 05:30-08:30 | 가족 기상/등교/출근 지원 | 동시다발 준비 | 아침 출발 체크, 주방 초기화 |
| 09:00-12:00 | 집안 운영 집중 | 청소/세탁 과부하 | 구역 청소, 세탁 시작, 장보기 리스트 |
| 12:00-14:00 | 점심/행정 | 식사 스킵, 행정 미루기 | 점심/수분 루틴, 공과금 처리 |
| 14:00-17:00 | 돌봄/심부름 | 일정 충돌 | 하원/학습 준비, 외출 동선 정리 |
| 17:00-21:00 | 저녁 준비/가족 시간 | 피로 누적, 설거지 지연 | 저녁 준비 스타트, 주방 마감 |
| 21:00-23:00 | 정리/내일 준비 | 계획 부재 | 내일 도시락/복장, 캘린더 업데이트 |

| 요일 | 주간 이벤트 | 핵심 퀘스트 묶음 |
|---|---|---|
| 월 | 기본 루틴 세팅 | 세탁/정리 기본 사이클 |
| 화 | 식재료 운영 | 장보기/유통기한 관리 |
| 수 | 행정/가계 | 공과금, 가계부 결산 |
| 목 | 심화 정리 | 욕실/현관, 계절 의류 정리 |
| 금 | 대외 일정 정리 | 학교/병원/관공서 예약 확인 |
| 토 | 가족 활동 | 가족 일정 운영/외출 |
| 일 | 주간 리셋 | 반찬 준비, 다음 주 계획 |

## 2-4. 개발자 페르소나 일과 맵

가정: 코드 작성/리뷰/협업 커뮤니케이션을 반복하는 제품 개발 중심 패턴

| 시간대 | 하루 맥락 | 주요 마찰 | 퀘스트 기회 |
|---|---|---|---|
| 07:00-09:00 | 기상/출근 또는 재택 준비 | 시작 지연, 환경 세팅 누락 | 개발 환경 부팅, 오늘 이슈 우선순위화 |
| 09:30-12:30 | 집중 개발 시간 | 메신저 인터럽트, 컨텍스트 스위칭 | 45분 코딩 블록, 인터럽트 버퍼링 |
| 13:30-16:00 | 코드리뷰/협업 | 리뷰 대기, 요구사항 불명확 | 리뷰 큐 비우기, 질의 정리 |
| 16:00-19:00 | 버그 수정/배포 준비 | 급한 이슈 유입, 마감 압박 | 버그 triage, 릴리즈 체크리스트 |
| 20:00-23:00 | 학습/회복 | 번아웃, 과도한 야근 | 기술 학습 20분, 종료 루틴 |

| 요일 | 주간 이벤트 | 핵심 퀘스트 묶음 |
|---|---|---|
| 월 | 스프린트 시작 | 백로그 정리, 주간 핵심 태스크 확정 |
| 화-목 | 구현/리뷰 집중 | PR 처리, 블로커 조기 공유 |
| 금 | 릴리즈/회고 | 배포 체크, 장애 예방 점검 |
| 토-일 | 회복/학습 | 기술 부채 메모, 다음 주 개발환경 리셋 |

## 2-5. 회사원(일반 사무직) 페르소나 일과 맵

가정: 문서/보고/회의/결재 흐름이 많은 일반 사무직 패턴

| 시간대 | 하루 맥락 | 주요 마찰 | 퀘스트 기회 |
|---|---|---|---|
| 06:30-08:30 | 출근 준비 | 지각 리스크, 준비 누락 | 출근 체크리스트, 메일 우선순위 사전 확인 |
| 09:00-11:30 | 오전 문서/결재 처리 | 업무 착수 지연 | 보고서 본문 착수, 결재 건 분류 |
| 11:30-14:00 | 점심/대면 커뮤니케이션 | 복귀 지연 | 점심 후 10분 재시동, 회의 안건 정리 |
| 14:00-18:00 | 회의/협업/실행 | 회의 연속, 메일 적체 | 회의 요약 기록, 메일 일괄 처리 |
| 19:00-22:00 | 귀가/생활 운영 | 피로로 인한 미루기 | 귀가 정리, 개인 행정 1건 처리 |
| 22:00-23:30 | 취침 준비 | 디지털 과몰입 | 수면 준비, 다음 날 첫 업무 지정 |

| 요일 | 주간 이벤트 | 핵심 퀘스트 묶음 |
|---|---|---|
| 월 | 주간 보고 체계 세팅 | 결재/회의 캘린더 정리 |
| 화-목 | 실행/대응 | 부서 협업 요청 처리, 누락 건 점검 |
| 금 | 마감/정산 | 주간 보고 제출, 비용 정리 |
| 토-일 | 생활/회복 | 생활 행정 정리, 월요일 준비 |

## 2-6. 작가 페르소나 일과 맵

가정: 집필/자료조사/수정/투고를 반복하는 창작 중심 패턴

| 시간대 | 하루 맥락 | 주요 마찰 | 퀘스트 기회 |
|---|---|---|---|
| 07:00-09:00 | 기상/워밍업 | 착수 불안, 아이디어 분산 | 15분 자유쓰기, 당일 원고 목표 설정 |
| 09:00-12:00 | 1차 집필 블록 | 집중 붕괴, 검색 과다 | 30분 집필, 참조자료 제한 |
| 13:00-16:00 | 조사/구성 보강 | 자료 과잉, 구조 혼선 | 리서치 범위 고정, 목차 업데이트 |
| 16:00-20:00 | 수정/퇴고 | 완벽주의 지연 | 퇴고 라운드 1회 완료 |
| 21:00-23:30 | 마감/회복 | 야간 과작업 | 투고 준비, 다음 장면 메모 |

| 요일 | 주간 이벤트 | 핵심 퀘스트 묶음 |
|---|---|---|
| 월 | 집필 계획 수립 | 주간 분량/마감일 확정 |
| 화-목 | 원고 생산 | 일일 분량 달성, 조사-집필 균형 유지 |
| 금 | 편집/투고 | 원고 정리, 제출 패키지 점검 |
| 토 | 인풋 확보 | 자료 아카이브, 레퍼런스 정리 |
| 일 | 리셋 | 초고 백업, 다음 주 챕터 계획 |

## 2-7. 비일상 트랙(엔터테인먼트/여행/운동) 맵

가정: 기본 일상 루틴 위에서 기분 환기/경험 확장/체력 강화 목적의 선택형 트랙

| 트랙 | 운영 맥락 | 주요 마찰 | 퀘스트 기회 |
|---|---|---|---|
| 엔터테인먼트 | 콘텐츠 소비/문화활동 | 과몰입, 시간 초과 | 시청/관람 시간 상한 설정, 감상 기록 |
| 여행 | 일정/예약/이동 준비 | 준비물 누락, 비용 초과 | 여행 체크리스트, 예산/동선 점검 |
| 운동 | 운동 계획/실행/회복 | 시작 지연, 무리한 강도 | 운동 스타트 루틴, 회복 기록 |

| 요일 | 비일상 이벤트 | 핵심 퀘스트 묶음 |
|---|---|---|
| 월-수 | 사전 준비 | 예약/일정/장비 확인 |
| 목-금 | 실행 계획 고정 | 시간 블록 확보, 우선순위 확정 |
| 토 | 메인 실행 | 관람/이동/운동 세션 수행 |
| 일 | 리셋/기록 | 비용 정산, 회복, 다음 실행 메모 |

---

## 3) 퀘스트 단위 정의 규칙

### 3-1. 단위 정의
- 퀘스트는 `생활 결과 1개`를 만든다. (예: "출근 전 준비물 누락 0건")
- 미션은 퀘스트를 구성하는 4~6개 실행 스텝으로 제한한다.
- 퀘스트 1개는 단일 세션 완료를 원칙으로 한다.
- 비일상형 퀘스트도 동일 구조를 따르되, `type: non_routine` 태그로 분리한다.

### 3-2. 시간/난이도 규칙
- `Micro`: 5~10분, 난이도 1
- `Standard`: 10~20분, 난이도 1~2
- `Extended(주간형)`: 20~35분, 난이도 2~3
- 하루 추천량: 일상형 평일 3~5개, 주말 2~4개
- 비일상형 추천량: 평일 0~2개, 주말 1~3개

### 3-3. 트리거 규칙
- 시간 트리거: 특정 시간대 진입 시 추천 (`morning`, `commute`, `evening`)
- 이벤트 트리거: 수업 종료, 퇴근, 하원, 식사 직후 등
- 비일상 트리거: 공연 일정 D-1, 여행 출발 D-7, 운동 세션 예약 직후 등
- 누적 트리거: 미완료 2회 이상 누적 시 대체 퀘스트 제시

### 3-4. 완료/실패 처리 규칙
- 완료 조건: 핵심 미션 70% 이상 수행 + 결과 기록 1줄
- 실패 조건: 시간 초과 또는 중단 2회 이상
- 실패 시 처리: 동일 카테고리의 더 짧은 `fallbackQuest` 자동 제안

### 3-5. 명명/ID 규칙
- ID 패턴: `{PERSONA}-{CADENCE}-{CATEGORY}-{NNN}`
- 예시: `STU-DAY-STUDY-001`, `DEV-DAY-WORK-002`, `TRV-WEEK-TRAVEL-003`
- `PERSONA`: `STU | WRK | HME | DEV | OFC | WRT | ENT | TRV | EXR`
- `CADENCE`: `DAY | WEEK`

---

## 4) 카테고리 체계

### 4-1. 카테고리 레이어
- L1(도메인): `생활운영`, `생산성/성장`, `회복/건강`, `비일상 트랙`
- L2(실행 카테고리): 기존 `intent`와 1:1 또는 N:1 매핑 + 비일상 intent 확장

### 4-2. intent 매핑 표

| L1 도메인 | 카테고리 키 | 기존/확장 intent 키 | 설명 | 주사용 페르소나 |
|---|---|---|---|---|
| 생활운영 | home_maintenance | home_cleaning | 집안 정리/청소 | 주부, 직장인, 회사원 |
| 생활운영 | laundry_closet | laundry_clothing | 세탁/의류 준비 | 학생, 주부 |
| 생활운영 | meal_ops | meal_nutrition | 식사/영양/주방 운영 | 전 페르소나 |
| 생활운영 | mobility_errands | outing_mobility | 외출/이동/심부름 | 전 페르소나 |
| 생활운영 | admin_life | admin_finance | 공과금/가계/행정 | 직장인, 주부, 회사원 |
| 생활운영 | digital_ops | digital_organizing | 디지털 정리/알림 관리 | 학생, 직장인, 개발자, 작가 |
| 생산성/성장 | study_growth | study_growth | 학습/자기개발 실행 | 학생, 작가 |
| 생산성/성장 | work_execution | work_start_recovery | 업무 시작/재시동/마감 | 직장인, 개발자, 회사원 |
| 생산성/성장 | dev_flow | work_start_recovery | 개발 집중/리뷰/배포 흐름 | 개발자 |
| 생산성/성장 | office_coordination | relationship_communication | 보고/회의/협업 커뮤니케이션 | 회사원 |
| 생산성/성장 | writing_flow | study_growth | 집필/퇴고/투고 실행 | 작가 |
| 생산성/성장 | relationship_ops | relationship_communication | 가족/지인/협업 커뮤니케이션 | 전 페르소나 |
| 회복/건강 | hygiene_routine | grooming_hygiene | 위생/그루밍 | 전 페르소나 |
| 회복/건강 | health_recovery | health_exercise | 운동/스트레칭/회복 | 전 페르소나 |
| 회복/건강 | sleep_stability | sleep_wake_routine | 수면/기상 안정화 | 전 페르소나 |
| 비일상 트랙 | entertainment_track | entertainment_refresh | 문화/콘텐츠 소비의 계획적 실행 | 엔터테인먼트 |
| 비일상 트랙 | travel_track | travel_planning | 여행 준비/이동/비용 관리 | 여행 |
| 비일상 트랙 | exercise_track | exercise_challenge | 목표형 운동 세션/회복 관리 | 운동 |

### 4-3. 카테고리 적용 규칙
- 퀘스트는 반드시 `L2 카테고리 1개`만 가진다.
- 주간형 퀘스트는 `weekly_reset` 태그를 추가해 탐색성을 높인다.
- 동일 시간대에서 동일 카테고리 퀘스트는 2개를 넘기지 않는다(선택 과부하 방지).
- 비일상 트랙 퀘스트는 `type: non_routine`과 트랙 태그(`entertainment`, `travel`, `exercise`)를 함께 가진다.

---

## 5) 최소 96개 퀘스트 후보(일상 페르소나 + 비일상 트랙)

구성 기준:
- 총 96개 = 학생 20 + 직장인 20 + 주부 20 + 개발자 6 + 회사원 6 + 작가 6 + 엔터테인먼트 6 + 여행 6 + 운동 6
- 학생/직장인/주부: `DAY 14개 + WEEK 6개`
- 신규 페르소나/비일상 트랙: 최소 6개 이상(`DAY 4개 + WEEK 2개`)
- 각 항목은 `title` 단위 퀘스트 후보이며 미션 분해는 추후 프리셋 생성 단계에서 확정

## 5-1. 학생 후보 20개

| ID | cadence | category(intent) | 퀘스트 후보 |
|---|---|---|---|
| STU-DAY-HYGIENE-001 | DAY | grooming_hygiene | 기상 후 15분 출발준비 체크 |
| STU-DAY-STUDY-002 | DAY | study_growth | 1교시 전 학습도구 세팅 |
| STU-DAY-STUDY-003 | DAY | study_growth | 공강 20분 미니복습 |
| STU-DAY-STUDY-004 | DAY | study_growth | 수업 직후 필기 3줄 정리 |
| STU-DAY-STUDY-005 | DAY | study_growth | 과제 착수 10분 스타트 |
| STU-DAY-STUDY-006 | DAY | study_growth | 시험과목 25분 회독 |
| STU-DAY-REL-007 | DAY | relationship_communication | 동아리/팀플 일정 확정 |
| STU-DAY-DIGI-008 | DAY | digital_organizing | 도서관 자리 집중 환경 세팅 |
| STU-DAY-MEAL-009 | DAY | meal_nutrition | 점심 전후 식사/수분 리셋 |
| STU-DAY-HOME-010 | DAY | home_cleaning | 귀가 후 가방/책상 10분 정리 |
| STU-DAY-DIGI-011 | DAY | digital_organizing | 야간 알림/메신저 정리 |
| STU-DAY-SLEEP-012 | DAY | sleep_wake_routine | 취침 전 내일 1순위 과목 지정 |
| STU-DAY-LAUN-013 | DAY | laundry_clothing | 내일 복장/준비물 사전 배치 |
| STU-DAY-HEAL-014 | DAY | health_exercise | 장시간 앉은 후 8분 스트레칭 |
| STU-WEEK-DIGI-015 | WEEK | digital_organizing | 주간 강의자료 다운로드/분류 |
| STU-WEEK-STUDY-016 | WEEK | study_growth | 주간 과제 마감 캘린더 재배치 |
| STU-WEEK-STUDY-017 | WEEK | study_growth | 시험범위 누적 진도 체크 |
| STU-WEEK-REL-018 | WEEK | relationship_communication | 동아리/대외활동 행정 처리 |
| STU-WEEK-ADMIN-019 | WEEK | admin_finance | 주간 생활비/교통비 점검 |
| STU-WEEK-HOME-020 | WEEK | home_cleaning | 일요일 방 리셋 + 세탁 1사이클 |

## 5-2. 직장인 후보 20개

| ID | cadence | category(intent) | 퀘스트 후보 |
|---|---|---|---|
| WRK-DAY-HYGIENE-001 | DAY | grooming_hygiene | 출근 전 필수품 5분 점검 |
| WRK-DAY-WORK-002 | DAY | work_start_recovery | 출근 직후 오늘의 탑3 설정 |
| WRK-DAY-WORK-003 | DAY | work_start_recovery | 오전 딥워크 25분 스타트 |
| WRK-DAY-WORK-004 | DAY | work_start_recovery | 회의 전 아젠다 3줄 정리 |
| WRK-DAY-WORK-005 | DAY | work_start_recovery | 점심 후 10분 재시동 루틴 |
| WRK-DAY-DIGI-006 | DAY | digital_organizing | 이메일/메신저 인박스 트리아지 |
| WRK-DAY-WORK-007 | DAY | work_start_recovery | 퇴근 전 업무 로그 + 내일 첫작업 지정 |
| WRK-DAY-HOME-008 | DAY | home_cleaning | 귀가 후 의류/가방 정리 |
| WRK-DAY-MEAL-009 | DAY | meal_nutrition | 저녁 식사-설거지 미니루틴 |
| WRK-DAY-HEAL-010 | DAY | health_exercise | 야간 스트레칭/눈 휴식 |
| WRK-DAY-SLEEP-011 | DAY | sleep_wake_routine | 취침 전 디지털 차단 30분 |
| WRK-DAY-STUDY-012 | DAY | study_growth | 통근 중 15분 마이크로 학습 |
| WRK-DAY-REL-013 | DAY | relationship_communication | 하루 1건 관계 유지 답장 정리 |
| WRK-DAY-ADMIN-014 | DAY | admin_finance | 당일 지출 3건 기록 |
| WRK-WEEK-WORK-015 | WEEK | work_start_recovery | 주간 업무 우선순위 재정렬 |
| WRK-WEEK-WORK-016 | WEEK | work_start_recovery | 프로젝트 리스크/블로커 보고 정리 |
| WRK-WEEK-ADMIN-017 | WEEK | admin_finance | 영수증/경비 증빙 정리 |
| WRK-WEEK-ADMIN-018 | WEEK | admin_finance | 자동이체/카드 결제 점검 |
| WRK-WEEK-MEAL-019 | WEEK | meal_nutrition | 주간 장보기 + 식단 베이스 준비 |
| WRK-WEEK-HOME-020 | WEEK | home_cleaning | 주말 집안 2구역 리셋 청소 |

## 5-3. 주부 후보 20개

| ID | cadence | category(intent) | 퀘스트 후보 |
|---|---|---|---|
| HME-DAY-HYGIENE-001 | DAY | grooming_hygiene | 아침 가족 출발 체크 |
| HME-DAY-MEAL-002 | DAY | meal_nutrition | 아침 식기/주방 초기화 |
| HME-DAY-LAUN-003 | DAY | laundry_clothing | 오전 세탁 시작 루틴 |
| HME-DAY-HOME-004 | DAY | home_cleaning | 오전 집안 1구역 정리 |
| HME-DAY-MEAL-005 | DAY | meal_nutrition | 장보기 리스트 확정 |
| HME-DAY-HEAL-006 | DAY | health_exercise | 점심 후 10분 회복 루틴 |
| HME-DAY-ADMIN-007 | DAY | admin_finance | 공과금/가정행정 15분 처리 |
| HME-DAY-REL-008 | DAY | relationship_communication | 하원/학습 준비 커뮤니케이션 |
| HME-DAY-MOBI-009 | DAY | outing_mobility | 오후 심부름 동선 최적화 |
| HME-DAY-MEAL-010 | DAY | meal_nutrition | 저녁 준비 시작 루틴 |
| HME-DAY-MEAL-011 | DAY | meal_nutrition | 저녁 후 주방 마감 |
| HME-DAY-REL-012 | DAY | relationship_communication | 가족 일정 캘린더 업데이트 |
| HME-DAY-LAUN-013 | DAY | laundry_clothing | 내일 도시락/복장 사전 준비 |
| HME-DAY-SLEEP-014 | DAY | sleep_wake_routine | 취침 전 가정 운영 마감 체크 |
| HME-WEEK-MEAL-015 | WEEK | meal_nutrition | 냉장고 유통기한 점검 |
| HME-WEEK-MEAL-016 | WEEK | meal_nutrition | 주간 반찬 기본세트 준비 |
| HME-WEEK-HOME-017 | WEEK | home_cleaning | 욕실/현관 심화 청소 |
| HME-WEEK-ADMIN-018 | WEEK | admin_finance | 가계부 결산 및 예산 배분 |
| HME-WEEK-MOBI-019 | WEEK | outing_mobility | 의료/학교/행정 예약 정리 |
| HME-WEEK-REL-020 | WEEK | relationship_communication | 일요일 가족 운영 미팅 |

## 5-4. 개발자 후보 6개

| ID | cadence | category(intent) | 퀘스트 후보 |
|---|---|---|---|
| DEV-DAY-WORK-001 | DAY | work_start_recovery | 출근/로그인 직후 오늘 구현 범위 3줄 고정 |
| DEV-DAY-WORK-002 | DAY | work_start_recovery | 오전 45분 무인터럽트 코딩 블록 |
| DEV-DAY-DIGI-003 | DAY | digital_organizing | PR 리뷰 큐 2건 처리 |
| DEV-DAY-HEAL-004 | DAY | health_exercise | 장시간 코딩 후 8분 목/손목 회복 루틴 |
| DEV-WEEK-WORK-005 | WEEK | work_start_recovery | 주간 배포 체크리스트 점검 + 블로커 공유 |
| DEV-WEEK-STUDY-006 | WEEK | study_growth | 기술 부채/학습 주제 1건 정리 |

## 5-5. 회사원(일반 사무직) 후보 6개

| ID | cadence | category(intent) | 퀘스트 후보 |
|---|---|---|---|
| OFC-DAY-WORK-001 | DAY | work_start_recovery | 출근 직후 결재/보고 우선순위 5분 정리 |
| OFC-DAY-REL-002 | DAY | relationship_communication | 회의 전 안건 3줄-결론 1줄 템플릿 작성 |
| OFC-DAY-DIGI-003 | DAY | digital_organizing | 메일함 중요/대기/참조 3분류 트리아지 |
| OFC-DAY-ADMIN-004 | DAY | admin_finance | 당일 비용/정산 필요 건 1건 처리 |
| OFC-WEEK-WORK-005 | WEEK | work_start_recovery | 주간 보고서 본문 작성 및 일정 반영 |
| OFC-WEEK-REL-006 | WEEK | relationship_communication | 부서 협업 요청/후속 일정 일괄 확인 |

## 5-6. 작가 후보 6개

| ID | cadence | category(intent) | 퀘스트 후보 |
|---|---|---|---|
| WRT-DAY-STUDY-001 | DAY | study_growth | 아침 15분 자유쓰기 후 오늘 분량 선언 |
| WRT-DAY-STUDY-002 | DAY | study_growth | 30분 집필 블록 1회 완주 |
| WRT-DAY-DIGI-003 | DAY | digital_organizing | 자료탭 정리 후 참고자료 3개만 유지 |
| WRT-DAY-SLEEP-004 | DAY | sleep_wake_routine | 야간 집필 종료 시 다음 장면 2줄 메모 |
| WRT-WEEK-STUDY-005 | WEEK | study_growth | 주간 원고 분량/진척률 점검 |
| WRT-WEEK-REL-006 | WEEK | relationship_communication | 투고/편집 커뮤니케이션 1건 정리 |

## 5-7. 엔터테인먼트 트랙 후보 6개

| ID | cadence | category(intent) | 퀘스트 후보 |
|---|---|---|---|
| ENT-DAY-ENT-001 | DAY | entertainment_refresh | 퇴근 후 콘텐츠 1개만 선택해 30분 감상 |
| ENT-DAY-ENT-002 | DAY | entertainment_refresh | 시청 전 종료 시간 미리 설정 |
| ENT-DAY-ENT-003 | DAY | entertainment_refresh | 관람 후 감상 2줄 기록 |
| ENT-DAY-ENT-004 | DAY | entertainment_refresh | 주중 문화활동 후보 3개 저장 |
| ENT-WEEK-ENT-005 | WEEK | entertainment_refresh | 주말 공연/전시 1건 확정 및 예약 |
| ENT-WEEK-ENT-006 | WEEK | entertainment_refresh | 주간 엔터테인먼트 지출 점검 |

## 5-8. 여행 트랙 후보 6개

| ID | cadence | category(intent) | 퀘스트 후보 |
|---|---|---|---|
| TRV-DAY-TRAVEL-001 | DAY | travel_planning | 여행 준비물 체크리스트 5항목 점검 |
| TRV-DAY-TRAVEL-002 | DAY | travel_planning | 이동 동선/소요시간 10분 재확인 |
| TRV-DAY-TRAVEL-003 | DAY | travel_planning | 당일 예산 상한 설정 |
| TRV-DAY-TRAVEL-004 | DAY | travel_planning | 출발 전 필수 서류/예약내역 확인 |
| TRV-WEEK-TRAVEL-005 | WEEK | travel_planning | 주간 여행 일정표 업데이트 |
| TRV-WEEK-TRAVEL-006 | WEEK | travel_planning | 여행 후 영수증/기록 정리 |

## 5-9. 운동 트랙 후보 6개

| ID | cadence | category(intent) | 퀘스트 후보 |
|---|---|---|---|
| EXR-DAY-EXERCISE-001 | DAY | exercise_challenge | 운동 시작 전 5분 워밍업 |
| EXR-DAY-EXERCISE-002 | DAY | exercise_challenge | 20분 유산소 또는 근력 세션 1회 |
| EXR-DAY-EXERCISE-003 | DAY | exercise_challenge | 운동 후 수분/스트레칭 마무리 |
| EXR-DAY-EXERCISE-004 | DAY | exercise_challenge | 피로도 1줄 기록 |
| EXR-WEEK-EXERCISE-005 | WEEK | exercise_challenge | 주간 운동 횟수/강도 리뷰 |
| EXR-WEEK-EXERCISE-006 | WEEK | exercise_challenge | 다음 주 운동 일정 3블록 고정 |

---

## 6) presets.json Production Data Contract (v1.0)

목표: 기존 배열 구조를 유지하면서 운영 환경에서 검증 가능한 필드 제약, 금지값, 버전 정책을 고정한다.

### 6-1. 필수 필드/제약 확정

| 필드 | 타입 | 필수 | 운영 제약 |
|---|---|---|---|
| schemaVersion | string | Y | `1.x.y` 형식. Major `1`만 허용 |
| id | string | Y | 패턴: `^[A-Z]{3}-(?:DAY|WEEK)-[A-Z_]+-\\d{3}$`, 전역 유일 |
| persona | enum | Y | `student | worker | homemaker | developer | office_worker | writer | entertainment | travel | exercise` |
| type | enum | Y | `routine | non_routine` |
| cadence | enum | Y | `daily | weekly` |
| weekdayMask | number[7] | Y | 길이 7, 각 원소 `0|1`, 최소 1개는 `1` |
| timeWindow | object | Y | `start/end`은 `HH:mm`, `flexMin`은 `0~180` |
| intent | string | Y | 승인 intent 집합 내 값만 허용 |
| title | string | Y | 6~40자, 공백-only 금지 |
| summary | string | Y | 10~120자 |
| priority | number | Y | `1~3` 정수 |
| estimatedTimeMin | number | Y | `5~35` 정수 |
| difficulty | number | Y | `1~3` 정수 |
| energyCost | enum | Y | `low | mid | high` |
| examples | string[] | Y | 2~8개, 각 문장 6~60자 |
| missions | array | Y | 4~6개, 각 mission에 `action/estMinutes/difficulty/iconKey` 필수 |
| successCriteria | object | Y | `minCompletedMissions`(1~6), `mustIncludeRecordMission`(boolean) 필수 |
| fallbackQuestIds | string[] | Y | 1~3개, 본인 id 포함 금지, persona/type 호환 필수 |
| tags | string[] | Y | 1~8개, 중복 금지 |
| createdAt | string | Y | ISO8601 UTC |
| updatedAt | string | Y | ISO8601 UTC, `createdAt` 이상 |

### 6-2. 금지값/거부 규칙

- `title`, `summary`, `missions[].action`에 빈 문자열, 욕설, 혐오/차별 표현 금지
- `estimatedTimeMin` 합계와 `missions[].estMinutes` 합계 차이가 5분 초과면 거부
- `non_routine` 타입인데 `tags`에 `entertainment|travel|exercise`가 없으면 거부
- `routine` 타입인데 `intent`가 `entertainment_refresh|travel_planning|exercise_challenge`면 거부
- `weekdayMask`가 전부 `0`이면 거부
- `fallbackQuestIds`가 존재하지 않는 id를 참조하면 거부
- 동일 `id`의 중복 정의, 동일 persona 내 동일 title 중복 정의 금지

### 6-3. 버전 정책

- 버전 키: `schemaVersion`
- `MAJOR` 증가 조건: 필수 필드 추가/삭제, enum 제거, 기존 값 의미 변경
- `MINOR` 증가 조건: optional 필드 추가, enum 값 추가(하위호환)
- `PATCH` 증가 조건: 설명 문구/오탈자 수정, 제약 문구 명확화
- 런타임 호환 정책:
  - 서버는 최신 `MINOR`까지 읽기 허용
  - 클라이언트는 자신보다 높은 `MAJOR` 문서를 로드 금지
  - `MAJOR` 변경 릴리즈는 그림자 평가 7일 + 부분 배포 72시간을 통과해야 한다

### 6-4. 하위호환/마이그레이션 규칙

- 레거시 데이터에 `schemaVersion`이 없으면 `1.0.0`으로 간주하고 검증 파이프라인에서 보정
- 누락 필드 보정은 아래 기본값만 허용:
  - `type: "routine"`
  - `cadence: "daily"`
  - `weekdayMask: [1,1,1,1,1,1,1]`
  - `energyCost: "mid"`
- 보정 후에도 6-2 금지 규칙 위반 시 배포 아티팩트에서 제외한다

---

## 7) 비목표/리스크/검증 체크리스트

### 7-1. 비목표(Non-goals)
- 보상/레벨/재화 시스템 재설계
- 자연어 이해 모델(NLU) 학습 파이프라인 개편
- UI 컴포넌트/화면 구조 개편
- 개인 의료/정신건강 진단 로직 추가

### 7-2. 리스크
- 페르소나 고정관념 위험: 실제 사용자 생활패턴과 불일치 가능
- 시간대 과적합: 교대근무/야간학습 사용자 커버리지 부족
- 카테고리 중복: `study_growth`와 `work_start_recovery` 경계 모호
- 비일상 과잉 추천: 일상 루틴을 방해할 가능성
- 퀘스트 과밀: 하루 추천량이 많아 선택 피로 유발
- 데이터 품질: 트리거 문장과 실제 사용자 발화 간 괴리

### 7-3. 검증 체크리스트
- [ ] 페르소나/트랙별 후보 수가 기준을 충족하는가? (학생20/직장인20/주부20/개발자6/회사원6/작가6/엔터6/여행6/운동6)
- [ ] 학생/직장인/주부의 DAY/WEEK 비율이 동일한가? (14/6)
- [ ] 신규 페르소나/비일상 트랙이 최소 6개 이상 확보됐는가?
- [ ] 모든 퀘스트가 정의된 intent 집합과 매핑되는가? (기존 + 확장 3종)
- [ ] 퀘스트당 미션 수(4~6) 규칙을 충족하는가?
- [ ] 추천 시간대가 실제 일과 맵과 충돌하지 않는가?
- [ ] 실패 시 fallbackQuest가 준비되어 있는가?
- [ ] 주간형 퀘스트에 weekdayMask가 정의되는가?
- [ ] `type(routine/non_routine)` 필드가 누락 없이 설정되는가?
- [ ] 동일 시간대 동일 카테고리 중복 추천이 제한되는가?
- [ ] 운영 관점 KPI가 측정 가능한가?

### 7-4. KPI/SLO 확정(운영 지표)
- 주간 퀘스트 완료율(페르소나/트랙별): `>= 42%`
- 첫 미션 착수율(추천 후 10분 내): `>= 68%`
- 중도 이탈률(미션 2개 미만 완료): `<= 22%`
- fallback 전환 후 완료율: `>= 40%`
- 다음날 재방문율(D1): `>= 36%`, 7일 유지율(D7): `>= 18%`

---

## 8) NLU 입력 분류 Taxonomy 확정본

### 8-1. 분류 차원 및 허용값

| 차원 | 허용값(운영 enum) | 설명 |
|---|---|---|
| domain | `life_ops \| productivity_growth \| recovery_health \| non_routine` | 생활운영/생산성/회복/비일상 트랙 최상위 분류 |
| state | `start_delay \| in_progress \| blocked \| fatigued \| completion_push \| reset_needed \| avoidance_refusal` | 현재 실행 상태 및 마찰 상태 |
| time_context | `morning \| commute \| work_am \| lunch \| work_pm \| evening \| night \| weekend_am \| weekend_pm \| weekend_night \| pre_event \| post_event` | 시간대 또는 이벤트 전후 맥락 |
| persona | `student \| worker \| homemaker \| developer \| office_worker \| writer \| entertainment \| travel \| exercise` | 페르소나/트랙 |
| type | `routine \| non_routine` | 일상 루틴/비일상 실행 분기 |

운영 규칙:
- `domain`, `state`, `time_context`, `persona`, `type`는 모두 필수 분류값이다.
- `persona=entertainment|travel|exercise`면 `type=non_routine`이어야 한다.
- `domain=non_routine`이면 `time_context=pre_event|weekend_*|post_event` 우선 매핑을 사용한다.

### 8-2. 라우팅 파이프라인(운영 고정)

1. 정규화(Normalization)
- 입력 텍스트 소문자/공백/반복문자 정규화, 형태소 토큰 및 오탈자 보정
- 출력: `normalized_text`, 후보 키워드, 금칙어 플래그
- 실패 시: `fallback.safe_default`로 즉시 이동

2. 룰 분류(Rule Classification)
- 키워드/패턴 기반으로 `domain/state/time_context/persona/type` 1차 산출
- 신뢰도 기준: rule confidence `>= 0.72`면 primary route 유지
- 출력: top-3 라우트 후보 + confidence

3. 유사도 재랭킹(Similarity Re-ranking)
- 임베딩 유사도로 후보 intent/preset 재정렬
- 신뢰도 기준: `top1 >= 0.78` AND `top1-top2 >= 0.06`일 때 확정
- 미달 시: `fallback.intent_generic` 경로로 이동

4. 퀘스트 생성(Quest Selection/Generation)
- 확정된 route에 맞는 프리셋 선택 후 시간/난이도/최근 실패 이력으로 개인화
- 출력: `quest_id`, `missions`, `fallbackQuestIds`, `reason_codes`
- 생성 실패 시: 같은 persona의 `micro_routine` 1개 강제 반환

5. fallback
- 실패 케이스: 분류 미확정, 유사도 미달, 정책 위반, 데이터 누락
- 반환 규칙:
  - routine: `5~10분` micro 퀘스트 1개
  - non_routine: 일정 리스크 없는 준비성 퀘스트 1개
- fallback 응답 비율 SLO: 일간 `<= 12%`

파이프라인 성능 SLO:
- end-to-end 라우팅 성공률: `>= 99.5%`
- 분류+재랭킹 p95 지연: `<= 350ms`
- 전체 추천 API p95 지연: `<= 900ms`

### 8-3. 회피/거부 발화 처리 정책(운영)

대상 발화:
- "회사 가기 싫어"
- "사무실 가기 싫어"
- "일 하기 싫어"
- "아무것도 하기 싫어"

처리 원칙:
- `state=avoidance_refusal`로 우선 분류하고 공감형 문장 + 부담 최소화 퀘스트를 제안한다.
- 결근/무단 불이행을 직접 권장하는 문구는 생성하지 않는다.
- 업무/학업 회피를 강화하는 장문 조언 대신, `5~10분` 전환 행동을 우선 반환한다.
- 72시간 내 동일 거부 패턴이 3회 이상이면 `recovery_health` 도메인 우선 라우팅으로 전환한다.
- 위기 징후(자해/타해/극단 표현)가 포함되면 일반 퀘스트 생성을 중단하고 안전 정책 플로우로 이관한다.

정책 템플릿:
- 응답 톤: 판단/훈계 금지, 사실 기반 공감 1문장 + 즉시 실행 1문장
- 퀘스트 제한: `difficulty <= 1`, `estimatedTimeMin <= 10`
- 예: "회사 가기 싫어" -> `출근 전 7분 재시동 루틴`, `오늘 탑1 업무만 적기`

### 8-4. 품질 게이트(Offline/Online)

Offline 게이트(배포 전 7일 평가셋):
- Taxonomy 매크로 F1: `>= 0.92`
- Persona 정확도: `>= 0.95`
- Route Top-1 정확도: `>= 0.88`
- Refusal 정책 준수율: `100%` (위반 0건)
- Invalid preset 검출 재현율: `>= 0.99`

Online 게이트(부분 배포 72시간):
- fallback 비율: `<= 12%`
- 첫 미션 착수율: baseline 대비 `+3%p` 이상
- 10분 내 이탈률: baseline 대비 `-2%p` 이상
- CS/신고 기반 오분류율: `<= 1.5%`
- 정책 위반 응답률: `0%`

### 8-5. 배포 전략(요약)

1. 그림자 평가(Shadow, 7일)
- 운영 트래픽 미노출, 기존 결과와 신규 결과를 동시 계산
- 8-4 Offline 게이트 + 지연 SLO 동시 통과 필요

2. 부분 배포(Canary, 10% -> 30%, 72시간)
- 페르소나별 트래픽을 균등 분배
- Online 게이트 미충족 시 즉시 0% 롤백

3. 전체 배포(100%)
- 24시간 집중 모니터링 후 안정화 모드 전환
- 운영 절차는 `docs/archive/2026-02-28-core-doc-pruning-pass2/QUEST_NLU_PRODUCTION_RUNBOOK.md`를 단일 기준으로 따른다
