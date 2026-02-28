# Post-MVP P2 Growth Rank Tasks

Last Updated: 2026-02-28

## Phase 0: Track Setup
- [x] Dev Docs 3파일(plan/context/tasks) 최신화 기준 확정
- [x] v3 정수 점수/세분화 랭크 반영 범위와 AC 확정

## Phase 1: v3 Score + Rank Model
- [x] 정수-only 점수 계산으로 전환(`totalScore/displayScore/carry`, 소수점 퍼센트 제거)
- [x] 랭크 세분화 규칙 반영(`F + (-/0/+)`, `A+` 이후 `S-/S0/S+/SS-...`)
- [x] 페이싱 공식 반영(`F -> E+ = 5퀘(1/2/2)`, `E+ -> A+ = 1825퀘 = 5퀘/일*365`)
- [x] 캐릭터 랭크를 5스탯 `min(totalScore)` 기준으로 계산

## Phase 2: UI + Storage Integration
- [x] `displayScore(0~99)` 기반 레이더 원점 리셋 동기화
- [x] 레이더 색상과 캐릭터 랭크 텍스트 색상 팔레트 연동
- [x] storage key를 `adhdtime:mvp-state:v3`로 전환

## Phase 3: Events + Validation
- [x] Gate-9 필수 이벤트(`rank_promoted`, `character_rank_changed`) 계약 유지
- [x] `npm run verify:mvp` PASS 확인

## Phase 4: Docs Sync
- [x] `post-mvp-p2-growth-rank-plan.md`를 v3 수식/AC 기준으로 갱신
- [x] `post-mvp-p2-growth-rank-context.md` COMPLETED/Key Decisions/Quick Resume 갱신
- [x] `docs/TRACEABILITY_MATRIX.md` FR-07/UC-06/Gate-6/Gate-9 최소 수정 반영

## Phase 5: Reward Bonus + Score Visibility (This Session)
- [x] 보상 게이트 의존 제거 및 미션 단위 보상 전환
- [x] 퀘스트 완료 보너스 반영(회복력 clean quest completion 포함)
- [x] UI 누적 점수(`totalScore`) 노출 강화
- [x] 테스트 완료(`npm run typecheck`, `npx vitest run features/mvp/lib/reward.test.ts features/mvp/shared/model/display-and-events.test.ts`, `npm run test:mvp`)

## Phase 6: Mobile Quest UX + Manual Rank-Up (This Session)
- [x] 모바일 퀘스트 모달을 하단시트 + 레이어 스크롤 구조로 조정
- [x] 영어 서브라벨 제거(`StartAt/DueAt/EstimateMin`)
- [x] 추천 퀘스트 선택 시 `estimatedTimeMin` 자동 반영
- [x] 점수 표시를 누적 점수(`totalScore`) 단일 노출로 정리
- [x] 캐릭터 랭크 자동 승급 제거 + `[랭크UP!]` 수동 승급 도입
- [x] 검증 완료(`npm run typecheck`, `npx vitest run features/mvp/lib/reward.test.ts`=11 tests, `npm run test:mvp`=13 files/80 tests)

## Phase 7: Mobile Composer Refinement + Suggestion Mix (This Session)
- [x] 추천 리스트 확장 시 모달 스크롤 안정화(`max-height`, sticky 헤더, 닫기 접근성 확보)
- [x] 시간 메타 카드(시작 예정/마감 기한/소요 시간) 높이 약 절반 수준으로 축소
- [x] 퀘스트 생성 모달 하단에 입력(STT 포함)+생성 버튼 가로 배치
- [x] 추천 정렬을 `상위 3개(유사도 가중)` + `하위 2개(연관도 우선)` 규칙으로 재구성
- [x] 레이더/스탯/캐릭터 랭크 점수 라벨에서 `누적`/`점` 텍스트 제거(숫자-only)
- [x] 검증 완료(`npm run typecheck`, `npm run test:mvp`=13 files/80 tests)

## Phase 8: Composer Regression Fix + Stacking Root Cause (This Session)
- [x] 추천 정렬을 both-high 기준으로 재정렬(상위3 유사도 우선, 하위2 연관도 우선)
- [x] 상단 `퀘스트 이름` 입력창(STT 포함) 원위치 복구
- [x] footer 좌측 입력창은 제목 입력과 분리된 보조 텍스트박스로 전환
- [x] `.app` stacking context(`z-index`) 해제로 생성 모달이 헤더에 가려지는 현상 수정
- [x] 생성/수정 모달 내 추천리스트 내부 스크롤 제거(모달 스크롤 단일화)
- [x] 검증 완료(`npm run typecheck`, `npm run test:mvp`=13 files/80 tests)

## Phase 9: Composer Layout Final Alignment (This Session)
- [x] footer 보조 텍스트박스 제거
- [x] `questComposerFeedback`를 생성/수정 버튼 좌측으로 이동
- [x] 퀘스트 제목 입력창을 분 증감 버튼 아래로 이동 + 라벨(`퀘스트 이름`) 텍스트 제거
- [x] 생성 모달 타이틀에서 `AI` 제거(`퀘스트 생성`) 및 STT 칩 우측 정렬
- [x] 검증 완료(`npm run typecheck`, `npm run test:mvp`=13 files/80 tests, 413ms)

## Phase 10: Next TODO
- [ ] 모바일 실기기(iOS Safari/Android Chrome)에서 생성/수정 모달 오버레이 레이어링 최종 QA
- [ ] 추천 3+2 노출 품질 점검용 샘플 쿼리 세트 정의 및 회귀 체크리스트 문서화
- [ ] 생성/수정 모달 UX(입력 위치/피드백 위치)에 대한 사용자 확인 후 미세 조정 여부 결정
