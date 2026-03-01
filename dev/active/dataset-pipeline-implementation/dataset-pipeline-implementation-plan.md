# Dataset Pipeline Implementation Plan

Last Updated: 2026-03-01

## Executive Summary
추천 데이터셋의 생성/검증/패키징 파이프라인을 신규 구현한다.  
이번 트랙은 **파이프라인 구현만** 포함하며, **레거시 데이터 포맷 호환 코드는 구현하지 않는다**.  
릴리스는 **2단계 롤아웃(Shadow -> Enforce)** 으로 진행한다.
동일 세션에서 런타임 컷오버로 **미션 최소 추정 시간 정책을 2분에서 1분으로 전환**하고, UI 계산부의 하드코딩 최소값을 도메인 상수(`MIN_MISSION_EST_MINUTES`)로 통일한다.

## Scope
### In Scope
- `data/templates.json`
- `data/lexicon.json`
- `data/concepts.json`
- `data/clusters.json`
- `data/concept_to_cluster.json` (필수)
- `data/validation_rules.json` (필수)
- 파일별 스키마 검증 + 파일 간 참조 무결성 검증
- 템플릿 품질 검증(시간 규칙, 시작/종료 휴리스틱, 금지 표현, `clusterKey` 규칙)
- 파이프라인 산출물 생성(`report.json`, `failures.jsonl`, `normalized-bundle.json`)
- CI 게이트용 실행 명령/실패 조건 정의

### Out of Scope
- 추천 알고리즘/랭킹 로직 변경
- 데이터 생성 프롬프트/모델 튜닝
- 레거시(v0/v1/v2) 포맷 파서, 자동 마이그레이션, 호환 모드

## Key Decisions
- 파이프라인 입력은 6개 파일 고정이며 하나라도 누락되면 즉시 실패한다.
- `time.min <= time.default <= time.max`를 강제한다.
- `time.default == sum(missions.estMin)`를 강제한다.
- 시작/종료 휴리스틱은 토큰 기반 규칙으로 검증한다.
- `clusterKey`는 의미 단위만 허용하며 시간/강도/레벨 토큰은 금지한다.
- 런타임 미션 최소 시간의 단일 기준값은 `MIN_MISSION_EST_MINUTES = 1`이며, 컴포넌트 내부 숫자 하드코딩을 허용하지 않는다.

## Implementation Phases
### Phase 0: Contract Freeze (완료)
- 구현 범위를 파이프라인 전용으로 고정
- 레거시 호환 미지원 명시
- 2단계 롤아웃 전략 확정

Acceptance Criteria
1. 계획/컨텍스트/태스크 문서에 동일한 범위가 반영되어 있다.
2. 스키마 문서의 필수 규칙과 구현 계획이 모순되지 않는다.

### Phase 1: Pipeline Skeleton
- `scripts/dataset-pipeline/run.ts` 진입점 구성(`--input`, `--output`, `--mode`)
- 공통 로더 구현(파일 존재/JSON 파싱/에러 포맷 통일)
- 실행 모드 정의
  - `shadow`: 리포트 생성, 실패가 있어도 프로세스 종료코드 `0`
  - `enforce`: 리포트 생성, 실패가 있으면 종료코드 `1`

Acceptance Criteria
1. 6개 입력 파일 누락 시 에러 코드/메시지가 결정적으로 출력된다.
2. 동일 입력에서 리포트 결과가 결정적(재실행 시 동일)이다.
3. `shadow/enforce`의 종료 정책이 테스트로 고정된다.

### Phase 2: Validators
- 스키마/타입/필수 필드 검증
- 참조 무결성 검증
  - templates ↔ clusters
  - templates ↔ concepts
  - lexicon ↔ concepts
  - concept_to_cluster ↔ clusters
- 품질 검증
  - 미션 개수 범위
  - 금지 표현
  - 시간 규칙 2종
  - 시작/종료 휴리스틱
  - `clusterKey` 패턴 + 금지 토큰

Acceptance Criteria
1. 규칙 위반마다 `ruleId`, `severity`, `file`, `pointer`를 포함한 실패 레코드가 남는다.
2. 시간 규칙과 시작/종료 규칙 위반 케이스가 단위 테스트로 고정된다.
3. `clusterKey` 금지 토큰 위반이 명확히 실패 처리된다.

### Phase 3: Packaging + Reports
- `normalized-bundle.json` 생성(검증 통과 데이터만 포함)
- `report.json`에 통계/실패 요약/경고 수치 기록
- `failures.jsonl`로 재작성 대상 목록 출력

Acceptance Criteria
1. 산출물 3종이 항상 동일 경로에 생성된다.
2. 실패 건수와 상세 목록이 교차 검증된다(합계 일치).
3. 재작성 루프에서 바로 사용할 수 있는 포인터(JSON Pointer)가 포함된다.

### Phase 4: Rollout Stage 1 (Shadow)
- CI에 Shadow 잡 추가(배포 차단 없음)
- 실패 규칙 분포/빈도 수집
- 과도한 오탐 규칙 튜닝(규칙 완화가 아닌 기준 명확화 우선)

Acceptance Criteria
1. Shadow 리포트가 연속 실행에서 안정적으로 생성된다.
2. 상위 실패 규칙 3개의 원인과 조치안이 문서화된다.

### Phase 5: Rollout Stage 2 (Enforce)
- CI 게이트를 Enforce 모드로 전환
- 실패 시 머지 차단
- 운영 핸드오프 문서 확정(실패 대응/롤백 기준)

Acceptance Criteria
1. Enforce 모드에서 실패 케이스가 실제 차단된다.
2. 롤백은 `shadow` 모드로 즉시 복귀 가능하다.
3. 운영 체크리스트와 대응 절차가 컨텍스트/태스크 문서에 반영된다.

### Runtime Cutover Addendum (2026-03-01)
- 대상: `features/mvp/types/domain.ts`, `features/mvp/components/mvp-dashboard.tsx`
- 변경: `MIN_MISSION_EST_MINUTES`를 `2 -> 1`로 전환
- 변경: `Math.max(2, ...)` 형태 최소값 하드코딩 제거, `MIN_MISSION_EST_MINUTES` 참조로 통일
- 검증: `npx tsc --noEmit`, `rg` 기반 하드코딩 잔여 점검

## Validation Gate
1. `npm run typecheck`
2. `npm run lint`
3. `npm run dataset:pipeline -- --mode shadow`
4. `npm run dataset:pipeline -- --mode enforce`

## Risks And Mitigations
- 휴리스틱 오탐: 토큰 목록을 `validation_rules.json`에서 관리하고 테스트 픽스처를 확대
- 규칙 충돌: `docs/dataset-schemas.md`를 단일 진실 소스로 고정
- 대규모 실패 누적: `failures.jsonl` 우선순위(규칙/도메인별) 정렬 출력

## Success Metrics
- Enforce 모드 기준 `ERROR` 0건
- 실패 재작성 루프 1회당 재검증 통과율 80% 이상
- 산출물 생성 시간 CI 기준 60초 이내
