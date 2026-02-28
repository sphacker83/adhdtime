# Post-MVP P1 Tasks

Last Updated: 2026-02-28

## Phase 0: 문서/스캐폴딩
- [x] Dev Docs 3종 생성
- [x] 우선순위 및 1차 구현 순서/수용기준 정의
- [x] 알림 capability/permission 헬퍼 추가
- [x] STT capability 헬퍼 추가
- [x] 외부 동기화 도메인 타입 초안 추가

## Phase 1: 알림 FR-10
- [x] 권한 상태 배지 + 권한 요청 액션 UI 연결
- [x] 허용 상태에서 복귀/시작 알림 1차 트리거 연결
- [x] 거부/미지원 fallback 메시지 연결

Acceptance:
- [x] `default/granted/denied/unsupported` 상태가 UI에 정확히 반영된다.
- [x] 권한 허용 시 트리거 이벤트에서 알림 노출이 확인된다.

## Phase 2: STT 1차 연결
- [x] STT 지원 여부 배지 연결
- [x] STT 시작/중지 버튼 연결
- [x] transcript 미리보기 표시 연결

Acceptance:
- [x] 미지원 환경에서 폼 입력 fallback이 정상 동작한다.
- [x] 지원 환경에서 STT 세션 시작/중지 상태가 UI와 일치한다.

## Phase 3: 외부 동기화 1차 연결
- [x] provider mock adapter 인터페이스 추가
- [x] sync job 상태 전이(queued/running/success/failed/conflict) 연결
- [x] conflict 레코드 생성/표시 경로 추가

Acceptance:
- [x] 동기화 상태 전이가 타입 안전하게 관리된다.
- [x] 실패/충돌 시 상태와 로그가 누락 없이 남는다.

## Validation Gate
1. [x] `npm run typecheck`
2. [x] `npm run lint`
3. [x] `npm run test:mvp` (integration adapter tests 포함)
4. [x] `npm run build`
5. [x] `npm run verify:gate`

## Session Close (2026-02-28)

- [x] `npm run verify:mvp` 통합 점검 PASS 확인
- [x] 트랙 문서(`plan/context/tasks`) `Last Updated` 동기화
- [x] 다음 세션 재개용 핸드오프 메모 반영
