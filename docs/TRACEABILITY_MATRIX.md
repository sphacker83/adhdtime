# TRACEABILITY_MATRIX

Last Updated: 2026-02-28  
기준 문서: `docs/PRD.md` v3.1, `docs/USECASE.md` v2.1

## 상태 정의

- `완료`: 요구사항이 코드에 반영되어 기본 동작이 확인됨
- `부분`: 일부 동작만 구현되었거나, 수용 기준의 일부가 미충족/미검증
- `미구현`: 현재 코드베이스에서 요구사항 동작을 확인할 수 없음

## 1) PRD 기능 요구사항(FR) 추적

| ID | 요구사항 요약 | 상태 | 근거 파일 | 비고/갭 |
| --- | --- | --- | --- | --- |
| FR-01 | 과업 직접 등록 + 총시간 설정 | 미구현 | `features/mvp/components/mvp-dashboard.tsx` | 현재는 free-text 입력 기반, `totalMinutes` 입력/검증 없음 |
| FR-02 | 총시간 제약 포함 하이브리드 청킹 | 부분 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/chunking.ts` | 청킹/폴백은 동작하나 `sum(estMinutes) <= totalMinutes` 제약 없음 |
| FR-03 | 청크 편집/삭제 + 총시간 정합 | 부분 | `features/mvp/components/mvp-dashboard.tsx` | 청크 편집/삭제는 구현, Task 총시간 연동 정책 미구현 |
| FR-04 | 퀘스트 리스트/현재 청크 강조 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 현재 청크 강조 + 시작 CTA 제공 |
| FR-05 | 타이머 + 실행 중 빠른 시간 조정 | 미구현 | `features/mvp/components/mvp-dashboard.tsx` | 시작/일시정지/완료는 있으나 `-1/+1` 빠른 조정 없음 |
| FR-06 | 5분 미세 햅틱 + ON/OFF | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 설정 토글 반영, 미지원 환경 폴백 포함 |
| FR-07 | XP/레벨/5스탯 반영 | 완료 | `features/mvp/lib/reward.ts`, `features/mvp/components/mvp-dashboard.tsx` | 완료/복귀 보상 및 레벨업 처리 |
| FR-08 | 일간 리포트 | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/kpi.ts` | 리포트 카드 + KPI 스냅샷 표시 |
| FR-09 | 과업 단위 재일정/재청킹 | 부분 | `features/mvp/components/mvp-dashboard.tsx` | 재청킹/재등록 동작은 있으나 재일정이 Task 단위가 아님(청크 중심) |
| FR-10 | 알림(P1) | 부분 | `features/mvp/components/mvp-dashboard.tsx`, `features/p1/helpers/notification-capability.ts` | 권한/트리거 연결은 있으나 별도 알림 설정 토글/정책 정교화 미완 |
| FR-11 | 실행 전/중 시간 수정 정책 | 미구현 | `features/mvp/components/mvp-dashboard.tsx` | 실행 상태별 시간 편집 가드(증가/감소 규칙) 미구현 |
| FR-12 | date...At 정합성 규칙 | 미구현 | `features/mvp/types/domain.ts`, `features/mvp/components/mvp-dashboard.tsx` | `scheduledFor/dueAt/startedAt/completedAt` 정책 기반 전이 미구현 |

## 2) USECASE 추적

