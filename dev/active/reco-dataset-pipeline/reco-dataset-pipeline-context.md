# Reco Dataset Pipeline - Context

Last Updated: 2026-03-01

## SESSION PROGRESS (2026-03-01)
### ✅ COMPLETED
- Dev Docs 트랙 생성: `plan/context/tasks` 3파일 생성
- 목표/범위 합의(초안): 추천/검색 엔진용 데이터셋 6파일 + validate/sample 스크립트
- 사용자 파이프라인 1~3단계 정의(컨셉 1200, 매핑+렉시콘, 템플릿 1200)
- 검증 계약 정의(스키마/무결성/time.default 합계)

### 🟡 IN PROGRESS
- 실제 스키마(필드명/ID 규칙/참조 관계) 확정 및 문서화
- validate/sample 스크립트 경로 및 실행 명령 확정

### ⚠️ BLOCKERS / OPEN QUESTIONS
- 6파일의 최종 파일명/디렉터리 규칙이 기존 데이터셋(`data/`) 구조와 충돌하는지 여부 확인 필요
- `templates.json`의 시간 필드 구조(`time`, `missions[].estMin`)가 이미 존재하는 도메인 모델과 동일한지 확인 필요

## Dataset Contract Snapshot (Draft)
### Required Outputs (6)
- `data/reco/templates.json`
- `data/reco/lexicon.json`
- `data/reco/concepts.json`
- `data/reco/clusters.json`
- `data/reco/concept_to_cluster.json`
- `data/reco/validation_rules.json`

### Required Scripts (2)
- `scripts/reco-dataset/validate.ts`
- `scripts/reco-dataset/sample.ts`

### Validation Must-Haves
- 스키마 검증(필수/타입/enum/범위)
- 참조 무결성 검증(키 존재/유일/중복 방지)
- 시간 합계 검증: `time.default == sum(missions.estMin)`

## Decision Log
- (2026-03-01) 파이프라인을 3단계(컨셉 → 매핑+렉시콘 → 템플릿)로 문서화하고 각 단계 목표 수량을 AC로 고정.
- (2026-03-01) validate의 1차 게이트로 time.default 합계 규칙을 강제(검색/추천 UX에서 시간/분량 불일치가 치명적이라고 가정).

## Risks To Watch
- 데이터 생성이 LLM/수작업 혼합인 경우 결과가 흔들릴 가능성(결정성 확보 필요)
- 스키마 확정 전 구현을 시작하면 문서-코드 불일치가 누적될 가능성
- “1200” 목표 수량이 변경될 수 있음(변경 시 문서/검증/테스트 동시 갱신 필요)

## Quick Resume
1. 스키마를 확정한다(필드명/ID 규칙/참조 관계) → `validate`가 강제할 수 있는 수준으로 고정
2. `reco-dataset-pipeline-plan.md`의 “Validation Contract”를 스키마에 맞게 업데이트
3. `reco-dataset-pipeline-tasks.md`의 Phase 0부터 체크박스를 진행

