# Dataset Pipeline Implementation Tasks

Last Updated: 2026-03-01

## Completed: Scope + Implementation
- [x] Dev Docs 3파일(`plan/context/tasks`) 생성
- [x] 구현 범위 고정(파이프라인만, 레거시 호환 없음)
- [x] 2단계 롤아웃(Shadow -> Enforce) 전략 고정
- [x] `docs/dataset-schemas.md` 모호점 해소 항목 정의
- [x] 데이터셋 생성 구현: `scripts/dataset/build-data.ts`
- [x] 생성 모듈 구현: `scripts/dataset/generate-clusters.ts`, `generate-concepts.ts`, `generate-mappings.ts`, `generate-templates.ts`, `generate-lexicon.ts`
- [x] 입력/출력 공통화: `scripts/dataset/io.ts`
- [x] 검증 구현: `scripts/validate-data.ts` (시간 규칙, 시작/종료 휴리스틱, `clusterKey` 금지 규칙 포함)
- [x] 산출물 구현: `output/dataset/validation-report.json`, `output/dataset/rewrite-queue.json`
- [x] 런타임 정책 전환: `MIN_MISSION_EST_MINUTES` `2 -> 1`
- [x] `mvp-dashboard.tsx` 미션 최소시간 하드코딩(`Math.max(2, ...)`) 제거 및 상수 참조 통일

## Completed: Execution Verification (2026-03-01)
- [x] `npm run typecheck` PASS
- [x] `npm run test:dataset` PASS (`4 files`, `11 tests`)
- [x] `npm run dataset:validate` PASS (`valid=true`)
- [x] 검증 수량 확인: `clusters=120`, `concepts=600`, `mappings=600`, `templates=1200`, `lexemes=600`
- [x] report/queue 생성 확인
- [x] `npx tsc --noEmit` PASS
- [x] `rg` 기반 2분 하드코딩 점검 완료(`mvp-dashboard.tsx` 내 `Math.max(2, ...)` 잔여 없음)

## Remaining TODO (Minimal)
- [ ] CI shadow 단계에 `dataset:validate` 연결(머지 비차단)
- [ ] shadow 안정성 확인 후 enforce 전환 + rollback 한 줄 운영 가이드 추가

## Session Close
- [x] `context.md` 진행 상태 업데이트
- [x] `tasks.md` 체크박스/AC 최신화
