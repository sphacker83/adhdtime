# TRACEABILITY_MATRIX

Last Updated: 2026-02-28  
기준 문서: `docs/PRD.md` v3.1, `docs/USECASE.md` v2.1

## 상태 정의

- `pending`: 구현 결과/검증 로그를 아직 수신하지 못한 상태
- `in-progress`: 구현 진행 중이며 최종 판정(`완료/부분/미구현`) 전 상태
- `완료`: 요구사항이 코드에 반영되어 기본 동작이 확인됨
- `부분`: 일부 동작만 구현되었거나, 수용 기준의 일부가 미충족/미검증
- `미구현`: 현재 코드베이스에서 요구사항 동작을 확인할 수 없음

## 0) FR-01/02/03/05/11/12 2차 확정 결과

| FR | 확정 상태 | 구현 근거 | 리뷰 지적사항 반영 | 검증 근거 |
| --- | --- | --- | --- | --- |
| FR-01 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 과업 직접 등록 + `totalMinutes` 필수 검증 동작 | `npm run typecheck/lint/test:mvp/verify:gate/build` PASS |
| FR-02 | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/missioning.ts` | 청킹 총시간 예산(`sum <= totalMinutes`) 강제 | `npm run typecheck/lint/test:mvp/verify:gate/build` PASS |
| FR-03 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 실행 잠금 중 미션 삭제 버튼 비활성화 반영 | `npm run typecheck/lint/test:mvp/verify:gate/build` PASS |
| FR-05 | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/timer-accuracy.ts` | 실행 중 `+1분` 상한 `15분` 강제 반영 | `npm run typecheck/lint/test:mvp/verify:gate/build` PASS |
| FR-11 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | `paused`를 실행 잠금으로 포함 | `npm run typecheck/lint/test:mvp/verify:gate/build` PASS |
| FR-12 | 완료 | `features/mvp/lib/storage.ts`, `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/types/domain.ts` | `completedAt(done only)` + ISO UTC 정규화 보강 | `npm run typecheck/lint/test:mvp/verify:gate/build` PASS |

## 1) PRD 기능 요구사항(FR) 추적

| ID | 요구사항 요약 | 상태 | 근거 파일 | 비고/갭 |
| --- | --- | --- | --- | --- |
| FR-01 | 과업 직접 등록 + 총시간 설정 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | `title + totalMinutes` 필수 입력/검증 플로우 반영 |
| FR-02 | 총시간 제약 포함 하이브리드 청킹 | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/missioning.ts` | 청킹 결과/수정 시 총시간 예산 초과 차단 |
| FR-03 | 미션 편집/삭제 + 총시간 정합 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 실행 잠금(`running/paused`) 중 편집/삭제 비활성화 |
| FR-04 | 퀘스트 리스트/현재 미션 강조 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 현재 미션 강조 + 시작 CTA 제공 |
| FR-05 | 타이머 + 실행 중 빠른 시간 조정 | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/timer-accuracy.ts` | 실행 중 빠른 `-1/+1` 조정, `+1` 상한 15분 강제 |
| FR-06 | 5분 미세 햅틱 + ON/OFF | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 설정 토글 반영, 미지원 환경 폴백 포함 |
| FR-07 | XP/레벨/5스탯 반영 | 완료 | `features/mvp/lib/reward.ts`, `features/mvp/components/mvp-dashboard.tsx` | 완료/복귀 보상 및 레벨업 처리 |
| FR-08 | 일간 리포트 | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/kpi.ts` | 리포트 카드 + KPI 스냅샷 표시 |
| FR-09 | 과업 단위 재일정/재청킹 | 부분 | `features/mvp/components/mvp-dashboard.tsx` | 재청킹/재등록 동작은 있으나 재일정이 Task 단위가 아님(미션 중심) |
| FR-10 | 알림(P1) | 부분 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/integrations/notification/notification-adapter.ts` | 권한/트리거 연결은 있으나 별도 알림 설정 토글/정책 정교화 미완 |
| FR-11 | 실행 전/중 시간 수정 정책 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | `paused` 포함 실행 잠금 + 실행 중 총시간 감소 차단 |
| FR-12 | date...At 정합성 규칙 | 완료 | `features/mvp/lib/storage.ts`, `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/types/domain.ts` | ISO UTC 정규화 + `completedAt`은 `done`일 때만 저장 |

## 2) USECASE 추적

