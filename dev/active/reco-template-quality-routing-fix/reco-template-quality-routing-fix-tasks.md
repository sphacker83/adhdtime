# Reco Template Quality + Routing Fix - Tasks

Last Updated: 2026-03-02
Priority: P0

## Session Priority Board (2026-03-02)
1. 도메인별 미션맵 4개 생성: ✅ COMPLETE
2. templates 2400개 재생성: ✅ COMPLETE
3. title 시간 5/10/15/20/25/30 정렬: ✅ COMPLETE
4. dataset:validate errors/warnings 0: ✅ COMPLETE
5. 라우팅 분석/교정: ⏭ OUT OF SCOPE (별도 트랙)

## Phase 0: Setup ✅ COMPLETE
- [x] 사이드 플랜 트랙 생성(`plan/context/tasks`)
- [x] `templates` 스키마 상한 제거 완료
- [x] C/C/L(`concepts/clusters/lexicon`) 스키마 정렬 반영 완료

Acceptance Criteria
1. `plan/context/tasks` 3개 파일이 모두 존재하고 `Last Updated: 2026-03-02`로 동기화되어 있다.
2. `templates` 스키마 상한 제거 및 C/C/L 스키마 정렬 반영 완료 항목이 체크되어 있다.

## Phase 1: Mission Map + Template Regeneration ✅ COMPLETE
- [x] 도메인별 미션맵 4개 생성 완료
- [x] `templates` 2400개 재생성 완료
- [x] `npm run -s dataset:validate` 통과(errors 0 / warnings 0)

Acceptance Criteria
1. 도메인별 미션맵 4개 생성/`templates` 2400개 재생성 완료 상태가 문서에 체크되어 있다.
2. validate 통과 결과(errors 0 / warnings 0)가 기록되어 있다.

## Phase 2: Title Time Alignment ✅ COMPLETE
- [x] title 시간 `5/10/15/20/25/30` 정렬 완료
- [x] 시간 슬롯 순서/표기 일관성 점검 완료

Acceptance Criteria
1. title 시간 슬롯이 `5/10/15/20/25/30` 순서로 정렬되어 있다.
2. 시간 표기 형식이 일관된다.

## Phase 3: Validation ✅ COMPLETE
- [x] `npm run -s dataset:validate` 결과 errors 0 / warnings 0 확인

Acceptance Criteria
1. 검증 결과가 errors 0 / warnings 0으로 기록되어 있다.

## Phase 4: Post-Generation Quality Follow-up (P1) 🟡 IN PROGRESS
- [ ] 샘플링 기반 품질 점검 1회(도메인-미션 정합/표현 다양성/시간 표기 자연성)

Acceptance Criteria
1. 샘플링 점검 결과가 context/tasks에 한 줄 이상 기록되어 있다.

## Out of Scope Note
- 라우팅 분석/교정은 별도 트랙으로 관리한다.

## Session Close
- [x] `...-context.md` SESSION PROGRESS 갱신
- [x] 완료 항목 4건 반영(도메인별 미션맵 4개, templates 2400개 재생성, title 시간 정렬, validate 0/0)
- [ ] 후속 품질 점검 1건 반영
- [x] 라우팅 out-of-scope 상태 유지 반영
