# Template Contextual Regen v2 - Tasks

Last Updated: 2026-03-02
Priority: P0

## Phase 0 - Setup
- [x] 트랙 디렉터리/문서 3종(plan/context/tasks) 생성
- [x] 목표/범위/AC/리스크/단계 정의
- [x] `docs/promguide.md` 단건 루프 규칙 동기화

Acceptance Criteria
1. `plan/context/tasks` 3개 파일이 존재한다.
2. 목표(2000+/가변/120클러스터), AC, 리스크, 단계가 문서화되어 있다.
3. `promguide`에 배치 생성 금지/단건 루프/샤딩 규칙이 반영되어 있다.

## Phase 1 - Sharding Board
- [x] 120클러스터 티켓 큐 생성
- [x] 에이전트별 담당 클러스터 배정
- [x] `1티켓 = 1건` 추적 필드 적용

Acceptance Criteria
1. 클러스터 누락 없이 120개 티켓 큐가 준비된다.
2. 모든 티켓에 단건 추적 필드가 있다.

## Phase 2 - Single-Item Loop Execution
- [x] 티켓 단위 맥락카드 작성
- [x] 1건 신규 생성
- [x] 맥락검증(pass/fail 기록)
- [x] `npm run -s dataset:validate` 실행
- [x] 채택/폐기 결정 및 사유 기록

Acceptance Criteria
1. 티켓당 1건 생성 원칙 위반이 0건이다.
2. missions 개수 규칙이 전건 충족된다(최소 3, 최대는 validation_rules 기준).
3. `health_state/work_admin` 문장 복붙/치환 위반이 0건이다.

## Phase 3 - Integration Validation
- [x] 총 채택 2000개 이상 달성
- [x] 120클러스터 커버리지 달성
- [x] 최종 `dataset:validate` errors 0 / warnings 0 확인
- [x] 호환 스모크(missioning exact-title) 테스트 통과

Acceptance Criteria
1. 수량/커버리지/검증 3개 지표가 모두 충족된다.

## Phase 4 - Closeout
- [x] context 실행 로그 최신화
- [x] 잔여 리스크 및 후속 백로그 등록

Acceptance Criteria
1. 다음 세션이 즉시 재개 가능한 상태로 문서가 정리된다.

## Optional Follow-ups
- [ ] `npm run -s dataset:quality:gate` 정기 실행 자동화
- [ ] missioning exact-title 스모크를 CI pre-merge 필수 게이트로 추가

## 현재 상태 요약
- 완료: Phase 0~4
- 트랙 상태: Closed
- 잔여 항목: Optional Follow-ups 2건
