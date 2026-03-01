# Reco Dataset Pipeline - Implementation Plan

Last Updated: 2026-03-01

## Executive Summary
추천/검색 엔진에서 사용할 **JSON 데이터셋 파일들**을 생성하고, 이를 **검증(validate)** 및 **샘플링(sample)** 할 수 있는 파이프라인을 구축한다.

데이터 생성은 사용자 파이프라인 3단계(컨셉 1200 → 매핑+렉시콘 → 템플릿 확장)로 구성하며, 검증은 스키마/참조 무결성/시간 합계 규칙을 중심으로 “결정적(Deterministic) 실행”을 목표로 한다.

## Scope
### In Scope
- 산출물(현재 저장소 기준 경로/파일명)
  - `data/templates.json` (목표 수량: 2400 = 클러스터 120 × 20)
  - `data/lexicon.json`
  - `data/concepts.json` (목표 수량: 1200)
  - `data/clusters.json`
  - `data/concept_to_cluster.json`
  - `data/validation_rules.json` (**필수 계약**, validate는 반드시 이 파일을 단일 진실 기준으로 읽는다)
- 스크립트
  - `scripts/validate-data.ts`: 스키마 + 무결성 + 시간 규칙 검증(품질 게이트)
  - (선택) `scripts/sample-run.ts`: 샘플 입력에 대한 추천 후보 출력
    - 데이터 생성용 스크립트가 아니며, 데이터 레코드(templates/concepts/lexicon)를 스크립트로 “조립/치환 생성”하는 행위는 금지
    - 신규 작성/수정은 사용자 요청이 있을 때만 진행
- 검증 규칙(최소 계약)
  - 스키마 검증(필수 필드/타입/enum/범위)
  - 참조 무결성(파일 간 키 참조 일치)
  - 시간 규칙: `time.default` 합계 검증(아래 “Validation Contract” 참조)
- 실행 결과 리포팅(현재는 stdout 요약/에러 출력; 필요 시 파일 리포트로 확장)

### Out of Scope
- 추천/검색 랭킹 알고리즘 변경
- 서비스 런타임(검색/추천 API) 로직 변경
- 레거시 데이터 포맷 자동 마이그레이션(필요 시 별도 트랙)

## Key Decisions
- 입력은 “생성된 데이터셋 6파일”을 기준으로 검증하며, 파일 누락 시 즉시 실패한다.
- 파이프라인은 **재실행 시 동일 결과**(정규화/정렬/seed 관리) 원칙을 따른다.
- 검증 실패는 `pointer`(JSON Pointer), `ruleId`, `severity`, `message`를 포함한 레코드로 남긴다.
- 시간 규칙은 **time.default 합계 규칙을 최우선 게이트**로 둔다(아래 참조).

## Pipeline: User Stages (1~3)
### Stage 1: Concepts (1200)
- 목표: 추천/검색 인덱싱의 최소 단위(개념/토픽/키워드)를 1200개 정의
- 산출: `data/concepts.json`
- AC(요약): 1200개 생성, 키 유일, 최소 필드 충족, 정렬/정규화 완료

### Stage 2: Mapping + Lexicon
- 목표: concepts를 clusters(상위 묶음)로 매핑하고, 검색/추천용 표면형(동의어/표기 변형)을 lexicon으로 구축
- 산출:
  - `data/clusters.json`
  - `data/concept_to_cluster.json` (1:N 매핑)
  - `data/lexicon.json` (concept 중심)
- AC(요약): 모든 concept가 1:N로 매핑(최소 1개 이상), lexicon 참조 무결성 통과

### Stage 3: Templates (2400)
- 목표: 추천/검색 결과/플랜/액션 생성에 사용할 템플릿을 클러스터당 20개 수준으로 확장(총 2400개)
- 산출: `data/templates.json`
- AC(요약): 2400개 생성, 클러스터당 20개 충족, 참조 무결성(개념/클러스터 키) 통과, 시간 규칙 통과

## Validation Contract (Minimum)
### Schema
- 각 파일에 대해 스키마(필수 필드/타입/enum/범위)를 강제한다.

### Referential Integrity (examples)
- `concept_to_cluster.conceptId`는 `concepts[].id`에 존재해야 한다.
- `concept_to_cluster.clusterId`는 `clusters[].id`에 존재해야 한다.
- `lexicon[].conceptId`는 `concepts[].id`에 존재해야 한다.
- `templates[]`가 `conceptId/clusterId`를 참조한다면 반드시 존재해야 한다(필드명은 스키마에 고정).

