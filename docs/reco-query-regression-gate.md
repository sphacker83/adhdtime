# Reco Query Regression Gate (Backlog Spec)

Last Updated: 2026-03-02
Status: Backlog Spec (문서화 완료 / 구현 미착수)
Owner Track: `reco-template-quality-routing-fix`

## 1. 범위 선언 (이번 트랙 한정)
- 이 문서는 **회귀 질의셋 게이트의 기준을 고정**하기 위한 사양 문서다.
- 이번 트랙에서는 문서화만 수행한다.
- 이번 트랙에서 제외되는 항목:
  - 질의 실행 스크립트 구현
  - 자동 판정 리포트 구현
  - PR/CI 게이트 연동

## 2. 왜 필요한가 (사용자 체감 관점)
- 사용자는 자신의 상태/의도에 맞는 추천이 즉시 나오길 기대한다.
- 같은 문장을 입력했을 때 도메인이 자주 흔들리면, 사용자는 서비스가 상황을 이해하지 못한다고 느낀다.
- 특히 `회피/저동기` 발화에서 WORK 추천이 상위로 튀는 문제는 피로감을 높이고 추천 신뢰를 크게 떨어뜨린다.
- 라우팅 품질 저하는 기능 오류보다 먼저 체감된다. 따라서 릴리즈 전 정량 게이트가 필요하다.

## 3. 무엇을 측정/판정할 것인가

### 3.1 질의 단위 판정(Query-level)
각 질의는 아래 3개 조건으로 PASS/FAIL 판정한다.

1. `Primary Domain Hit@3`
- 기대 1순위 도메인이 Top-3 내에 1회 이상 등장해야 한다.

2. `Top-1 Safety`
- 질의별 `금지 Top-1 도메인`이 1위에 오면 즉시 FAIL 처리한다.

3. `State-sensitive Query Rule` (해당 질의만)
- 저동기/회피 발화로 분류된 질의는 STATE 또는 기대 보조 도메인이 Top-3에 최소 1회 포함되어야 한다.

### 3.2 스위트 단위 판정(Suite-level)
- `pass_rate = (PASS 질의 수) / (총 질의 수)`
- `critical_pass_rate = (Critical PASS 수) / (Critical 총 수)`
- `top1_safety_violations = 금지 Top-1 위반 건수`

## 4. 기본 질의셋 12개안 (도메인별 예시)
도메인 enum 기준: `ADMIN`, `HEALTH`, `HOME`, `ROUTINE`, `SOCIAL`, `STATE`, `STUDY`, `WORK`

| ID | 질의 | 기대 Primary | 허용 Secondary | 금지 Top-1 | Critical |
|---|---|---|---|---|---|
| Q01 | 운동하기 귀찮아 | HEALTH | STATE | WORK | Y |
| Q02 | 몸이 너무 무거워서 아무것도 하기 싫어 | STATE | HEALTH | WORK | Y |
| Q03 | 퇴근했는데 싱크대가 꽉 찼어 | HOME | ROUTINE | WORK | N |
| Q04 | 방이 너무 어질러져서 시작이 안 돼 | HOME | STATE | WORK | N |
| Q05 | 내일 시험인데 집중이 안 돼 | STUDY | STATE | SOCIAL | Y |
| Q06 | 보고서 마감 2시간 남았어 | WORK | ROUTINE | SOCIAL | Y |
| Q07 | 아침 루틴이 자꾸 무너져 | ROUTINE | STATE | WORK | N |
| Q08 | 친구 답장을 계속 미루고 있어 | SOCIAL | STATE | WORK | N |
| Q09 | 알림이 너무 많아서 정신없어 | ADMIN | ROUTINE | SOCIAL | N |
| Q10 | 팀 채팅 확인하기가 버거워 | WORK | STATE | HOME | N |
| Q11 | 잠깐 산책이라도 하고 싶어 | HEALTH | STATE | ADMIN | N |
| Q12 | 공부 계획 세웠는데 실행이 안 돼 | STUDY | ROUTINE, STATE | SOCIAL | Y |

질의셋 관리 원칙:
- 동일 의미 중복 질의 금지(문장만 바꾼 중복 제외)
- 도메인 편향 방지를 위해 단일 도메인 쿼리가 40%를 넘지 않도록 유지
- 분기마다 최소 2개 질의 교체 검토(운영 로그 기반)

## 5. 통계 기준 판정 방식 (pass-rate 기반)

### 5.1 하드 게이트(merge/release 차단 기준)
아래를 모두 만족해야 PASS:
1. `pass_rate >= 0.83` (12개 중 최소 10개 PASS)
2. `critical_pass_rate = 1.00` (Critical 5개 전부 PASS)
3. `top1_safety_violations = 0`

### 5.2 경고 구간(바로 차단은 아니지만 원인 분석 필요)
- `0.75 <= pass_rate < 0.83` 또는
- `critical_pass_rate < 1.00` 또는
- `top1_safety_violations >= 1`

처리 규칙:
- 경고 구간은 기본적으로 `수정 후 재실행`을 요구한다.
- 릴리즈 승인 전까지 `하드 게이트 PASS`가 나와야 최종 병합 가능하다.

### 5.3 실패 판정
- `pass_rate < 0.75` 이면 즉시 FAIL
- Critical 질의 1개라도 FAIL이면 즉시 FAIL
- 금지 Top-1 위반 2건 이상이면 즉시 FAIL

## 6. 운영 절차 (언제/누가/실패 시 대응)

### 6.1 실행 시점
1. 라우팅/랭킹/도메인 매핑 변경 PR 생성 시
2. 템플릿/클러스터/컨셉 대량 수정 PR 생성 시
3. 릴리즈 후보(배포 직전) 검증 시

### 6.2 책임/승인
- 실행 책임: 해당 PR 구현자
- 1차 리뷰 승인: 추천 품질 담당자 1인
- 최종 승인: 데이터셋 소유자 또는 릴리즈 책임자 1인

### 6.3 실패 대응 프로토콜
1. FAIL 질의를 `도메인 오분류`, `Top-1 안전 위반`, `STATE 민감도 누락`으로 분류
2. 입력 -> concept -> cluster -> template 경로 로그를 저장
3. 원인 파일(lexicon/concept_to_cluster/clusters/templates)을 파일 단위로 특정
4. 수정 커밋 후 동일 질의셋 재실행
5. 2회 연속 FAIL 시: 게이트 실패 이슈 생성 + 배포 후보 제외
6. 운영 환경 회귀로 확인되면: 마지막 안정 매핑으로 롤백 검토

## 7. 산출물 형식 (후속 구현 가이드)
구현 시 최소 산출물:
- `results/reco-regression/YYYY-MM-DD.json`
- `results/reco-regression/YYYY-MM-DD.md`

JSON 필수 필드:
- `queryId`, `queryText`, `expectedPrimary`, `actualTop5Domains`, `pass`, `failReason`
- `suite.passRate`, `suite.criticalPassRate`, `suite.top1SafetyViolations`, `suite.finalDecision`

## 8. 이번 트랙 상태 고정
- 완료: 회귀 질의셋 게이트 문서화(본 문서)
- 미완료(의도적): 실행 구현/자동화/CI 연동
- 선언: **이번 트랙은 문서 고정까지만 수행하며, 구현은 후속 백로그 트랙에서 착수한다.**
