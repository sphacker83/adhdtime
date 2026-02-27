# Release Readiness + P1 Foundation - Tasks

Last Updated: 2026-02-28

## Phase 0: Baseline & Planning ✅
- [x] 기존 Dev Docs / 코드 상태 분석
- [x] 미완료 항목 우선순위 재정렬
- [x] 본 트랙 Dev Docs 3종 생성

## Phase 1: KPI Pipeline (P0) ✅
- [x] KPI 계산 유틸(`kpi.ts`) 구현
- [x] KPI 테스트(`kpi.test.ts`) 추가
- [x] 스탯 탭 KPI 카드 UI 연결

Acceptance
- [x] Activation/Time to Start/Recovery/D1/D7 계산 가능
- [x] 결측 이벤트에서도 안전하게 표시

## Phase 2: Release Gate Automation (P0) ✅
- [x] `scripts/verify-release-gate.mjs` 추가
- [x] `package.json`에 `verify:gate`, `verify:mvp` 스크립트 추가

Acceptance
- [x] `npm run verify:mvp` 단일 명령으로 검증 가능
- [x] 게이트 실패 시 비-0 종료코드 반환

## Phase 3: Notification FR-10 (P1-High) ✅
- [x] 권한 상태 배지 + 요청 버튼 연결
- [x] `denied/unsupported` fallback 안내 연결
- [x] 허용 상태 알림 1차 트리거 연결

Acceptance
- [x] `default/granted/denied/unsupported` 정확히 반영
- [x] 허용 상태에서 브라우저 알림 노출 확인

## Phase 4: STT Foundation (P1-High) ✅
- [x] STT 지원 여부 배지 연결
- [x] STT 시작/중지 버튼 연결
- [x] transcript 미리보기 연결

Acceptance
- [x] 미지원 환경 fallback 정상
- [x] 시작/중지 상태와 UI 일치

## Phase 5: External Sync Mock (P1-Medium) ✅
- [x] mock adapter 인터페이스 추가
- [x] sync 상태 전이(queued/running/success/failed/conflict) 연결
- [x] conflict 생성/표시 경로 연결

Acceptance
- [x] 타입 안전 상태 전이
- [x] 실패/충돌 로그 보존

## Phase 6: Code Review & Hardening ✅
- [x] 변경 영역 코드 리뷰 수행
- [x] 발견 이슈 반영(필요 시 수정)

Acceptance
- [x] high severity 이슈 0건

## Phase 7: Documentation Completion ✅
- [x] `README.md` 최신화
- [x] `docs/TRACEABILITY_MATRIX.md` 작성
- [x] `docs/KPI_PIPELINE.md` 작성
- [x] `docs/RELEASE_GATE_LOG.md` 작성
- [x] `dev/active/.../context.md` 진행 상태 최종 갱신

Acceptance
- [x] 코드/문서 정합성 확보

## Phase 8: Mobile Settings Clipping Hotfix ✅
- [x] 모바일 settings 탭 진입 시 우측 잘림/클리핑 이슈 수정 및 390x844 Playwright 재현 검증 완료

## Validation Gate
1. [x] `npm run typecheck`
2. [x] `npm run lint`
3. [x] `npm run test:mvp`
4. [x] `npm run build`
5. [x] `npm run verify:gate`
6. [x] `npm run verify:mvp`
