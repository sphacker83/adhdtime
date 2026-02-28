# Post-MVP P2 Growth Rank Context

Last Updated: 2026-02-28

## SESSION PROGRESS

### ✅ COMPLETED
- v3 정수 점수 모델(`totalScore/displayScore/carry`) 적용 완료
- 랭크 세분화 반영: `F + (-/0/+)`, `A+` 이후 `S-/S0/S+/SS-...` 확장
- 페이싱 공식 반영: `F -> E+`는 `1/2/2`로 5퀘스트, `E+ -> A+`는 1825퀘스트(5퀘/일*365)
- 캐릭터 랭크 산식 교체: 5스탯 `min(totalScore)` 기반 밴드 계산
- `displayScore(0~99)` 동기화로 레이더/스탯 배지 원점 리셋 반영
- 점수 계산에서 소수점 퍼센트 누적 제거(정수-only 전환)
- 저장소 키를 `adhdtime:mvp-state:v3`로 전환하고 sanitize 정합 유지
- 레이더 폴리곤 색상과 캐릭터 랭크 텍스트 색상 팔레트 연동
- Gate-9 이벤트 계약(`rank_promoted`, `character_rank_changed`) 유지 및 검증 스크립트 동기화
- 보상 게이트 의존 제거 및 미션 단위 소량 보상 + 퀘스트 완료 보너스 구조 도입
- 회복력 clean quest completion 보너스 도입(실패 없이 완료해도 성장)
- 모바일 퀘스트 모달을 하단시트 + 레이어 스크롤 구조로 조정
- 영어 서브라벨(`StartAt/DueAt/EstimateMin`) 제거
- 추천 퀘스트 선택 시 `estimatedTimeMin` 자동 반영으로 소요시간 동기화
- 점수 표시는 누적 점수(`totalScore`)만 노출하도록 정리
- 캐릭터 랭크 자동 승급 제거 + `[랭크UP!]` 수동 승급 도입
- 검증 PASS(2026-02-28): `npm run typecheck`, `npx vitest run features/mvp/lib/reward.test.ts`(11 tests), `npm run test:mvp`(13 files/80 tests)
- 추천 리스트 확장 시 모바일 모달 스크롤 보장(모달 높이 제한 + sticky 헤더/닫기 버튼 접근성 확보)
- 시간 메타 카드(시작 예정/마감 기한/소요 시간) 높이 축소(약 56px)로 상단 공간 확보
- 퀘스트 생성 모달 하단에 입력(STT 포함)+생성 버튼 가로 배치로 CTA 접근성 개선
- 추천 조합 로직 재구성: 상위 3개는 유사도 가중 복합 점수 우선, 하위 2개는 연관도 우선
- 레이더/스탯/캐릭터 랭크 점수 라벨에서 `누적`/`점` 텍스트 제거(숫자만 노출)
- 검증 PASS(2026-02-28): `npm run typecheck`, `npm run test:mvp`(13 files/80 tests)
- 추천 조합 정렬을 `both-high` 우선 tie-break로 재튜닝(상위3=유사도 우선, 하위2=연관도 우선)
- 퀘스트 제목 입력창을 상단 원위치 복구하고 footer는 별도 보조 텍스트박스로 분리
- 생성 모달 헤더 겹침 원인(`.app` stacking context) 해결: `.app { z-index: auto; }` + backdrop z-index 상향
- 퀘스트 생성/수정 모달 내부 추천리스트 스크롤 제거(모달 스크롤 단일화)
- 검증 PASS(2026-02-28): `npm run typecheck`, `npm run test:mvp`(13 files/80 tests)
- footer 보조 텍스트박스 제거 후 피드백(`questComposerFeedback`)을 생성 버튼 좌측으로 이동
- 퀘스트 제목 입력창을 분 증감 버튼 아래로 재배치하고 라벨 텍스트(`퀘스트 이름`) 삭제
- 생성 모달 타이틀 `퀘스트 생성`으로 정리(`AI` 제거), STT 칩을 헤더 우측 액션 영역으로 고정
- 검증 PASS(2026-02-28): `npm run typecheck`, `npm run test:mvp`(13 files/80 tests, 413ms)

### 🟡 IN PROGRESS
- 없음

### ⚠️ BLOCKERS
- 없음

