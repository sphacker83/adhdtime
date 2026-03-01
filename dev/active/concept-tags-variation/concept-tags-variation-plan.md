# concept-tags-variation Plan

## 목표
- `data/concepts.json`의 컨셉을 도메인별로 샤딩하여, 태그 변형(tags variation) 작업을 안전하게 병렬/반복 처리할 수 있는 입력 단위를 만든다.
- 이 단계에서는 **원본(`data/concepts.json`)을 수정하지 않는다.**

## 범위
- 입력: `data/concepts.json` (`{ version, concepts[] }`)
- 출력: `dev/active/concept-tags-variation/shards/DOMAIN.jsonl`
  - DOMAIN: `HOME/WORK/STUDY/ADMIN/SOCIAL/HEALTH/ROUTINE/STATE`
  - JSONL 각 라인: `{conceptId, domain, type, label, description, tags}`만 포함
- (추가 출력) 도메인별 태그 재작성 결과 매핑 파일
  - 예: `dev/active/concept-tags-variation/mappings/work-study.tags.json`
  - 스키마: `{ domains: string[], updates: { conceptId: string, tags: string[] }[] }`

## AC (Acceptance Criteria)
- [x] 도메인 8개에 대해 `DOMAIN.jsonl` 파일이 모두 생성된다.
- [x] 각 `jsonl` 파일의 모든 라인이 단일 JSON object이고, 필드는 `{conceptId, domain, type, label, description, tags}`로 제한된다.
- [x] 모든 컨셉의 `tags.length`가 `3~15` 범위에 들어간다(검증으로 확인).
- [x] 출력 `jsonl`은 JSON 파서로 라인 단위 파싱 시 에러가 없다(JSON 유효성).
- [ ] `npm run dataset:validate`가 PASS 한다(데이터셋 검증 게이트).

## 리스크 / 주의
- 샤딩 과정에서 필드 누락/필드 추가가 발생하면 후속 태그 변형 파이프라인에서 diff/머지 리스크가 커진다.
- JSONL은 라인 단위 처리이므로, 개행/인코딩 문제로 파싱이 깨지지 않도록 `-c`(compact) 출력만 사용한다.
- 도메인 값이 스펙과 불일치하는 경우(새 도메인 추가 등) 샤딩이 누락될 수 있으니, 도메인 분포를 항상 함께 기록한다.

## 검증 (이 트랙 기준)
- [x] 샤드 파일 생성 후 도메인별 라인 수가 원본 도메인별 컨셉 수와 일치한다.
- [x] `jq -c .` 또는 동등 절차로 JSONL 라인 파싱이 전부 성공한다.
- [x] `tags.length`가 `3~15` 범위를 벗어나는 컨셉이 없는지 점검한다.
- [ ] `npm run dataset:validate` 실행(결과 `valid=true`).
