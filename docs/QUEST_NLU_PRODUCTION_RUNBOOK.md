# QUEST_NLU_PRODUCTION_RUNBOOK

작성일: 2026-02-28  
적용 범위: 퀘스트 NLU 라우팅(정규화 -> 룰 분류 -> 유사도 재랭킹 -> 퀘스트 생성 -> fallback) 전체 운영

## 1) 목적

이 문서는 퀘스트 추천 NLU 시스템의 실제 운영 절차를 정의한다.  
릴리즈/모니터링/장애 대응/롤백은 본 문서를 단일 기준(Source of Truth)으로 수행한다.

참조 문서:
- `docs/QUEST_PRESET_PERSONA_WEEKLY_DESIGN.md`

## 2) 운영 SLO/SLI

### 2-1. 월간 SLO

- 라우팅 가용성(성공 응답 비율): `>= 99.9%`
- E2E 라우팅 p95 지연: `<= 350ms`
- 추천 API p95 지연: `<= 900ms`
- 정책 위반 응답률(회피/거부, 안전 정책): `0%`
- fallback 비율: `<= 12%`

### 2-2. 핵심 SLI 정의

- `routing_success_rate`: `(정상 route 결정 요청 수 / 전체 요청 수) * 100`
- `routing_p95_ms`: 정규화부터 퀘스트 생성 완료까지 p95
- `fallback_rate`: `(fallback 경로 응답 수 / 전체 요청 수) * 100`
- `policy_violation_rate`: `(정책 위반 응답 수 / 전체 요청 수) * 100`
- `refusal_safe_handling_rate`: `(회피/거부 발화 중 정책 준수 응답 수 / 회피/거부 전체) * 100`

## 3) 입력 분류 Taxonomy 운영 기준

### 3-1. 고정 차원

- `domain`: `life_ops | productivity_growth | recovery_health | non_routine`
- `state`: `start_delay | in_progress | blocked | fatigued | completion_push | reset_needed | avoidance_refusal`
- `time_context`: `morning | commute | work_am | lunch | work_pm | evening | night | weekend_am | weekend_pm | weekend_night | pre_event | post_event`
- `persona`: `student | worker | homemaker | developer | office_worker | writer | entertainment | travel | exercise`
- `type`: `routine | non_routine`

### 3-2. 유효성 규칙

- 5개 차원은 모두 필수다.
- `persona=entertainment|travel|exercise`는 `type=non_routine`만 허용한다.
- `domain=non_routine`일 때 `time_context=pre_event|weekend_*|post_event` 우선 라우팅을 적용한다.

## 4) 라우팅 파이프라인 운영 절차

### 4-1. 단계별 처리

1. 정규화
- 입력 텍스트 정규화, 금칙어/안전 키워드 탐지
- 단계 SLO: p95 `<= 20ms`

2. 룰 분류
- 키워드/패턴으로 Taxonomy 1차 분류
- 신뢰도 게이트: `confidence >= 0.72`
- 단계 SLO: p95 `<= 40ms`

3. 유사도 재랭킹
- 후보 intent/preset 임베딩 재랭킹
- 확정 게이트: `top1 >= 0.78` AND `(top1-top2) >= 0.06`
- 단계 SLO: p95 `<= 120ms`

4. 퀘스트 생성
- 프리셋 선택 + 개인화(시간대/실패이력/에너지)
- 단계 SLO: p95 `<= 140ms`

5. fallback
- 분류/정책/데이터 실패 시 micro 퀘스트 반환
- 단계 SLO: p95 `<= 20ms`

### 4-2. 단계 실패 시 즉시 조치

- 정규화 실패: `fallback.safe_default`
- 룰 분류/재랭킹 실패: `fallback.intent_generic`
- 퀘스트 생성 실패: 동일 persona `micro_routine`
- 정책 위반 탐지: 일반 추천 중단 후 정책 템플릿 응답

## 5) 회피/거부 발화 처리 정책

대상 발화(대표):
- "회사 가기 싫어"
- "사무실 가기 싫어"
- "일 하기 싫어"
- "아무것도 하기 싫어"

처리 원칙:
- `state=avoidance_refusal` 우선 분류
- 결근/무단 이탈 조장 문구 생성 금지
- 공감 1문장 + 5~10분 전환 퀘스트 1~2개만 제시
- `difficulty <= 1`, `estimatedTimeMin <= 10` 고정
- 72시간 내 동일 패턴 3회 이상 시 `recovery_health` 우선 라우팅
- 위기 표현(자해/타해) 포함 시 안전 정책 플로우로 이관

운영 모니터링:
- 회피/거부 처리 건은 `reason_code=avoidance_refusal`로 별도 집계
- 정책 위반 응답은 Severity 1로 즉시 알림

## 6) 품질 게이트

### 6-1. 오프라인 게이트(배포 전)

- Taxonomy 매크로 F1 `>= 0.92`
- Persona 정확도 `>= 0.95`
- Route Top-1 정확도 `>= 0.88`
- Invalid preset 검출 재현율 `>= 0.99`
- 정책 위반 케이스 `0건`

미통과 시:
- 배포 차단
- 원인 차원(domain/state/time_context/persona/type) 분해 리포트 작성
- 수정 후 동일 평가셋 재측정

### 6-2. 온라인 게이트(부분 배포)