| ID | 유스케이스 요약 | 상태 | 근거 파일 | 비고/갭 |
| --- | --- | --- | --- | --- |
| UC-01 | 과업 직접 등록 + 총시간 설정 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 총시간 필수 입력/검증 + 생성 플로우 동작 |
| UC-02 | 등록 과업 청킹(총시간 제약) | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/missioning.ts` | 청킹/수정/리미션 시 총시간 예산 강제 |
| UC-03 | 미션 편집/삭제 + 시간 정책 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 실행 잠금(`running/paused`) 정책 가드 + 삭제 비활성화 |
| UC-04 | 타이머 + 실행 중 빠른 +/- | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/timer-accuracy.ts` | 빠른 `-1/+1` 조정 및 상한/예산 제약 동작 |
| UC-05 | 5분 미세 햅틱 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | ON/OFF 및 이벤트 기록 동작 |
| UC-06 | 보상/스탯 반영 | 완료 | `features/mvp/lib/reward.ts`, `features/mvp/components/mvp-dashboard.tsx` | 즉시 보상 반영 |
| UC-07 | 과업 재일정 또는 재청킹 | 부분 | `features/mvp/components/mvp-dashboard.tsx` | 재청킹/재등록 가능하나 Task 단위 일정 이동 정책 미구현 |
| UC-08 | 일간 리포트 확인 | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/kpi.ts` | 리포트 및 KPI 표시 |
| UC-09 | 알림(P1) | 부분 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/integrations/notification/notification-adapter.ts` | 시작/완료/재등록 알림 트리거 있음, 정책 완결성은 보강 필요 |
| UC-10 | 외부 동기화(P1) | 부분 | `features/mvp/integrations/sync/sync-mock-adapter.ts`, `features/mvp/components/mvp-dashboard.tsx` | 상태 전이 mock만 구현, 실제 OAuth/API 연동 미구현 |

## 3) PRD v3.1 릴리즈 게이트 체크 상태

| 게이트 | 상태 | 근거 파일 | 비고/갭 |
| --- | --- | --- | --- |
| 1. `title`, `totalMinutes` 필수 검증 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 총시간 필수 입력/검증 반영 |
| 2. 10초 내 청킹 + 총시간 제약 | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/missioning.ts` | 청킹 총시간 예산 검증 반영 |
| 3. 3탭/3분 이내 첫 시작 | 부분 | `features/mvp/components/mvp-dashboard.tsx` | 계측은 있으나 게이트 판정 자동화 미완 |
| 4. 타이머 안정 + 빠른 `+/-` 조정 | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/timer-accuracy.ts` | 빠른 조정 동작 + `+1` 상한 15분 강제 |
| 5. 햅틱 ON/OFF 정상 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 설정 반영 및 폴백 확인 가능 |
| 6. 보상 즉시 반영 | 완료 | `features/mvp/lib/reward.ts`, `features/mvp/components/mvp-dashboard.tsx` | 완료/복귀 보상 즉시 반영 |
| 7. 재일정/재청킹 2탭 복귀 | 부분 | `features/mvp/components/mvp-dashboard.tsx` | 동선은 있으나 정책 변경(Task 단위) 미반영 |
| 8. 재일정 Task 단위 준수 | 미구현 | `features/mvp/components/mvp-dashboard.tsx` | 현재는 미션 단위 `rescheduledFor` 중심 |
| 9. 필수 이벤트 누락 없음 | 부분 | `features/mvp/lib/events.ts`, `features/mvp/lib/kpi.ts`, `scripts/verify-release-gate.mjs` | 기존 이벤트 검증은 있으나 v3.1 신규 이벤트 미반영 |
| 10. rawInput 장기 저장 없음 | 완료 | `features/mvp/lib/storage.ts` | summary 저장 정책 적용 |
| 11. 시간 필드 정합성 규칙 | 완료 | `features/mvp/lib/storage.ts`, `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/types/domain.ts` | ISO UTC 정규화 + `completedAt(done only)` 반영 |

## 4) 요약

- FR 기준: FR-01/02/03/05/11/12는 2차 확정 `완료`, 나머지는 기존 상태 유지
- UC/게이트 기준: FR 연동 항목(UC-01/02/03/04, Gate-1/2/4/11)을 완료 상태로 동기화
- 검증 근거: `npm run typecheck`, `npm run lint`, `npm run test:mvp`, `npm run verify:gate`, `npm run build` PASS
- 남은 후속: 정책성 리스크는 P1 범위(FR-10 알림 정책 정교화, 외부 동기화 실연동) 트랙에서 관리
