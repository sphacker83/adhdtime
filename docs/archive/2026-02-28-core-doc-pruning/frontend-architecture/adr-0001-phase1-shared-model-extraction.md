# ADR-0001: Phase 1 순수 유틸 `shared/model` 재배치

- Date: 2026-02-27
- Status: Accepted
- Owners: @codex
- Related:
  - `docs/frontend-architecture/refactor-blueprint.md`
  - `docs/frontend-architecture/refactor-roadmap.md`
  - `dev/archive/frontend-architecture-refactor/frontend-architecture-refactor-plan.md`

## Context

`features/mvp/components/mvp-dashboard.tsx`에 순수 계산/검증/포맷/정렬 로직이 함께 섞여 있어 Phase 1 목표(순수 함수 분리)를 충족하기 어려운 상태였다.

- 현재 상태:
  - 대시보드 내부 로컬 순수 함수 다수
  - 같은 feature 내부에서도 경계가 불명확
- 문제점:
  - 상태/이펙트 코드와 순수 계산 코드가 결합
  - 테스트 범위 설정이 어려움
- 제약:
  - 동작 동일성(behavior parity) 유지
  - `typecheck/lint/test:mvp/build` 통과

## Decision

순수 함수/타입을 `features/mvp/shared/{model,types}`로 이동하고, `features/mvp/shared/index.ts`를 공개 API로 사용한다.

- 선택한 옵션:
  - `shared/model`: 순수 계산/검증/포맷 함수
  - `shared/types`: 도메인 보조 타입
  - `shared/index.ts`: 재export 경계
- 선택 근거:
  - Phase 1 요구사항(`shared` 또는 `model`) 직접 충족
  - 대시보드 import를 구조적으로 단순화
  - 테스트 타깃을 모듈 단위로 고정 가능
- 적용 범위:
  - task-meta/schedule/mission-runtime/display/radar/events normalize
  - `mvp-dashboard.tsx`의 관련 로컬 함수 제거 및 import 치환

## Alternatives Considered

1. 기존 `features/mvp/lib/*` 유지
  - 장점: 변경량 최소
  - 단점: 목표 아키텍처(`shared/model`)와 불일치
2. 즉시 `task-input`, `timer-runtime` 등 feature 모듈로 세분화
  - 장점: 장기 목표 구조에 더 빠르게 근접
  - 단점: Phase 1 범위를 초과해 회귀 리스크 증가

## Consequences

- 긍정적 효과:
  - `mvp-dashboard.tsx`에서 순수 로직 로컬 정의를 제거
  - 단위 테스트 작성이 쉬운 파일 경계 확보
- 부정적 영향/기술 부채:
  - `shared/model` 내 파일 수 증가로 index 관리 필요
  - Phase 2에서 reducer/action/selector 경계와 재조정 필요
- 후속 액션:
  - Phase 2에서 상태 전이 로직을 reducer로 이전
  - `shared/index.ts` 공개 API 정책 유지 여부 점검

## Validation Plan

- 수동 시나리오:
  - 과업 생성/미션 생성/타이머 동작/복구 플로우 확인
- 자동 테스트:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:mvp`
  - `npm run build`
- 관찰 지표:
  - 대시보드 파일 크기 감소(2,911 -> 2,629 lines)
  - 신규 `shared/model` 단위 테스트 통과
