# Reco Template Quality + Routing Fix - Implementation Plan

Last Updated: 2026-03-01
Priority: P0

## Executive Summary
`docs/promguide.md` 기준으로 템플릿 품질을 재정렬하고, 다음 2개 문제를 해결한다.

1. 제목과 연관도가 떨어지거나 포괄적인 미션 문장을 제거하고, 미션을 즉시 실행 가능한 구체 지시문으로 전면 리라이트
2. 입력 `"운동하기 귀찮아"`에서 업무 관련 추천이 우선 노출되는 원인을 추적하고, 의도에 맞는 HEALTH/STATE 중심 추천으로 교정

## Scope
### In Scope
- `data/templates.json` 품질 보정(제목-미션 정합, 구체성, 존댓말 지시문)
- 추천 라우팅 원인 분석(lexicon/concept 매칭, concept_to_cluster 매핑, 추천 후보 선택 경로)
- 필요한 데이터/룰 수정과 회귀 검증 시나리오 정의

### Out of Scope
- UI/디자인 변경
- 무관한 도메인 리팩터링
- 추천 엔진의 대규모 알고리즘 교체

## Problem Statements
### Problem A: Template Quality Drift
- 일부 미션이 제목과 직접적으로 연결되지 않음
- 미션 문장이 포괄적/메타적 표현으로 흐름
- 사용자 입력 직후 바로 행동 가능한 수준의 구체성이 부족함

### Problem B: Intent Routing Mismatch
- `"운동하기 귀찮아"`는 HEALTH + STATE 계열 의도가 강함
- 실제 추천이 WORK 중심으로 튀는 현상 존재
- 입력 해석(lexicon/stateHints/concept 매핑) 또는 후보 필터링 우선순위가 원인일 가능성

## Acceptance Criteria
1. 템플릿 품질
- 제목-미션 정합도 규칙을 정의하고, 위반 템플릿 0건
- 포괄/메타 문장(예: "지금 할 수 있는 거 하나 하세요") 제거
- 미션은 동사+대상(+조건/범위) 기반의 구체 지시문으로 작성

2. 라우팅 정확도
- 입력 `"운동하기 귀찮아"` 테스트에서 WORK 우선 추천 제거
- Top-5 중 HEALTH/STATE 관련 클러스터가 의도대로 우선 포함
- 원인 분석 결과를 문서화(입력 -> concept -> cluster -> template 흐름)

3. 검증
- `npm run -s dataset:validate` errors/warnings 0 유지
- 핵심 재현 프롬프트 셋(최소 10개)에서 기대 도메인 분포 확인

## Implementation Phases
### Phase 0: Baseline Capture
- 현재 문제를 재현하는 입력셋 수집
- 템플릿 문장 품질 샘플링 및 위반 유형 분류

### Phase 1: Quality Rule Freeze
- 제목-미션 정합도 체크 기준 문서화
- 구체성 기준(금지/권장 패턴) 확정

### Phase 2: Template Rewrite
- 클러스터 단위 샤딩으로 전량 리라이트
- 포괄/메타 문장 제거 및 구체 지시문으로 교체

### Phase 3: Routing Root-Cause Analysis
- `lexicon.json`의 운동/귀찮음 관련 표현 매핑 점검
- `concept_to_cluster.json`의 STATE -> HEALTH 경로 점검
- 추천 후보 생성/정렬 경로에서 WORK 쏠림 원인 추적

### Phase 4: Fix + Regression
- 데이터/룰/매핑 수정
- 대표 입력셋 회귀 검증
- 결과를 context/tasks에 반영

## Risks And Mitigations
- 리라이트 중 스키마/시간 합계 깨짐: 배치마다 validate 실행
- 라우팅 원인 다중성: 입력 해석/매핑/후보 선정을 단계별 로그로 분리 확인
- 품질 기준 모호성: 금지/권장 예시를 tasks에 고정

## Quick Resume
1. `reco-template-quality-routing-fix-context.md`의 SESSION PROGRESS 확인
2. `...-tasks.md`의 P0 항목부터 처리
3. 배치 작업 후 `npm run -s dataset:validate` 재실행
