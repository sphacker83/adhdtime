# Frontend Architecture Refactor - Tasks

Last Updated: 2026-02-27

## Phase Checklist

- [x] Phase 0: 아키텍처/로드맵/ADR/Dev Docs 기반 문서 세팅
- [ ] Phase 1: 순수 함수/타입/상수 추출
- [ ] Phase 2: 상태 경계(reducer/action/selector) 재구성
- [ ] Phase 3: 탭/화면 단위 컴포넌트 분해
- [ ] Phase 4: 기능 모듈 분해(task-input/task-list/timer-runtime/recovery)
- [ ] Phase 5: integrations 계층 분리(notification/stt/sync)
- [ ] Phase 6: 정리/회귀 강화/마감

## Phase 0: 문서 세팅 ✅

- [x] `docs/frontend-architecture` 문서 세트 생성
- [x] 리팩터링 Dev Docs 트랙(`plan/context/tasks`) 생성
- [x] 전용 에이전트(`frontend-architecture-designer`) 추가
- [x] 에이전트 카탈로그에 신규 에이전트 등록

## Phase 1: 순수 함수/타입/상수 추출

- [ ] 입력/시간 계산/검증 로직의 순수 함수 식별
- [ ] `shared` 또는 `model` 계층으로 이동
- [ ] `mvp-dashboard.tsx` 의존 코드 정리
- [ ] 회귀 확인(typecheck/lint/test:mvp)

## Phase 2: 상태 경계 재구성

- [ ] reducer/action/selector 파일 구조 도입
- [ ] 상태 전이와 side effect 분리
- [ ] 저장/복원 경로 단일화
- [ ] 회귀 확인(typecheck/lint/test:mvp)

## Phase 3: 탭/화면 단위 분해

- [ ] 홈/할 일/스탯/설정 뷰 컴포넌트 분리
- [ ] 탭별 props 계약 정의
- [ ] shell 레이어 조립 책임만 유지
- [ ] 회귀 확인(typecheck/lint/test:mvp)

## Phase 4: 기능 모듈 분해

- [ ] `task-input` 모듈 분리
- [ ] `task-list` 모듈 분리
- [ ] `timer-runtime` 모듈 분리
- [ ] `recovery` 모듈 분리
- [ ] 회귀 확인(typecheck/lint/test:mvp)

## Phase 5: integrations 분리

- [ ] notification/stt/sync 어댑터 분리
- [ ] capability/권한/오류 처리 표준화
- [ ] UI 레이어 직접 API 접근 제거
- [ ] 회귀 확인(typecheck/lint/test:mvp)

## Phase 6: 정리 및 마감

- [ ] 미사용 코드/스타일 제거
- [ ] 문서 및 ADR 업데이트
- [ ] 최종 회귀(typecheck/lint/test:mvp/build)
- [ ] 트랙 마감 및 잔여 이슈 정리

## Validation Gate

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test:mvp`
- [ ] `npm run build` (마일스톤 단위)
