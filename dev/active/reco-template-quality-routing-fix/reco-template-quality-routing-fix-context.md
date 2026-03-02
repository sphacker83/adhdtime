# Reco Template Quality + Routing Fix - Context

Last Updated: 2026-03-02
Priority: P0

## Session Scope Status (2026-03-02)
1. 도메인별 미션맵 4개 생성: 완료
2. `templates` 2400개 재생성: 완료
3. title 시간 `5/10/15/20/25/30` 정렬: 완료
4. `dataset:validate` errors 0 / warnings 0: 완료
5. 후속 품질 점검(샘플링): 진행 중

## SESSION PROGRESS (2026-03-02)
### ✅ COMPLETED
- 도메인별 미션맵 4개 생성 완료
- `templates` 2400개 재생성 완료
- title 시간 `5/10/15/20/25/30` 정렬 완료
- `npm run -s dataset:validate` 결과 errors 0 / warnings 0 확인

### 🟡 IN PROGRESS
- 후속 품질 점검(샘플링 기반 정합/다양성 확인)

### ⏭ NEXT
- 재생성 결과 샘플링 점검(도메인-미션 정합, 표현 반복도) 1회 실행
- title 시간 슬롯(`5/10/15/20/25/30`)별 표기 자연성 빠른 리뷰
- 점검 결과를 tasks 문서에 반영하고 본 세션 종료

## Phase 3 Run Record Summary (2026-03-02)
- `data/concepts.json`
  - updated concept IDs: `ADMIN.BILLS_PAY`, `ADMIN.BANKING_REVIEW`, `ADMIN.TAX_PREP`, `ADMIN.DOCUMENT_SCAN`, `ADMIN.APPOINTMENT_SCHEDULE`, `ADMIN.INSURANCE_CHECK`, `ADMIN.SUBSCRIPTIONS_MANAGE`, `ADMIN.TRAVEL_PLAN`
- `data/clusters.json`
  - updated cluster IDs: `ADMIN_BILLS_PAY`, `ADMIN_BANKING_REVIEW`, `ADMIN_TAX_PREP`, `ADMIN_DOCUMENT_SCAN`, `ADMIN_APPOINTMENT_SCHEDULE`, `ADMIN_INSURANCE_CHECK`, `ADMIN_SUBSCRIPTIONS_MANAGE`, `ADMIN_TRAVEL_PLAN`
- `data/lexicon.json`
  - updated lexicon IDs: `ADMIN.BILLS_PAY`, `ADMIN.BANKING_REVIEW`, `ADMIN.TAX_PREP`, `ADMIN.DOCUMENT_SCAN`, `ADMIN.APPOINTMENT_SCHEDULE`, `ADMIN.INSURANCE_CHECK`, `ADMIN.SUBSCRIPTIONS_MANAGE`, `ADMIN.TRAVEL_PLAN`
- reference integrity check
  - missing reference IDs: `0`
  - inspected IDs: `none`
- validate / quality gate
  - command: `npm run -s dataset:validate`
  - result: `PASS (errors 0 / warnings 0)`
  - command: `npm run -s dataset:quality:gate`
  - result: `PASS (warnings 1)`
  - quality metrics: `lexiconCoveragePct 10.08%`, `top1 concentration 5.91%`, `domainMismatch 0`

## Known Symptoms
1. 대량 재생성 이후 일부 도메인에서 표현 리듬 유사 구간이 남아 있을 가능성
2. 시간 슬롯 표기(`5/10/15/20/25/30`)는 정렬 완료됐지만 체감 자연성 검토가 필요할 수 있음
3. 최종 샘플링 점검 결과를 문서에 동기화해야 인수인계 공백이 없음

## Key Files
- `data/templates.json`
- `data/concepts.json`
- `data/clusters.json`
- `data/lexicon.json`
- `docs/promguide.md`
- `docs/dataset-schemas.md`

## Track Note
- 라우팅 분석/교정은 본 트랙에서 제외되었고, 별도 라우팅 트랙으로 이관한다.

## Quality Rules Snapshot
- 미션은 `지금 바로 수행 가능한 행동`이어야 함
- 포괄/메타 문장 금지
- 제목 목적과 무관한 미션 금지
- 클러스터 단위 표현 다양성 유지(동일 선두 표현 과반 금지)

## Quick Resume
1. `...-tasks.md`의 후속 품질 점검 1건 수행
2. 점검 결과를 `SESSION PROGRESS`와 tasks 체크박스에 동기화
3. 라우팅은 out-of-scope 유지 상태로 세션 마감
