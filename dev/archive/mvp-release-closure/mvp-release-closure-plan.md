# MVP Release Closure Plan

Last Updated: 2026-02-28

## Executive Summary

MVP 출시 완료를 위해 남은 항목만 집중 처리한다. 범위는 `due-only 수동 검증`, `FR-09 Task 단위 재일정 정합화`, `게이트 자동검증 보강`, `테스트 스크립트 누락 보정`, `최종 문서 동기화`로 제한한다.

## Current State

- 코어 루프 구현은 완료 상태에 가깝다.
- 활성 트랙 `mvp-core-loop`에 미체크 항목 1건이 남아 있다.
- Traceability 기준으로 FR-09/일부 게이트(3/7/8/9)는 `부분/미구현` 상태다.
- `test:mvp` 스크립트에 `reward.test.ts`가 누락되어 있다.

## Target State

- MVP 게이트 기준에서 남은 `부분/미구현`을 모두 해소한다.
- `npm run verify:mvp` 1회 PASS로 최종 확인한다.
- 관련 Dev Docs와 운영 문서를 최신 상태로 동기화한다.

## Scope

### In Scope
- due-only 시나리오 수동 QA
- FR-09(Task 단위 재일정) 구현/검증
- 게이트 자동검증 스크립트 보강
- `test:mvp` 스크립트 보강
- 문서 동기화 및 최종 검증

### Out of Scope
- P1 실기능(실알림 정책 완성, 실 STT, 실 OAuth 동기화)
- P2 성장/협동 확장

## Implementation Phases

### Phase 1: due-only QA 마감
- 작업: 생성/수정/미션 상태 전이에서 `scheduledFor` 자동 재주입 여부 수동 검증
- 수용기준:
  - due-only 입력에서 `scheduledFor`가 의도 없이 생성되지 않는다.
  - 이슈 재현 실패(=정상) 결과를 context/tasks에 기록한다.

### Phase 2: FR-09 Task 단위 재일정 정합화
- 작업: 재일정 경로를 Task 단위 정책으로 고정하고 미션 동반 이동 규칙 보강
- 수용기준:
  - Traceability의 FR-09, UC-07, Gate-8 근거가 코드와 일치한다.
  - 회귀 검증(typecheck/lint/test/build) 통과

### Phase 3: 게이트 자동검증 보강
- 작업: `verify-release-gate`가 문서상 미완 게이트를 검증 가능하게 확장
- 수용기준:
  - 최소 게이트 3/7/8/9에 대한 판정 근거가 스크립트 또는 테스트로 자동화된다.
  - 실패 시 원인 메시지가 명확히 출력된다.

### Phase 4: 테스트 스크립트 누락 보정
- 작업: `test:mvp`에 `reward.test.ts` 포함
- 수용기준:
  - `npm run test:mvp`에서 reward 테스트가 실행된다.

### Phase 5: 문서 동기화 + 릴리즈 확인
- 작업: traceability/release gate/dev docs 최종 반영 후 `verify:mvp` 실행
- 수용기준:
  - `npm run verify:mvp` PASS
  - 관련 문서 Last Updated 및 상태 정합성 확보

## Risks & Mitigations

- 리스크: FR-09 정책 반영 시 기존 복귀 UX 회귀
- 대응: 수동 시나리오 + 기존 자동 테스트 + 게이트 재실행

- 리스크: 게이트 자동화 범위 과확장으로 일정 지연
- 대응: MVP 필수 게이트만 최소 자동화하고 P1은 분리

## Exit Criteria

1. `mvp-core-loop` 남은 체크박스 0
2. FR-09/UC-07/Gate-8 상태가 `완료`로 상향 가능
3. `npm run verify:mvp` PASS
