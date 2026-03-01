# Reco Dataset Pipeline - Context

Last Updated: 2026-03-01

## SESSION PROGRESS (2026-03-01)
### ✅ COMPLETED
- Dev Docs 트랙 생성: `plan/context/tasks` 3파일 생성
- Stage 1 완료: `data/concepts.json`을 1200개로 확장(정렬/중복 제거/enum 검증) + 각 concept의 `tags`를 한 줄 배열로 포맷
- Stage 2 완료: `data/concept_to_cluster.json`(map 1200) + `data/lexicon.json` 생성
  - `concept_to_cluster`: concepts 1200개 전부 매핑, STATE 125개 전부 3개 이상(현재 6개) 클러스터로 다의성 매핑
  - `lexicon`: `conceptLexemes` 121(클러스터 앵커 중심), `stateHints` 125(STATE 컨셉 전체), 문자열 배열은 한 줄 배열로 포맷
- Stage 3 완료: `data/templates.json`을 2400개(120 clusters × 20 templates)로 확장
  - 커버 클러스터: 120개(전 클러스터)
  - 클러스터당 템플릿 수: min=20, max=20
  - 기존 템플릿 포함 전체를 사람 친화적/존댓말 지시문 중심으로 리라이트
  - missions 3~6, 시작/종료 휴리스틱, `sum(estMin)==time.default` 규칙 충족
- 검증 도구/검증 명령: `scripts/validate-data.ts` + `npm run -s dataset:validate` 기준 errors/warnings 0 통과
- `data/validation_rules.json` 복구/추가 + validate가 룰 파일을 단일 진실 기준으로 읽도록 전환
- 중간 산출물 정리: `dev/active/.../(template_batches|concept_batches|lexicon_parts)` 제거(최종 산출물은 `data/*.json`만 유지)
- 커밋: `aa68268` (concepts/mapping/lexicon/templates + validate 도구)

### 🟡 IN PROGRESS
- (선택) 샘플 실행 도구: `scripts/sample-run.ts` (입력 몇 개로 후보 템플릿/컨셉/클러스터 점수 출력)
  - 데이터 레코드는 LLM이 직접 작성(출력)하며, 코드로 자동 조립/치환하지 않음
  - 신규 작성/수정은 사용자 요청이 있을 때만 진행

### ⚠️ BLOCKERS / OPEN QUESTIONS
- lexicon 1:1 매칭 여부: `conceptLexemes`를 모든 concept(1200)에 만들지 않고, 앵커(121)+STATE(stateHints) + tags fallback 방식으로 운영 중(사용자 결정으로 유지)

## Dataset Contract Snapshot (Draft)
### Required Outputs (6)
- `data/templates.json`
- `data/lexicon.json`
- `data/concepts.json`
- `data/clusters.json`
- `data/concept_to_cluster.json`
- `data/validation_rules.json`

### Required Tools (2)
- `scripts/validate-data.ts` (DONE)
- (선택) `scripts/sample-run.ts` (TODO, 사용자 요청 시만)

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
1. `npm run -s dataset:validate`로 현재 데이터 상태 확인
2. Phase 5(샘플링 정책/포맷/재현성) 작업을 시작할지 결정
3. 후속 작업 전 `tasks/context` 체크박스 및 진행 상태 동기화
