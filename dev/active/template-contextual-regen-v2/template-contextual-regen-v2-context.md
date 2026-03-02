# Template Contextual Regen v2 - Context

Last Updated: 2026-03-02
Priority: P0

## 현재 상태
- 트랙 상태: CLOSED
- 진행 단계: Phase 4 완료 (전체 Phase 종료)
- 기준 문서: `docs/promguide.md`, `docs/dataset-schemas.md`, `data/validation_rules.json`

## 작업 기준선
- 목표 수량: 2000개 이상
- 수량 정책: 가변(검증 규칙 충족 시 추가 허용)
- 커버리지: 120클러스터 전체
- 단위 정책: `1티켓 = 1건`

## 완료 요약
- 2000개 템플릿 생성/병합 완료
- domain 가변 수량 정책 반영 완료
- 120클러스터 커버리지 반영 완료
- `dataset:validate` 최종 결과 errors 0 / warnings 0
- 호환 스모크: missioning exact-title 테스트 통과

## 고정 운영 규칙
1. 배치 생성 금지, 매건 신규 생성
2. 단건 루프 강제
- `맥락카드 -> 생성 -> 맥락검증 -> validate -> 채택/폐기`
3. 우수사례 맵 참조 제한
- `health_state/work_admin`는 아이디어 참조만 허용
- 문장 복붙/치환 금지
4. missions 규칙
- 최소 3개
- 최대는 `validation_rules` 기준(`null`이면 상한 없음)

## 실행 로그 템플릿 (티켓당)
- 티켓 ID:
- 클러스터:
- 맥락카드 요약:
- 생성 결과: 신규 1건
- 맥락검증: pass/fail + 사유
- validate: pass/fail + 핵심 로그
- 최종 결정: 채택/폐기

## 실행 로그 (명령/결과 요약)
- 명령: `npm run -s dataset:validate`
- 결과: templates 2000, concepts 1200, clusters 120, errors 0, warnings 0
- 명령: `npx vitest run features/mvp/lib/missioning.test.ts -t "exact title"`
- 결과: 1 passed, 9 skipped (missioning exact-title 스모크 통과)

## 잔여 후속 (선택)
1. `dataset:quality:gate` 주기 실행 자동화
2. missioning exact-title 스모크를 CI pre-merge 게이트에 편입
