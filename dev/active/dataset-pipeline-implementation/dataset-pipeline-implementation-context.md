# Dataset Pipeline Implementation Context

Last Updated: 2026-03-01

## SESSION PROGRESS
### ✅ COMPLETED
- Dev Docs 트랙 생성: `plan/context/tasks` 3파일 생성
- 구현 범위 고정: 파이프라인 전용, 레거시 호환 없음
- 롤아웃 전략 고정: 2단계(Shadow -> Enforce)
- 런타임 컷오버 반영: `MIN_MISSION_EST_MINUTES` 정책 `2 -> 1` 전환
- UI 최소시간 하드코딩 제거: `Math.max(2, ...)` -> `MIN_MISSION_EST_MINUTES` 참조
- 데이터셋 생성 파이프라인 구현 완료: `scripts/dataset/build-data.ts` + 생성 모듈(`generate-clusters/concepts/mappings/templates/lexicon`)
- 검증 파이프라인 구현 완료: `scripts/validate-data.ts` + 규칙 로딩/검증 + `report/queue` 산출
- `docs/dataset-schemas.md` 모호점 해소 기준 반영 완료(필수 파일, 시간 규칙, 휴리스틱, `clusterKey` 규칙)
- 실행 검증 완료(2026-03-01):
  - `npm run typecheck` PASS
  - `npm run test:dataset` PASS (`4 files`, `11 tests`)
  - `npm run dataset:validate` PASS (`valid=true`)
  - 검증 요약 확인: `clusters=120`, `concepts=600`, `mappings=600`, `templates=1200`, `lexemes=600`
  - 산출물 생성 확인: `output/dataset/validation-report.json`, `output/dataset/rewrite-queue.json`

### 🟡 IN PROGRESS
- 없음

### ⚠️ BLOCKERS
- 없음

## Key Decisions
- 이번 트랙은 데이터셋 파이프라인만 구현한다.
- `concept_to_cluster.json`과 `validation_rules.json`은 본 프로젝트 구현에서 필수 입력으로 취급한다.
- 레거시 포맷 호환(변환/백필/폴백)은 전면 제외한다.
- 1차 롤아웃은 `shadow` 모드로 관측, 2차 롤아웃은 `enforce` 모드로 차단한다.
- 런타임 미션 최소시간은 `MIN_MISSION_EST_MINUTES = 1`을 단일 기준으로 사용한다.

## Pipeline Contract Snapshot
### Required Inputs (6)
- `data/templates.json`
- `data/lexicon.json`
- `data/concepts.json`
- `data/clusters.json`
- `data/concept_to_cluster.json`
- `data/validation_rules.json`

### Current Validation Outputs
- `output/dataset/validation-report.json`
- `output/dataset/rewrite-queue.json`

### Exit Policy
- `dataset:validate` 실행 시 `report.valid === true`이면 종료코드 `0`
- `dataset:validate` 실행 시 `report.valid === false`이면 종료코드 `1`

## Validation Rule Snapshot
- 시간 규칙: `time.min <= time.default <= time.max`
- 시간 규칙: `time.default == sum(missions.estMin)`
- 시작 휴리스틱: 첫 미션은 시작 토큰군과 매칭되어야 함
- 종료 휴리스틱: 마지막 미션은 종료 토큰군과 매칭되어야 함
- `clusterKey`: 정규식 패턴 + 금지 토큰 규칙 동시 통과

## Files In Scope (문서 책임)
- `dev/active/dataset-pipeline-implementation/dataset-pipeline-implementation-plan.md`
- `dev/active/dataset-pipeline-implementation/dataset-pipeline-implementation-context.md`
- `dev/active/dataset-pipeline-implementation/dataset-pipeline-implementation-tasks.md`
- `docs/dataset-schemas.md`

## Remaining Risks / Follow-up TODO (Minimal)
- CI에 `dataset:validate` shadow/enforce 단계가 아직 연결되지 않음(현재는 로컬 검증 기준)
- 규칙 기반 검증은 통과했지만, 생성 템플릿 품질에 대한 소량 수동 QA 샘플링은 후속 필요

## Runtime Cutover Snapshot (2026-03-01)
- 정책 전환: 미션 최소 추정시간 `2분 -> 1분`
- 반영 파일:
  - `features/mvp/types/domain.ts`
  - `features/mvp/components/mvp-dashboard.tsx`
- 검증 기준:
  - `npx tsc --noEmit`
  - `rg`로 `Math.max(2, ...)` 패턴 잔여 여부 점검

## Quick Resume
1. CI에 `dataset:validate`를 shadow 단계로 연결
2. shadow 3회 연속 안정성 확인 후 enforce 전환
3. 실패 시 shadow 복귀(rollback) 절차를 한 줄 운영 가이드로 고정
