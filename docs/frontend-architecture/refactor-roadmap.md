# Frontend Refactor Roadmap

Last Updated: 2026-02-27

## 원칙

- Big-bang rewrite 금지, 단계별 점진 이전
- 각 단계 종료 시 동작 동일성(behavior parity) 확인
- 실패 시 즉시 롤백 가능한 작은 단위로 커밋

## Phase 0: 베이스라인 고정

목표: 현재 동작을 기준선으로 고정하고 추적 지표를 만든다.

- 작업
  - 현재 구조/파일 크기/핵심 플로우 문서화
  - 최소 회귀 시나리오 체크리스트 작성
  - `dev/active/frontend-architecture-refactor` 트랙 생성
- 산출물
  - `refactor-blueprint.md`, `refactor-roadmap.md`, `plan/context/tasks`
- 완료 기준
  - 기준선 지표와 수동 테스트 경로가 문서에 기록됨

## Phase 1: 공통 타입/상수/순수 함수 추출

목표: 거대 컴포넌트의 비-UI 로직을 먼저 분리한다.

- 작업
  - 입력 검증, 시간 계산, 파싱/포맷 함수를 `model`/`shared`로 이동
  - 이벤트 payload 생성 유틸 분리
- 산출물
  - `features/mvp/shared/*`, `features/mvp/*/model/*`
- 완료 기준
  - `mvp-dashboard.tsx`에서 순수 유틸 import 비중 증가
  - 기존 동작 변경 없음

## Phase 2: 상태 경계 재구성

목표: 상태 업데이트를 예측 가능하게 분리한다.

- 작업
  - reducer + action + selector 구조 도입
  - 계산/검증과 side effect 분리
- 산출물
  - `features/mvp/shell/hooks/useMvpStore.ts`(또는 동등 구조)
- 완료 기준
  - 상태 전이가 action 단위로 추적 가능
  - reducer가 순수 함수로 유지됨

## Phase 3: 탭/화면 단위 컴포넌트 분리

목표: 렌더링 책임을 화면 단위로 나눈다.

- 작업
  - 홈/할 일/스탯/설정 뷰 컴포넌트 분리
  - 탭별 props 계약(interface) 명시
- 산출물
  - `shell/components/*View.tsx`
- 완료 기준
  - 상위 대시보드는 조립만 담당
  - 탭별 독립 수정 가능

## Phase 4: 기능 모듈 분해

목표: 입력/리스트/타이머/복귀를 기능 모듈로 완전 분리한다.

- 작업
  - `task-input`, `task-list`, `timer-runtime`, `recovery` 분해
  - 공개 API(`index.ts`)를 통한 참조로 고정
- 산출물
  - feature 모듈별 `components/hooks/model/index.ts`
- 완료 기준
  - deep import 없이 모듈 간 참조 가능
  - 파일당 책임이 명확해짐

## Phase 5: 통합 어댑터 경계 확정

목표: 브라우저 API 및 외부 연동 로직을 격리한다.

- 작업
  - Notification/STT/Sync를 `integrations/` 하위로 이동
  - capability 체크/권한 요청/에러 메시지 표준화
- 산출물
  - `features/mvp/integrations/*`
- 완료 기준
  - UI 계층에서 브라우저 API 직접 접근 제거
  - 장애 시 fallback 경로 일관성 확보

## Phase 6: 정리 및 하드닝

목표: 남은 레거시 제거와 품질 기준을 고정한다.

- 작업
  - 사용하지 않는 상태/함수/스타일 제거
  - 모듈별 회귀 테스트 보강
  - 문서/ADR 동기화
- 산출물
  - 최종 구조 문서와 완료 체크리스트
- 완료 기준
  - `mvp-dashboard.tsx`는 Shell 조립 중심의 얇은 레이어로 축소
  - 품질 게이트 통과

## 리스크와 완화

- 리스크: 분해 중 상태 동기화 오류
  - 완화: reducer action 로그 + 단계별 스모크 테스트
- 리스크: import 순환 의존
  - 완화: feature 공개 API 강제, deep import 금지
- 리스크: 스타일 회귀
  - 완화: 탭 단위 스크린 검증 및 CSS 모듈 분리 기준 적용

## 롤백 전략

- 각 Phase는 독립 커밋으로 분리
- 회귀 발생 시 해당 Phase 커밋만 되돌릴 수 있게 구성
- 문서와 코드 변경을 같은 Phase 단위로 묶어 추적성 확보