- fallback 비율 `<= 12%`
- 첫 미션 착수율 baseline 대비 `+3%p` 이상
- 10분 내 이탈률 baseline 대비 `-2%p` 이상
- CS/신고 기반 오분류율 `<= 1.5%`
- 정책 위반 응답률 `0%`

미통과 시:
- 즉시 트래픽 0% 롤백
- 24시간 내 RCA 작성

## 7) 배포 전략

### 7-1. 그림자 평가(Shadow, 7일)

- 사용자 응답은 기존 시스템 유지
- 신규 파이프라인은 병렬 계산만 수행
- 비교 항목: route 일치율, fallback 비율, 지연, 정책 위반 유무
- 진입 조건: 오프라인 게이트 100% 통과
- 종료 조건: Shadow 기간 내 SLO 위반 없음

### 7-2. 부분 배포(Canary)

- 1단계: 10% (24시간)
- 2단계: 30% (48시간)
- 페르소나/시간대 균등 분배
- 단계 승격 조건: 온라인 게이트 전항목 충족
- 강등 조건: SLO 위반 1회 이상 또는 정책 위반 1건 이상

### 7-3. 전체 배포(100%)

- 24시간 집중 모니터링
- 이상 없으면 안정화 모드 전환
- 안정화 모드에서도 일일 드리프트 점검 유지

## 8) 장애 대응 Runbook

### 8-1. 장애 심각도

- `Sev1`: 정책 위반 응답, 라우팅 가용성 < 99.0%, p95 > 1500ms (10분 지속)
- `Sev2`: fallback 비율 > 20% (30분 지속), 오분류 급증
- `Sev3`: 특정 persona/time_context 편향 증가, 경미한 지연 상승

### 8-2. 장애 유형별 대응

| 장애 유형 | 탐지 신호 | 즉시 조치(15분 내) | 근본 조치 | 복구 확인 |
|---|---|---|---|---|
| 정규화 실패 급증 | normalization error rate > 3% | 정규화 룰셋 이전 버전으로 스위치 | 비정상 입력 패턴 추가 반영 | error rate < 0.5% 30분 유지 |
| 분류 정확도 급락 | route mismatch > 8% | 룰 분류 가중치 롤백 | 신규 키워드/패턴 재학습 | Top-1 정확도 회복 |
| 유사도 모델 드리프트 | top1 score 평균 0.08 이상 하락 | 재랭킹 모델 이전 버전으로 롤백 | 임베딩 인덱스 재빌드 | score/오분류율 정상화 |
| fallback 폭증 | fallback_rate > 20% | fallback 기준 완화 금지, 대신 이전 안정 버전 전환 | 원인 단계(정규화/분류/생성) 분해 수정 | fallback <= 12% |
| 정책 위반 응답 | 위반 1건 이상 | 즉시 0% 롤백 + 알림 발송 | 정책 필터 규칙 보강 | 위반 0건 재확인 후 재배포 |

### 8-3. 커뮤니케이션 타임라인

- Sev1: 5분 내 운영 채널 공지, 15분 내 임시조치, 60분 내 상태 업데이트
- Sev2: 15분 내 공지, 60분 내 임시조치
- Sev3: 업무시간 내 백로그 등록 및 다음 배포 반영

## 9) 드리프트 모니터링

### 9-1. 모니터링 축

- 입력 분포 드리프트: persona/state/time_context 비율 변화
- 의미 드리프트: 상위 발화 클러스터 변화율
- 품질 드리프트: route Top-1, fallback, 오분류율 추세
- 정책 드리프트: 회피/거부 처리 준수율

### 9-2. 경보 임계값

- persona 분포 PSI `> 0.2` (7일 이동창)
- state `avoidance_refusal` 비율이 기준 대비 `+40%` 초과
- fallback_rate 3일 평균 `> 12%`
- policy_violation_rate `> 0`

### 9-3. 대응 순서

1. 데이터 이상 여부 확인(수집 누락/중복)
2. 모델/룰 변경 이력 확인
3. 영향 범위(페르소나/시간대) 분해
4. 필요 시 즉시 롤백
5. 수정 후 그림자 평가 재진입

## 10) 롤백 절차

### 10-1. 롤백 트리거

- Sev1 발생
- 온라인 게이트 미충족
- 정책 위반 1건 이상
- p95 지연 2배 초과가 15분 이상 지속

### 10-2. 실행 절차

1. 트래픽 라우팅을 직전 안정 버전으로 즉시 전환
2. 신규 버전의 write-path 비활성화
3. 30분 동안 핵심 SLI(가용성/지연/fallback/정책 위반) 확인
4. 정상화 확인 후 incident 상태를 `Mitigated`로 변경
5. 24시간 내 RCA와 재발 방지 항목 등록

### 10-3. 재배포 조건

- 원인 수정 + 오프라인 게이트 재통과
- Shadow 24시간 이상 무이상
- Canary 10% 24시간 무이상

## 11) 운영 점검 체크리스트

- [ ] 월간 SLO 달성률 리포트 발행
- [ ] 회피/거부 발화 정책 위반 0건 확인
- [ ] 드리프트 경보 발생 건 RCA 완료
- [ ] 롤백 이력 및 재배포 이력 문서화
- [ ] Taxonomy enum 변경 요청 시 버전 정책 준수 확인
