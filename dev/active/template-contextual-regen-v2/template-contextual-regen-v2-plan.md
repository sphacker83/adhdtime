# Template Contextual Regen v2 - Plan

Last Updated: 2026-03-02
Priority: P0

## 목표
- `templates` 신규 생성 목표: 2000개
- 수량 정책: 가변 수량(검증 규칙 충족 시 2000개 초과 허용)
- 커버리지: 120개 클러스터 전부 반영
- 품질 게이트: `npm run -s dataset:validate` errors 0 / warnings 0

## 범위
### In Scope
- `templates` 신규 작성/검증/채택
- 단건 생성 루프 적용(`맥락카드 -> 생성 -> 맥락검증 -> validate -> 채택/폐기`)
- 멀티 에이전트 샤딩 운영(`1티켓 = 1건`)
- missions 개수 규칙을 `validation_rules`와 동기화

### Out of Scope
- 추천 알고리즘/서빙 로직 변경
- UI/화면/라우팅 수정
- `templates` 외 데이터 파일 대규모 구조 변경

## 수용 기준 (AC)
1. 총 채택 템플릿이 2000개 이상이다.
2. 120개 클러스터 모두 최소 1건 이상 채택 템플릿을 가진다.
3. 모든 생성 이력은 `1티켓 = 1건` 단위로 추적 가능하다.
4. missions 규칙이 `최소 3개`, 최대는 `validation_rules` 기준(`null`이면 상한 없음)과 일치한다.
5. 최종 `dataset:validate` 결과가 errors 0 / warnings 0이다.

## 리스크 및 대응
- 리스크: 속도 압박으로 배치 생성이 재도입될 수 있음
- 대응: PR/리뷰 체크리스트에 `배치 생성 금지` 항목 고정

- 리스크: `health_state/work_admin` 문장 복붙 발생
- 대응: 참조 정책 위반 시 즉시 폐기, 재작성 큐 이관

- 리스크: 120클러스터 편중(일부 클러스터 미달)
- 대응: 클러스터별 카운트 보드 운영, 미달 클러스터 우선 배정

## 단계
### Phase 0 - 운영 준비 (완료)
- 규칙 문서 동기화(`docs/promguide.md`)
- 티켓 템플릿 확정(맥락카드/검증결과/채택결정 포함)

### Phase 1 - 샤딩 시작 (완료)
- 에이전트별 클러스터 할당
- `1티켓 = 1건` 단위로 작업 시작

### Phase 2 - 단건 루프 실행 (완료)
- 맥락카드 작성
- 1건 생성
- 맥락검증
- validate
- 채택/폐기

### Phase 3 - 통합 검증 (완료)
- 누적 결과 집계(총량/클러스터 커버리지/폐기사유)
- `dataset:validate` 최종 통과 확인

### Phase 4 - 마감 (완료)
- context/tasks 최신화
- 잔여 리스크/후속 작업 확정

## 현재 상태 (완료 기준)
- 상태: Phase 0~4 전체 완료 (Track Closed)
- 완료 근거: 총 2000개 템플릿 생성/병합 완료
- 완료 근거: domain 가변 수량 정책 및 120클러스터 반영 완료
- 완료 근거: `npm run -s dataset:validate` errors 0 / warnings 0 통과
- 완료 근거: 호환 스모크(missioning exact-title) 테스트 통과
- 마감 처리: context/tasks 문서 동기화 완료
