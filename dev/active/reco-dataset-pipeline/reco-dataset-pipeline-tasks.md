# Reco Dataset Pipeline - Tasks

Last Updated: 2026-03-01

## Phase 0: Contract Freeze 🟡 IN PROGRESS
- [x] Dev Docs 3파일(`plan/context/tasks`) 생성
- [ ] 6파일 최종 경로/파일명 확정(기존 `data/` 구조와 충돌 여부 포함)
- [ ] 스키마 초안 확정(필드명/ID 규칙/참조 관계)
- [ ] 검증 규칙 최소 계약 확정(스키마/무결성/time.default 합계)

## Phase 1: User Pipeline Stage 1 - Concepts (1200) ⏳ NOT STARTED
- [ ] concepts 생성/정규화 규칙 확정(유일키, 정렬, 금지 토큰 등)
- [ ] `concepts.json` 목표 수량(1200) 검증 기준 정의
- [ ] 샘플 픽스처 1개 작성(최소 스키마 통과)

## Phase 2: User Pipeline Stage 2 - Mapping + Lexicon ⏳ NOT STARTED
- [ ] clusters 구조 확정 + 생성 규칙 정의
- [ ] `concept_to_cluster.json` 무결성 규칙 정의(모든 concept 매핑 여부 포함)
- [ ] `lexicon.json` 구조/무결성 규칙 정의(표면형, 동의어, concept 참조)
- [ ] 무결성 실패 케이스 픽스처 작성(존재하지 않는 ID 참조)

## Phase 3: User Pipeline Stage 3 - Templates (1200) ⏳ NOT STARTED
- [ ] templates 스키마 확정(참조 필드, missions 구조, time 필드)
- [ ] 목표 수량(1200) 검증 기준 정의
- [ ] time.default 합계 실패 픽스처 작성(의도적 불일치)

## Phase 4: Validate Script ⏳ NOT STARTED
- [ ] 로더/에러 포맷 표준화(`file`, `pointer`, `ruleId`, `severity`)
- [ ] 스키마 검증 구현 계획 확정(Zod/JSON Schema 등 선택 포함)
- [ ] 무결성 검증 목록 확정 + 테스트 케이스 고정
- [ ] 시간 규칙 구현 + 테스트 케이스 고정(`time.default == sum(missions.estMin)`)
- [ ] `output/reco-dataset/report.json` / `output/reco-dataset/failures.jsonl` 포맷 고정

## Phase 5: Sample Script ⏳ NOT STARTED
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

