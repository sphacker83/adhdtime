# Reco Template Quality + Routing Fix - Tasks

Last Updated: 2026-03-01
Priority: P0

## Phase 0: Setup ✅ COMPLETE
- [x] 사이드 플랜 트랙 생성(`plan/context/tasks`)
- [x] 문제 2개를 P0로 고정

## Phase 1: Baseline Audit (P0) ⏳ NOT STARTED
- [ ] 템플릿 품질 위반 샘플링 리포트 작성
- [ ] 제목-미션 정합도 위반 유형 분류(최소 3유형)
- [ ] `"운동하기 귀찮아"` 재현 케이스 기준 출력(현재 Top-5) 저장

Acceptance Criteria
1. 품질 위반 케이스가 파일/템플릿 id 기준으로 추적 가능하다.
2. `"운동하기 귀찮아"`의 현재 추천 경로를 재현할 수 있다.

## Phase 2: Template Rewrite Rules Freeze (P0) ⏳ NOT STARTED
- [ ] 미션 구체성 규칙(금지/권장 패턴) 문서화
- [ ] 제목-미션 정합 규칙 문서화
- [ ] 리라이트 배치 단위(클러스터 샤드) 확정

Acceptance Criteria
1. "구체적 vs 포괄적" 판정 기준이 명확하다.
2. 리라이트 중 품질 기준이 흔들리지 않는다.

## Phase 3: Full Template Rewrite (P0) ⏳ NOT STARTED
- [ ] `data/templates.json` 전량 리라이트(제목/미션)
- [ ] 포괄 문장 제거 및 구체 지시문으로 교체
- [ ] 제목과 무관한 미션 0건 보장
- [ ] `sum(estMin)==time.default` 및 스키마/휴리스틱 유지

Acceptance Criteria
1. 템플릿 전체가 `docs/promguide.md` 톤/구체성 규칙을 만족한다.
2. `npm run -s dataset:validate` 결과 errors/warnings 0이다.

## Phase 4: Routing Root-Cause Analysis (P0) ⏳ NOT STARTED
- [ ] `"운동하기 귀찮아"` 입력의 매핑 경로 분석(입력 -> concept -> cluster -> template)
- [ ] WORK 편향 발생 지점 식별
- [ ] 원인별 수정안(lexicon/mapping/룰)을 우선순위로 정리

Acceptance Criteria
1. WORK 추천으로 튀는 기술적 원인이 문서로 고정된다.
2. 수정 포인트가 파일 단위로 특정된다.

## Phase 5: Fix + Regression (P0) ⏳ NOT STARTED
- [ ] 원인 수정 반영(데이터/룰)
- [ ] 대표 질의셋(최소 10개)로 회귀 검증
- [ ] `"운동하기 귀찮아"` 결과가 HEALTH/STATE 중심으로 교정됨을 확인

Acceptance Criteria
1. 문제 질의에서 의도와 맞는 도메인 추천이 우선 노출된다.
2. `dataset:validate`가 계속 통과한다.

## Session Close
- [ ] `...-context.md` SESSION PROGRESS 갱신
- [ ] 완료 체크박스 최신화