## Key Decisions
- 점수 모델은 `totalScore/displayScore/carry` 정수 상태를 단일 소스로 사용
- 랭크 계산은 `floor(totalScore / 100)` 밴드 기반으로 통일
- 캐릭터 랭크는 5스탯 최소 밴드(`min(totalScore)`)를 기준으로 산정
- UI 표시값은 `displayScore(0~99)`를 캐릭터 밴드 기준으로 재동기화
- 보상 지급은 게이트 의존 대신 `미션 단위 보상 + 퀘스트 완료 보너스` 2단 구조로 운영
- 회복력은 clean completion 보너스를 통해 실패 이벤트 없이도 누적 성장 허용
- 퀘스트 모달 모바일 UX는 하단시트 + 내부 레이어 스크롤 패턴으로 고정
- 추천 퀘스트 선택 시 `estimatedTimeMin`을 자동 주입해 입력 마찰을 최소화
- 점수 UI는 누적 점수(`totalScore`) 단일 노출로 통일
- 캐릭터 랭크 승급은 자동 승급 대신 `[랭크UP!]` 수동 액션으로 제어
- 추천 5개는 단일 정렬이 아닌 `3(유사도 가중) + 2(연관도 우선)` 하이브리드 노출로 구성
- 모바일 모달은 길이 증가 시 `max-height + 내부 스크롤 + sticky 헤더`로 닫기/입력 접근성 우선
- 퀘스트 생성 CTA는 모달 하단 입력+버튼 가로 조합을 기본 패턴으로 사용
- 모달이 헤더에 가려지는 이슈는 `fixed backdrop` 자체가 아니라 상위 컨테이너 stacking context(`.app z-index`) 영향으로 판단
- 저장소 마이그레이션 키는 `v3`로 고정하고 구버전 데이터는 리셋 처리
- Gate-9는 `rank_promoted`/`character_rank_changed`를 필수 이벤트로 유지

## Files In Scope
- `features/mvp/types/domain.ts`
- `features/mvp/lib/reward.ts`
- `features/mvp/lib/rank.ts` (new)
- `features/mvp/lib/storage.ts`
- `features/mvp/lib/kpi.ts`
- `features/mvp/components/mvp-dashboard.tsx`
- `features/mvp/stats/components/stats-view.tsx`
- `features/mvp/shared/model/radar-shape.ts`
- `features/mvp/shared/model/display-utils.ts`
- `features/mvp/lib/reward.test.ts`
- `features/mvp/shared/model/display-and-events.test.ts`
- `scripts/verify-release-gate.mjs`
- `package.json`
- `docs/TRACEABILITY_MATRIX.md`

## Quick Resume
1. 종료 상태: 모바일 퀘스트 모달 하단시트+레이어 스크롤, 영어 서브라벨 제거, 추천 퀘스트 `estimatedTimeMin` 자동 반영, 점수 누적점수 단일 노출, `[랭크UP!]` 수동 승급까지 반영 완료.
2. 검증 상태(2026-02-28): `typecheck` PASS, `reward.test`(11 tests) PASS, `test:mvp`(13 files/80 tests) PASS.
3. 운영 후속: `rank_promoted`/`character_rank_changed` 분포, 랭크 체류일, 일일 5퀘 페이싱 이탈률과 보너스 체감 지표를 KPI로 상시 추적.
4. 추가 반영(2026-02-28): 모바일 모달 스크롤 안정화, 시간 메타 카드 높이 축소, 하단 입력+생성 버튼 배치, 추천 3+2 정렬, 점수 라벨 숫자-only 표기까지 적용 및 회귀 테스트 PASS.
5. 추가 반영(2026-02-28): 추천 정렬 both-high 재튜닝(상위3 유사도 우선/하위2 연관도 우선), 제목 입력창 원위치 복구 + footer 보조 텍스트박스 분리, `.app` stacking context 해제로 생성 모달 헤더 겹침 수정, 추천리스트 내부 스크롤 제거 및 회귀 테스트 PASS.
6. 추가 반영(2026-02-28): footer 보조 텍스트박스를 제거하고 피드백 메시지를 생성 버튼 좌측으로 배치, 퀘스트 제목 입력창을 분 증감 버튼 아래로 이동(라벨 제거), 생성 타이틀 `퀘스트 생성`으로 변경 및 STT 칩 우측 고정, 회귀 테스트 PASS.
