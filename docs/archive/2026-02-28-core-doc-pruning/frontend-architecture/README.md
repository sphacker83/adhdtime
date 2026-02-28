# Frontend Architecture Docs

Last Updated: 2026-02-28

## 문서 목록

- `refactor-blueprint.md`
  - 현재 구조 문제와 목표 아키텍처(모듈 경계/의존성 규칙/상태 전략) 정의
- `refactor-roadmap.md`
  - 단계별 실행 계획(Phase), 완료 기준, 리스크/롤백 전략
- `adr-template.md`
  - 아키텍처 의사결정(ADR) 기록 템플릿
- `adr-0001-phase1-shared-model-extraction.md`
  - Phase 1 경로/경계 의사결정 기록
- `adr-0002-phase2-core-state-boundary.md`
  - Phase 2 상태 경계/저장 경로 단일화 의사결정 기록
- `adr-0003-phase3-phase4-view-feature-modules.md`
  - Phase 3~4 탭 뷰/기능 모듈 분해 의사결정 기록
- `adr-0004-phase5-integrations-boundary.md`
  - Phase 5 integrations 계층 분리 의사결정 기록
- `adr-0005-phase6-cleanup-and-closure.md`
  - Phase 6 정리/회귀/트랙 마감 의사결정 기록

## 권장 사용 순서

1. `refactor-blueprint.md`에서 원칙과 목표 구조를 확정합니다.
2. `refactor-roadmap.md` 순서대로 분해/이전을 진행합니다.
3. 쟁점이 발생하면 `adr-template.md`로 의사결정을 고정합니다.

## 운영 원칙

- 설계 문서가 코드보다 먼저 업데이트되어야 합니다.
- 각 Phase 시작/종료 시점에 `dev/active` 트랙 문서를 동기화합니다.
- 회귀 검증(`typecheck/lint/test/build`) 없이 다음 Phase로 넘어가지 않습니다.