| ID | 유스케이스 요약 | 상태 | 근거 파일 | 비고/갭 |
| --- | --- | --- | --- | --- |
| UC-01 | 과업 직접 등록 + 총시간 설정 | 미구현 | `features/mvp/components/mvp-dashboard.tsx` | 총시간 필수 입력 플로우 없음 |
| UC-02 | 등록 과업 청킹(총시간 제약) | 부분 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/chunking.ts` | 청킹은 구현, 총시간 제약 미구현 |
| UC-03 | 청크 편집/삭제 + 시간 정책 | 부분 | `features/mvp/components/mvp-dashboard.tsx` | 편집/삭제는 구현, 실행 상태별 정책 가드 미구현 |
| UC-04 | 타이머 + 실행 중 빠른 +/- | 미구현 | `features/mvp/components/mvp-dashboard.tsx` | 빠른 시간 조정 UX 없음 |
| UC-05 | 5분 미세 햅틱 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | ON/OFF 및 이벤트 기록 동작 |
| UC-06 | 보상/스탯 반영 | 완료 | `features/mvp/lib/reward.ts`, `features/mvp/components/mvp-dashboard.tsx` | 즉시 보상 반영 |
| UC-07 | 과업 재일정 또는 재청킹 | 부분 | `features/mvp/components/mvp-dashboard.tsx` | 재청킹/재등록 가능하나 Task 단위 일정 이동 정책 미구현 |
| UC-08 | 일간 리포트 확인 | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/kpi.ts` | 리포트 및 KPI 표시 |
| UC-09 | 알림(P1) | 부분 | `features/mvp/components/mvp-dashboard.tsx`, `features/p1/helpers/notification-capability.ts` | 시작/완료/재등록 알림 트리거 있음, 정책 완결성은 보강 필요 |
| UC-10 | 외부 동기화(P1) | 부분 | `features/p1/helpers/sync-mock-adapter.ts`, `features/mvp/components/mvp-dashboard.tsx` | 상태 전이 mock만 구현, 실제 OAuth/API 연동 미구현 |

## 3) PRD v3.1 릴리즈 게이트 체크 상태

| 게이트 | 상태 | 근거 파일 | 비고/갭 |
| --- | --- | --- | --- |
| 1. `title`, `totalMinutes` 필수 검증 | 미구현 | `features/mvp/components/mvp-dashboard.tsx` | 총시간 입력/검증 필드 없음 |
| 2. 10초 내 청킹 + 총시간 제약 | 부분 | `features/mvp/components/mvp-dashboard.tsx` | 10초 메트릭은 있으나 총시간 제약 검증 없음 |
| 3. 3탭/3분 이내 첫 시작 | 부분 | `features/mvp/components/mvp-dashboard.tsx` | 계측은 있으나 게이트 판정 자동화 미완 |
| 4. 타이머 안정 + 빠른 `+/-` 조정 | 부분 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/timer-accuracy.ts` | 타이머 안정성은 확보, 빠른 조정 기능 미구현 |
| 5. 햅틱 ON/OFF 정상 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 설정 반영 및 폴백 확인 가능 |
| 6. 보상 즉시 반영 | 완료 | `features/mvp/lib/reward.ts`, `features/mvp/components/mvp-dashboard.tsx` | 완료/복귀 보상 즉시 반영 |
| 7. 재일정/재청킹 2탭 복귀 | 부분 | `features/mvp/components/mvp-dashboard.tsx` | 동선은 있으나 정책 변경(Task 단위) 미반영 |
| 8. 재일정 Task 단위 준수 | 미구현 | `features/mvp/components/mvp-dashboard.tsx` | 현재는 청크 단위 `rescheduledFor` 중심 |
| 9. 필수 이벤트 누락 없음 | 부분 | `features/mvp/lib/events.ts`, `features/mvp/lib/kpi.ts`, `scripts/verify-release-gate.mjs` | 기존 이벤트 검증은 있으나 v3.1 신규 이벤트 미반영 |
| 10. rawInput 장기 저장 없음 | 완료 | `features/mvp/lib/storage.ts` | summary 저장 정책 적용 |
| 11. 시간 필드 정합성 규칙 | 미구현 | `features/mvp/types/domain.ts`, `features/mvp/components/mvp-dashboard.tsx` | date...At 정책/검증 로직 미구현 |

## 4) 요약

- FR 기준: 완료 4 / 부분 5 / 미구현 3
- UC 기준: 완료 3 / 부분 5 / 미구현 2
- 즉시 우선순위
1. FR-01/02: 총시간 입력 + 청킹 예산 제약
2. FR-05/11: 실행 중 빠른 시간 조정 + 상태별 시간 수정 정책
3. FR-09/12: Task 단위 재일정 + date...At 정합성 규칙 구현
