# Post-MVP P2 Growth Rank Plan

Last Updated: 2026-02-28

## Executive Summary
Epic G v3 랭크/점수 개편을 구현한다. 핵심은 정수-only 스코어(`totalScore/displayScore/carry`)로 전환하고, 랭크를 `F + (-/0/+)` 단계로 세분화하며 `A+` 이후 `S-/S0/S+/SS-...`로 확장하는 것이다. 캐릭터 랭크는 5스탯 `min(totalScore)` 기준으로 계산하고, UI는 `displayScore(0~99)` 원점 리셋/색상 연동을 반영한다.

## Scope
### In Scope
- v3 랭크 체계: `F`, `E-/E0/E+ ... A-/A0/A+`, `S-/S0/S+`, `SS-/...`
- 정수-only 점수 계산(소수점 퍼센트 제거, carry 누적 기반)
- 캐릭터 랭크를 5스탯 `min(totalScore)` 기준으로 산정
- `displayScore(0~99)` 기반 레이더 원점 리셋
- 레이더 색상과 캐릭터 랭크 텍스트 색상 팔레트 연동
- 로컬 스토리지 `adhdtime:mvp-state:v3` 마이그레이션
- rank 이벤트(`rank_promoted`, `character_rank_changed`) 계약 유지

### Out of Scope
- Epic G-04 페이싱 튜너
- Epic H Co-op Room
- OAuth/실 provider 연동

## Decisions
- 점수 상태는 `totalScore/displayScore/carry` 정수 3요소로 통일
- 랭크 밴드는 `floor(totalScore / 100)`으로 계산
- 캐릭터 랭크는 5스탯 중 최소 밴드(`min(totalScore)`)를 기준으로 산정
- `displayScore`는 캐릭터 밴드를 원점으로 동기화(`0~99`)
- 저장소는 v3 키로 리셋 마이그레이션 수행

## 핵심 수식 (간단 버전)
- 퀘스트 1회 점수 증가:
  `gainedScore = floor((carry + 100 * weightNum) / (questsRequired(band) * weightDen))`
- 누적 상태:
  `carry' = (carry + 100 * weightNum) mod (questsRequired(band) * weightDen)`
  `totalScore' = totalScore + gainedScore`
- 스탯 랭크:
  `statBand = floor(totalScore / 100)`
- 캐릭터 랭크:
  `characterBand = min(floor(statTotalScore_i / 100))`
- 표시 점수:
  `displayScore = clamp(totalScore - characterBand * 100, 0, 99)`

## Pacing Formula
- `F -> E+`: `1 + 2 + 2 = 5` 퀘스트
- `E+ -> A+`: `18+24+32+44+59+80+108+146+198+267+361+488 = 1825` 퀘스트
- 5퀘스트/일 기준: `1825 / 5 = 365일`

## Acceptance Criteria
1. 앱이 StatsState(v3)로 정상 기동/저장/복원된다.
2. 랭크 표기가 `F + (-/0/+)` 및 `A+` 이후 `S/SS...` 확장 규칙을 따른다.
3. 캐릭터 랭크가 5스탯 `min(totalScore)` 기준으로 계산/반영된다.
4. 레이더/랭크 UI가 `displayScore(0~99)` 원점 리셋 기준으로 표시된다.
5. 스코어 계산이 정수-only로 동작하며 소수점 퍼센트 누적을 사용하지 않는다.
6. 레이더 색상과 캐릭터 랭크 텍스트 색상이 동일 팔레트로 연동된다.
7. `npm run verify:mvp`가 PASS한다.

## Validation Gate
1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:mvp`
4. `npm run build`
5. `npm run verify:mvp`
