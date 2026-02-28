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

## Phase 9: FR-01/02/03/05/11/12 Round 2 Confirmation ✅
- [x] FR-01 구현 완료 상태 확정 및 근거 링크 기록
- [x] FR-02 구현 완료 상태 확정 및 근거 링크 기록
- [x] FR-03 구현 완료 상태 확정 및 근거 링크 기록
- [x] FR-05 구현 완료 상태 확정 및 근거 링크 기록
- [x] FR-11 구현 완료 상태 확정 및 근거 링크 기록
- [x] FR-12 구현 완료 상태 확정 및 근거 링크 기록

Acceptance (Round 2 확정)
- [x] 대상 FR 상태를 `완료`로 최종 확정
- [x] `docs/TRACEABILITY_MATRIX.md`와 상태/근거를 동기화
- [x] `docs/DEVELOPMENT_PLAN.md`와 `context.md` 체크리스트를 동일 상태로 반영

## Round 2 핵심 결정 ✅
- [x] 실행 중 `+1분` 조정 상한을 `15분`으로 강제
- [x] `paused` 상태를 실행 잠금으로 포함
- [x] `completedAt`는 `done` 상태일 때만 저장
- [x] 시간 필드 저장 시 ISO UTC 정규화 보강
- [x] 실행 잠금 중 미션 삭제 버튼 비활성화

## Round 2 확정 결과

| FR | 상태 | 근거 파일 | 검증 결과 | 비고 |
| --- | --- | --- | --- | --- |
| FR-01 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | `typecheck/lint/test:mvp/verify:gate/build` PASS | `title + totalMinutes` 입력/검증 동작 |
| FR-02 | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/missioning.ts` | `typecheck/lint/test:mvp/verify:gate/build` PASS | 청킹 총합 예산 강제 |
| FR-03 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | `typecheck/lint/test:mvp/verify:gate/build` PASS | 편집/삭제 정책 + 실행 잠금 삭제 비활성화 |
| FR-05 | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/timer-accuracy.ts` | `typecheck/lint/test:mvp/verify:gate/build` PASS | 실행 중 `-1/+1` 조정 및 상한 강제 |
| FR-11 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | `typecheck/lint/test:mvp/verify:gate/build` PASS | `running/paused` 잠금 정책 반영 |
| FR-12 | 완료 | `features/mvp/lib/storage.ts`, `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/types/domain.ts` | `typecheck/lint/test:mvp/verify:gate/build` PASS | ISO UTC + `completedAt(done only)` |

## Validation Gate (Round 2)
1. [x] `npm run typecheck` PASS
2. [x] `npm run lint` PASS
3. [x] `npm run test:mvp` PASS
4. [x] `npm run verify:gate` PASS
5. [x] `npm run build` PASS

## Remaining Follow-up
- 정책성 리스크 메모 유지: FR-10(알림 정책 세부화), 외부 동기화 실연동(OAuth/API), 기타 P1 범위 항목은 별도 트랙에서 계속 관리

## Session Close (2026-02-28)

- [x] `npm run verify:mvp` 통합 점검 PASS 확인
- [x] 트랙 문서(`plan/context/tasks`) `Last Updated` 동기화
- [x] 다음 세션 재개용 핸드오프 메모 반영
