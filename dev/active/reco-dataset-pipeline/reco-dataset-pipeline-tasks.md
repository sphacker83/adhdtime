# Reco Dataset Pipeline - Tasks

Last Updated: 2026-03-01

## Phase 0: Contract Freeze 🟡 IN PROGRESS
- [x] Dev Docs 3파일(`plan/context/tasks`) 생성
- [x] 현재 저장소 경로/파일명 기준으로 파이프라인 진행(모두 `data/*.json`)
- [x] `data/validation_rules.json` 계약 확정 및 반영(필수 파일, validate는 단일 진실 기준으로 읽음)

## Phase 1: User Pipeline Stage 1 - Concepts (1200) ✅ COMPLETE
- [x] `data/concepts.json` 1200개 확장 + conceptId 유니크/enum 검증
- [x] `tags` 길이 3~15 준수 + `tags`를 한 줄 배열로 포맷

## Phase 2: User Pipeline Stage 2 - Mapping + Lexicon ✅ COMPLETE
- [x] `data/concept_to_cluster.json` 생성(map 1200, STATE 125 다의성 3+)
- [x] `data/lexicon.json` 생성(`conceptLexemes` 121, `stateHints` 125)
- [x] lexicon 내 문자열 배열을 한 줄 배열로 포맷

## Phase 3: User Pipeline Stage 3 - Templates (2400) 🟡 IN PROGRESS
- [x] `data/templates.json` 10개 샘플 생성(스키마/휴리스틱/time 합계 검증)
- [x] `data/templates.json` 200개까지 확장(20 클러스터 × 10)
- [x] `data/templates.json` 370개까지 확장(30 클러스터 커버, 일부 클러스터 20개 도달)
- [ ] 기존 템플릿 전체 리라이트: 퀘스트/미션을 “사람이 말하듯” 부드러운 문장 + 존댓말 지시문 중심으로 개선(룰/휴리스틱과 정합)
- [ ] `data/templates.json` 2400개까지 확장(클러스터 120 × 20)

## Phase 4: Validate(검증) 도구 ✅ COMPLETE
- [x] `scripts/validate-data.ts` 추가 + `npm run -s dataset:validate` 통과(errors/warnings 0)
- [x] `data/validation_rules.json` 룰 파일을 validate가 읽도록 전환

## Phase 5: Sample(샘플링) 도구 ⏳ NOT STARTED
- [ ] 샘플링 정책 확정(seed 고정, 추출 기준)
- [ ] 샘플 출력 포맷 정의(요약 통계 + 표본 JSON)
- [ ] 동일 seed 재현성 테스트 시나리오 작성

## Phase 6: Wiring + CI Gate ⏳ NOT STARTED
- [ ] 실행 명령 확정(`npm run reco:dataset:validate`, `npm run reco:dataset:sample` 등)
- [ ] CI 게이트 정책 확정(Shadow → Enforce 또는 단일 Enforce)
- [ ] 실패 대응/롤백 절차를 Quick Resume에 한 줄로 고정

## Session Close
- [ ] `reco-dataset-pipeline-context.md`의 `SESSION PROGRESS` 갱신
- [ ] 완료 체크박스 최신화
