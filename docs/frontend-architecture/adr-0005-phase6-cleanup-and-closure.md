# ADR-0005: Phase 6 레거시 정리와 frontend-architecture 트랙 마감

- Date: 2026-02-28
- Status: Accepted
- Owners: @codex
- Related:
  - `docs/frontend-architecture/refactor-blueprint.md`
  - `docs/frontend-architecture/refactor-roadmap.md`
  - `dev/active/frontend-architecture-refactor/frontend-architecture-refactor-plan.md`

## Context

Phase 5 이후 `mvp` 코드는 `features/mvp/integrations/*`를 사용하지만, 과거 경로인 `features/p1/*`가 코드베이스에 레거시로 남아 있었다.

- 현재 상태:
  - 실행 코드에서 `features/p1/*` 참조는 0건
  - `features/p1/*` 파일은 중복/미사용 상태
  - 일부 문서의 근거 경로가 구 경로(`features/p1/*`)를 가리킴
- 문제점:
  - 유지보수 시 실제 경계와 파일 구조가 불일치
  - 추적 문서의 신뢰도 저하 가능
- 제약:
  - 동작 동일성 유지
  - 최종 회귀 게이트 통과

## Decision

`features/p1/*` 레거시 코드를 제거하고, 문서의 연동 근거 경로를 `features/mvp/integrations/*`로 정리한다.

- 선택한 옵션:
  - `features/p1/*` 삭제
  - `README.md` 프로젝트 구조 정리
  - `docs/TRACEABILITY_MATRIX.md` 근거 파일 경로 갱신
  - 트랙 문서(plan/tasks/context)와 ADR로 마감 상태 고정
- 선택 근거:
  - Phase 6 목표(레거시 제거/문서 마감/최종 회귀) 직접 충족
  - 코드 경계와 문서 경계를 일치시켜 추적성 강화
- 적용 범위:
  - 레거시 feature 디렉터리
  - 아키텍처/추적 문서

## Alternatives Considered

1. `features/p1/*`를 보존하고 deprecated 표기만 추가
  - 장점: 변경량 최소
  - 단점: 중복 코드 유지, 경계 혼선 지속
2. `features/p1/*`를 별도 아카이브로 이동
  - 장점: 히스토리 보존성 향상
  - 단점: 현재 단계에서 운영 복잡도 증가

## Consequences

- 긍정적 효과:
  - 실제 사용 코드와 파일 구조 정합성 확보
  - 아키텍처 경계(`mvp/integrations`)가 물리적으로 고정
  - frontend-architecture 트랙 완료 상태 명확화
- 부정적 영향/기술 부채:
  - 과거 P1 실험 코드 재사용 시 git history 참조가 필요
- 후속 액션:
  - 신규 기능은 `mvp` 경계를 유지해 확장
  - 필요 시 별도 트랙에서 통합 adapter 전략 재검토

## Validation Plan

- 자동 테스트:
  - `npm run verify:mvp`
- 관찰 지표:
  - `features/mvp`에서 `@/features/p1` 참조 0건 유지
  - 최종 게이트(typecheck/lint/test/build/verify:gate) 통과
