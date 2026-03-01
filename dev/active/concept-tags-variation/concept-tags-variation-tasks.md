# concept-tags-variation Tasks

## P0
- [x] Dev Docs 트랙 생성(`plan/context/tasks`)
- [x] `data/concepts.json`에서 도메인별 샤드(`jsonl`) 생성
- [x] 샤딩 결과 도메인별 개수 통계를 `context`에 기록
- [x] WORK/STUDY 태그 재작성 매핑 생성: `dev/active/concept-tags-variation/mappings/work-study.tags.json`
- [x] WORK/STUDY 매핑 검증: `conceptId` 1:1 매칭, tags 길이(3~15), tags 중복 없음
- [x] HOME/ROUTINE 태그 재작성 매핑 생성: `dev/active/concept-tags-variation/mappings/home-routine.tags.json`
- [x] HOME/ROUTINE 매핑 검증: `conceptId` 1:1 매칭, tags 길이(3~15), tags 중복 없음
- [x] ADMIN/SOCIAL 태그 재작성 매핑 생성: `dev/active/concept-tags-variation/mappings/admin-social.tags.json`
- [x] ADMIN/SOCIAL 매핑 검증: `conceptId` 1:1 매칭, tags 길이(3~15), tags 중복 없음
- [x] HEALTH/STATE 태그 재작성 매핑 생성: `dev/active/concept-tags-variation/mappings/health-state.tags.json`
- [x] HEALTH/STATE 매핑 검증: `conceptId` 1:1 매칭, tags 길이(3~15), tags 중복 없음

## 검증
- [x] `tags.length`가 `3~15` 범위인지 점검 (전체 min=5, max=15 / HEALTH min=10, max=15 / STATE min=12, max=15)
- [x] JSON 유효성(라인 단위 JSON 파싱) 확인 (`jq -c .` OK)
- [ ] `npm run dataset:validate` 실행 (현재 `scripts/validate-data.ts` 누락으로 실패)
