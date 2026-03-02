# Reco Template Quality + Routing Fix - Implementation Plan

Last Updated: 2026-03-02
Priority: P0

## Executive Summary
본 트랙은 라우팅 수정이 아니라 JSON 품질 개선에 집중한다. 범위는 `data/templates.json` 품질 고도화, `concepts/clusters/lexicon`(C/C/L) 스키마 정렬 반영 상태 유지, 그리고 C/C/L 데이터 재생성(수정) 실행 계획/실행까지다.

## Session Scope Lock (2026-03-02)
1. templates 품질 고도화(문장 다양성 2차 리라이트)
2. C/C/L 스키마 정렬 반영 상태 유지 및 검증
3. C/C/L 데이터 재생성(수정) 실행

라우팅 이슈는 별도 트랙으로 분리하고 본 트랙 범위에서 제외한다.

## Scope
### In Scope
- `data/templates.json` 품질 보정(보일러플레이트 제거, 문장 다양성 강화, 제목-행동 정합)
- `data/concepts.json`, `data/clusters.json`, `data/lexicon.json` 스키마 정렬 반영 유지
- C/C/L 재생성(수정) 실행 및 검증(`dataset:validate`)

### Out of Scope
- 라우팅 원인 분석/교정(별도 트랙)
- UI/디자인 변경
- 추천 엔진 알고리즘 교체
- 회귀 질의셋 자동 실행/CI 게이트 구현

## Current Completion Snapshot (2026-03-02)
- 도메인별 미션맵 4개 생성 완료
- `templates` 2400개 재생성 완료
- title 시간 `5/10/15/20/25/30` 정렬 완료
- `npm run -s dataset:validate` 결과 errors 0 / warnings 0

## Problem Statements
### Problem A: Template 문장 반복도
- 클러스터 내부에서 유사 문장 패턴이 반복됨
- 표현 다양성이 낮아 템플릿 품질 체감이 떨어짐

### Problem B: 후속 품질 점검 범위 정리 필요
- 대량 재생성 이후 샘플링 기반 품질 점검(도메인-미션 정합/문장 다양성) 범위를 명확히 해야 함
- 점검 결과를 context/tasks에 짧게 동기화해 다음 세션 인수인계를 단순화해야 함

## Acceptance Criteria
1. templates 품질
- 클러스터별 문장 시작 패턴 반복(동일 선두 표현) 케이스를 2개 이하로 축소
- 포괄/메타 문장 탐지 결과 0건
- 제목-행동 정합 위반 케이스 0건

2. C/C/L 재생성
- `concepts/clusters/lexicon` 재생성(수정) 대상이 실행 완료 상태로 기록됨
- 재생성 실행 후 참조 무결성 누락 ID 0건

3. 검증
- `npm run -s dataset:validate` 결과 errors 0 / warnings 0 유지

## Implementation Phases
### Phase 1: Domain Mission Map + Template Regeneration ✅ COMPLETE
- 도메인별 미션맵 4개 생성 완료
- `templates` 2400개 재생성 완료

### Phase 2: Title Time Alignment ✅ COMPLETE
- title 시간 `5/10/15/20/25/30` 정렬 완료
- 시간 라벨 순서/일관성 확인 완료

### Phase 3: Validation + Quality Follow-up 🟡 IN PROGRESS
- `npm run -s dataset:validate` 통과(errors 0 / warnings 0)
- 후속 품질 점검(샘플링 기반 정합/표현 다양성)만 최소 잔여 항목으로 유지

## Risks And Mitigations
- 다양화 과정에서 톤 불일치 발생: `docs/promguide.md` 기준으로 배치별 리뷰
- 재생성 중 참조 누락 발생: 실행 직후 참조 무결성 체크 + validate 고정

## Quick Resume
1. `reco-template-quality-routing-fix-context.md`의 SESSION PROGRESS에서 현재 상태 확인
2. `...-tasks.md`의 후속 품질 점검 1건(샘플링 점검)만 수행
3. 점검 결과를 context/tasks에 동기화하고 세션 종료
