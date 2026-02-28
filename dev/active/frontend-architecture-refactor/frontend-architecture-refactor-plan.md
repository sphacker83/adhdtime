# Frontend Architecture Refactor - Plan

Last Updated: 2026-02-28

## Executive Summary

무너진 프론트엔드 구조를 기능 동등성을 유지하며 단계적으로 복구한다. 핵심은 단일 거대 컴포넌트(`mvp-dashboard.tsx`)의 책임 분리와 모듈 경계 확립이다.

## Current State

- 라우트 엔트리: `app/page.tsx` -> `MvpDashboard` 단일 진입
- 핵심 병목:
  - `features/mvp/components/mvp-dashboard.tsx` 2,078 lines (Phase 4 모듈 분해 반영)
  - `features/mvp/components/mvp-dashboard.module.css` 988 lines
- 결과: shell 조립 레이어로 축소가 진행되었고 탭/기능 UI는 feature 모듈로 분리됨
- 연동 경계: notification/stt/sync adapter가 `features/mvp/integrations/*`로 분리됨

## Progress Snapshot

- Phase 0: 완료
- Phase 1: 완료
  - 순수 함수/타입/상수 추출 및 `shared/model` 재배치
  - 단위 테스트 추가 + 회귀 게이트 통과(typecheck/lint/test:mvp/build)
- Phase 2: 완료
  - `core-state`를 types/actions/reducer/selectors로 분해
  - `useMvpStore` 도입으로 hydration/persist/reset 경로 단일화
  - `mvp-dashboard.tsx`에서 store hook + selector 기반 상태 경계 적용
  - `core-state`/`selectors` 단위 테스트 추가 + 회귀 게이트 통과
- Phase 3: 완료
  - 홈/할 일/스탯/설정 탭 뷰 컴포넌트 분리
  - shell에서 탭별 뷰를 props 계약으로 조립
- Phase 4: 완료
  - `task-input`, `task-list`, `timer-runtime`, `recovery` 모듈 분리
  - feature별 공개 API(`index.ts`) 경계 도입
  - 기존 동작 유지 상태로 회귀 게이트 통과
- Phase 5: 완료
  - notification/stt/sync adapter를 `features/mvp/integrations/*` 계층으로 분리
  - `mvp` 영역의 `features/p1/*` 직접 import 제거
  - capability/권한/동기화 mock 경계 표준화 유지 + 회귀 게이트 통과
- Phase 6: 완료
  - 미사용 레거시 코드(`features/p1/*`) 제거
  - 추적/아키텍처 문서 경로 정리 및 마감 ADR 기록
  - 최종 회귀 게이트(`verify:mvp`) 통과

## Target State

- feature-first 구조로 모듈 분리
- 상태 전이와 부수효과 경계 분리
- 공개 API 기반 의존성 규칙 고정
- 문서/코드 동기화된 리팩터링 운영

## Phases

1. Phase 0: 베이스라인 고정 및 문서 체계 확정
2. Phase 1: 순수 함수/타입/상수 추출
3. Phase 2: reducer/action/selector 상태 경계 재구성
4. Phase 3: 탭/화면 단위 컴포넌트 분해
5. Phase 4: 기능 모듈(`task-input`, `task-list`, `timer-runtime`, `recovery`) 분리
6. Phase 5: 통합 어댑터(`notification/stt/sync`) 경계 확정
7. Phase 6: 레거시 제거/회귀 강화/문서 마감

## Acceptance Criteria

- 각 Phase 종료 시 behavior parity를 확인한다.
- `typecheck/lint/test:mvp`가 단계별로 통과한다.
- deep import 없이 모듈 간 참조가 가능하다.
- 리팩터링 완료 후 `mvp-dashboard.tsx`는 Shell 조립 중심 레이어로 축소된다.

## Risks

- 상태 동기화 오류, 순환 의존, 스타일 회귀
- 완화 전략:
  - 작은 단위 커밋/롤백
  - 단계별 회귀 체크
  - 공개 API 경계 강제

## Related Docs

- `docs/frontend-architecture/refactor-blueprint.md`
- `docs/frontend-architecture/refactor-roadmap.md`
- `docs/frontend-architecture/adr-template.md`
- `docs/frontend-architecture/adr-0001-phase1-shared-model-extraction.md`
- `docs/frontend-architecture/adr-0002-phase2-core-state-boundary.md`
- `docs/frontend-architecture/adr-0003-phase3-phase4-view-feature-modules.md`
- `docs/frontend-architecture/adr-0004-phase5-integrations-boundary.md`
- `docs/frontend-architecture/adr-0005-phase6-cleanup-and-closure.md`
