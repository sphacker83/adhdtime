# concept-tags-variation Context

## 배경
- 태그 변형(tags variation) 작업을 도메인 단위로 쪼개서 안전하게 병렬 처리하기 위한 준비 트랙.
- 원본 데이터는 `data/concepts.json`이며, 이 단계에서는 수정 금지(읽기 전용).

## 입력 데이터
- 파일: `data/concepts.json`
- 형태: `{ version: number, concepts: Concept[] }`
- Concept 최소 필드: `conceptId`, `domain`, `type`, `label`, `description`, `tags`

## 출력 (샤드)
- 경로: `dev/active/concept-tags-variation/shards/`
- 파일: `DOMAIN.jsonl` (DOMAIN: `HOME/WORK/STUDY/ADMIN/SOCIAL/HEALTH/ROUTINE/STATE`)
- JSONL 라인 스키마(필드 제한): `{conceptId, domain, type, label, description, tags}`

## SESSION PROGRESS
- 2026-03-01
- 샤딩 생성 완료: `dev/active/concept-tags-variation/shards/*.jsonl`
- 도메인별 라인 수(=컨셉 수) / 총 637
  - WORK: 102
  - HOME: 96
  - STUDY: 81
  - STATE: 75
  - ROUTINE: 73
  - ADMIN: 73
  - HEALTH: 69
  - SOCIAL: 68
- tags 길이 범위(전체): min=5, max=15 (요구사항 3~15 범위 충족)
  - HEALTH: min=10, max=15
  - STATE: min=12, max=15
- JSONL 유효성: `jq -c .`로 8개 파일 모두 파싱 OK
- HEALTH+STATE 태그 재작성(확장) 완료
  - 산출물 매핑: `dev/active/concept-tags-variation/mappings/health-state.tags.json`
- `npm run dataset:validate`: FAIL
  - 원인: `package.json`은 `tsx scripts/validate-data.ts`를 가리키지만 `scripts/` 디렉터리/파일이 저장소에 없음(`ERR_MODULE_NOT_FOUND`)
- HOME/ROUTINE tags 재작성 매핑 생성(원본 `data/concepts.json` 미수정)
  - 입력: `dev/active/concept-tags-variation/shards/HOME.jsonl`, `dev/active/concept-tags-variation/shards/ROUTINE.jsonl`
  - 출력: `dev/active/concept-tags-variation/mappings/home-routine.tags.json`
  - 커버리지: 169 concepts (HOME=96, ROUTINE=73) 전부 포함
  - tags 길이 범위: min=12, max=15 (중복 제거/키워드 형태 유지)

- 2026-03-01
- WORK/STUDY 태그 재작성 매핑 생성: `dev/active/concept-tags-variation/mappings/work-study.tags.json`
  - updates 수: 183 (WORK 102 + STUDY 81)
  - tags 길이 통계: min=3, max=15, avg=8.57
  - 정합성: 샤드(`WORK.jsonl`/`STUDY.jsonl`)의 `conceptId`와 1:1 매칭(누락/추가 없음)
  - 품질 점검: tags 중복 없음, JSON 파싱 OK

- 2026-03-01
- ADMIN/SOCIAL tags mapping 완료 (원본 `data/concepts.json` 미수정)
  - 출력: `dev/active/concept-tags-variation/mappings/admin-social.tags.json`
  - 커버리지: 141 concepts (ADMIN=73, SOCIAL=68) 전부 포함
  - tags 길이 통계
    - ADMIN: min=4, max=14, avg=8.79
    - SOCIAL: min=4, max=12, avg=7.99
  - 메모: 요청 포맷에 맞춰 `tagsByConceptId`(object) 스키마로 저장
