당신은 TypeScript/Next.js 코드베이스를 수정하는 시니어 엔지니어다.
아래 요구사항대로 구현하고, 실제 파일 수정 + 테스트 실행 + 결과 보고까지 완료해라.

[작업 목표]
`/Users/ethan/Workspace/dev/adhdtime/features/mvp/lib/missioning.ts`의 로컬 추천 로직을
하드코딩 키워드(`LOCAL_RULES.find`) 중심에서
JSON 프리셋 메타(`keywords`, `keyword_weights`, `intent`, `priority`, `negative_keywords`, `examples`) 기반 점수 추천으로 리팩터링한다.

[참조 데이터]
`/Users/ethan/Workspace/dev/adhdtime/docs/adhd_mission_presets.json`
- 각 항목 구조: `{ schema_version, meta, task }`
- `meta` 필드:
  - `keywords: string[]`
  - `keyword_weights: Record<string, number>`
  - `intent: string`
  - `priority: number`
  - `negative_keywords: string[]`
  - `examples: string[]`
  - `updated_at: string`

[반드시 지킬 요구사항]
1) 기존 fallback 흐름 유지
- `generateLocalMissioning`에서 JSON 추천 실패 시 기존 `LOCAL_RULES` 매칭 사용
- 그것도 실패하면 기존 흐름대로 `null` 반환 (상위에서 AI/기본 템플릿 fallback 유지)

2) 점수 모델 구현
- 입력 문자열 정규화(소문자, 공백 정리)
- `intent` 우선 점수
- `keyword_weights` 일치 합산
- `meta.priority` 가산
- `negative_keywords` 일치 시 감점
- ADHD 실행성 가산:
  - `task.difficulty` 낮을수록 가산
  - `task.estimated_time_min` 짧을수록 가산
  - 첫 mission가 1~2분이면 가산
- 동점 정렬 규칙:
  1. 총점 desc
  2. priority desc
  3. difficulty asc
  4. estimated_time_min asc
  5. task.id asc

3) 범용 입력 처리
- 예: “청소해야돼”, “정리 좀 해야지” 같이 넓은 의도 입력일 때
  - 해당 intent 상위 후보 중 “시작 장벽 낮은 프리셋”이 우선되게 처리
- 예: “내일 일어나서 준비해야 하는데”
  - `sleep_wake_routine` 계열이 우선되도록 점수 설계

4) 프리셋 변환
- JSON `task.missions` -> `MissionTemplate[]` 변환:
  - `step -> action`
  - `min -> estMinutes`
  - `done -> notes`
- difficulty는 도메인 범위(1~3)로 안전하게 매핑/클램프

5) 타입 안정성
- strict TypeScript 에러 없어야 함
- `resolveJsonModule` 기반 JSON import 사용
- 필요한 타입은 `missioning.ts` 내부에 명시적으로 선언
