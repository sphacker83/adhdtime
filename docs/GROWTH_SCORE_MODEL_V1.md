# ADHDTime 성장 점수 모델 v1.0 (기획안)

문서 버전: v1.0  
작성일: 2026-02-28  
연계 문서: `docs/PRD.md` v3.3, `docs/DEVELOPMENT_PLAN.md` v2.3

---

## 1. 목적

- `XP`와 `스탯 성장`을 분리해 `스탯=레벨` 수렴을 방지한다.
- 일평균 퀘스트 3~5개 완료 사용자 기준으로 특정 스탯 `S` 도달이 약 1년이 되도록 페이싱한다.

## 2. 성장 축

1. `AXP (Account XP)`
- 계정 레벨 성장용 점수
- 해금/권위/이벤트 참가 조건에 사용

2. `SGP (Stat Growth Point)`
- 스탯 랭크 성장용 점수
- 스탯별 랭크/진행도 계산에 사용

원칙: 미션 완료 시 `AXP + SGP`를 동시에 지급한다.

## 3. 스탯 랭크 체계

- 랭크 단계: `F -> E -> D -> C -> B -> A -> S -> SS -> SS+`
- 각 스탯은 `progress(0~99.99)`를 가진다.
- `progress >= 100`이면 해당 스탯 랭크가 1단계 상승하고, 초과분은 이월한다.
- `SS+` 도달 후에는 랭크 고정, 초과분은 `Mastery`로 누적한다.

## 4. 캐릭터 랭크 체계

- 스탯 인덱스 매핑: `F=0, E=1, D=2, C=3, B=4, A=5, S=6, SS=7, SS+=8`
- 스탯 점수: `statScore = rankIndex + (progress / 100)`
- 캐릭터 점수: `characterScore = 5개 statScore 평균`
- 캐릭터 랭크: `floor(characterScore)`에 해당하는 랭크
- UI: 캐릭터 아이콘 옆에 `캐릭터 랭크 + 다음 랭크 진행률(%)` 표시

## 5. 점수 계산식 (초안)

```text
missionFactor = clamp(estMinutes / 10, 0.4, 1.5)
qualityFactor = onTimeFactor * noAbortFactor
  - onTimeFactor: 제시간완료 1.05, 지연완료 0.90
  - noAbortFactor: 무중단 1.05, 포기 0.00

missionAXP = round(6 + 8 * missionFactor * qualityFactor)
missionSGP = 0.35 * missionFactor * qualityFactor

questBonusAXP = 10
questBonusSGP = 0.25
```

- 평균 5미션/퀘스트, 품질계수 1.0 가정 시 퀘스트당 `SGP`는 약 2.0 수준

## 6. 스탯 분배 규칙

- 각 미션/퀘스트에 `Primary`, `Secondary` 스탯을 지정한다.
- `SGP` 분배 비율:
  - Primary: 55%
  - Secondary: 25%
  - Consistency: 20%
- 복귀 행동(재일정/재청킹 후 완료)은 `Recovery` 가중 보상 우선 적용

## 7. 1년 S 페이싱 목표

- 운영 목표: 일평균 3~5퀘스트 완료 사용자가 약 1년 내 특정 스탯 `S` 도달
- 초기 기준:
  - 3퀘/일: A 후반
  - 4퀘/일: S 근접/도달
  - 5퀘/일: S 안정 도달
- 운영 방식: 월 1회 코호트 기반 계수 보정

## 8. 악용 방지 규칙

- 동일 퀘스트 반복 3회 초과: 해당 퀘스트 `SGP` 70% 적용
- 동일 퀘스트 반복 6회 초과: 해당 퀘스트 `SGP` 40% 적용
- 비정상 짧은 완료/즉시 완료 패턴은 `SGP` 미지급(AXP 최소 지급 또는 0)
- 포기/삭제는 `SGP` 0

## 9. 일일 보상 상한 (Daily Cap)

- 목적: 단시간 반복 클리어 어뷰징 방지
- 규칙:
  - 하루 보상 대상 퀘스트 수는 최대 5개
  - 당일 6번째 퀘스트부터는 `AXP/SGP` 미지급
  - 단, 완료 기록/연속성 지표/KPI 집계는 정상 반영
- 리셋 시각:
  - 사용자 로컬 타임존 기준 매일 04:00 초기화(자정 스팸 완화)
- 카운트 기준:
  - `task.status`가 당일 최초로 `done` 전환된 건만 1퀘스트로 카운트
- UX:
  - 5개 달성 시 "오늘 보상 한도 도달" 안내 배지/토스트 노출
  - 이후 완료는 "기록 전용 완료"로 표시

## 10. 단체 이벤트(Room) 연계 원칙

- 개인 미션 완료: 개인 `AXP/SGP` 지급 + 방 기여도 누적
- 방 목표 달성: 공동 보상(뱃지/테마/타이틀) 지급
- 팀 이벤트 보너스는 `AXP` 중심, `SGP`는 일일 상한 적용
- 신규 계측 이벤트:
  - `room_created`
  - `room_joined`
  - `room_mission_completed`
  - `room_goal_completed`
  - `rank_promoted`
  - `character_rank_changed`

## 11. 다음 단계

1. 30/90/365일 시뮬레이션 테이블 작성
2. 랭크 분포 목표(상위 10%, 중위값) 정의
3. 파밍 탐지 임계값(반복/속도/패턴) 수치 확정