### Time Rule: time.default 합계 검증
- 템플릿의 시간 규칙 계약(예시 형태, 실제 스키마에 맞춰 고정):
  - `template.time.default === sum(template.missions[].estMin)`
  - 동시에 범위 규칙이 있다면 `time.min <= time.default <= time.max`
- 실패 시:
  - `ruleId: "time.default.sum"`
  - `pointer`: 실패한 템플릿 위치 및 관련 필드 포인터

## Implementation Phases
### Phase 0: Contract Freeze (0.5d)
- 6파일 경로/파일명/필수 여부 확정
- 스키마(초안)와 최소 검증 규칙 확정

Acceptance Criteria
1. 본 문서에 “산출물 6파일 + 스크립트 2개 + 리포트 2개” 계약이 명시되어 있다.
2. 스키마/규칙이 상호 모순 없이 `validate`에서 강제 가능한 형태다.

### Phase 1: Dataset IO + Normalization (1d)
- 로더/라이터(파일 존재/JSON 파싱/에러 포맷 통일)
- 정규화(정렬, 중복 제거, 공백/대소문자 정책 등) 규칙 확정

Acceptance Criteria
1. 파일 누락/파싱 실패가 결정적인 에러 메시지로 표준 포맷 출력된다.
2. 동일 입력(또는 동일 생성 seed)에서 출력이 결정적이다.

### Phase 2: Validate Script (1~2d)
- 스키마 검증
- 참조 무결성 검증
- 시간 합계/범위 규칙 검증
- 산출물: `report.json`, `failures.jsonl`

Acceptance Criteria
1. 실패 레코드는 `ruleId/severity/file/pointer/message`를 포함한다.
2. time.default 합계 실패 케이스가 최소 1개 테스트 픽스처로 고정된다.

### Phase 3: Sample Script (0.5~1d)
- 샘플링 정책(랜덤 seed 고정/스트라타 샘플 등) 정의
- 개발자/운영자가 빠르게 품질을 확인할 수 있는 출력(요약/표본 JSON)

Acceptance Criteria
1. 동일 seed로 동일 샘플을 재현할 수 있다.
2. 샘플 결과에 필수 통계(개수/분포/상위 실패 규칙)가 포함된다.

### Phase 4: Pipeline Wiring (0.5~1d)
- 실행 엔트리/스크립트 명령 확정(`npm run ...` 또는 `pnpm ...`)
- CI 게이트 정책(Shadow → Enforce 또는 단일 Enforce) 확정

Acceptance Criteria
1. 로컬에서 1-command로 validate가 실행된다.
2. CI에서 실패 시 차단되는 기준이 명확히 정의되어 있다.

## Acceptance Criteria (Overall)
1. 6개 데이터 파일이 생성/관리되는 단일 계약을 가진다(누락 불가).
2. `validate`는 스키마/무결성/time.default 합계를 강제하고, 실패를 재작성 가능한 포인터로 기록한다.
3. 사용자 파이프라인 단계별 목표 수량(컨셉 1200, 템플릿 2400)이 검증된다.
4. `sample`은 재현 가능한 샘플(동일 seed)을 제공한다.

## Risks And Mitigations
- 비결정성(생성/정렬/정규화 차이): seed 고정 + 정렬/정규화 규칙을 코드/문서에 고정
- 스키마 드리프트(런타임 기대와 불일치): 스키마를 단일 진실 소스로 유지하고 validate에서 강제
- 참조 불일치(키 변경/누락): 무결성 검증을 “에러”로 두고 failures.jsonl로 즉시 추적 가능하게
- 시간 규칙 오탐/누락: 최소 규칙(time.default 합계)을 우선 게이트로, 추가 규칙은 severity로 분리
- 데이터 품질 편차: sample 스크립트 + 수동 QA 체크리스트(상위 N개 샘플)로 보완

## Test / Validation Scenarios
- 시나리오 A(정상): 6파일 로드 → validate PASS → report.valid=true
- 시나리오 B(스키마): 필수 필드 누락/타입 불일치 → validate FAIL + pointer 기록
- 시나리오 C(무결성): 존재하지 않는 conceptId 참조 → validate FAIL + ruleId=integrity.*
- 시나리오 D(시간): `time.default != sum(missions.estMin)` → validate FAIL + ruleId=time.default.sum
- 시나리오 E(샘플): seed 고정 → sample 결과 동일성 확인(요약 통계 포함)

## Quick Resume
1. `dev/active/reco-dataset-pipeline/reco-dataset-pipeline-context.md`의 `SESSION PROGRESS` 확인
2. `dev/active/reco-dataset-pipeline/reco-dataset-pipeline-tasks.md`에서 “Next” 체크박스부터 진행
3. `npm run -s dataset:validate` 실행 → 실패 항목을 수정(템플릿 재작성 우선)
