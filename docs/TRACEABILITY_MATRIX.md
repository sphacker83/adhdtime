# TRACEABILITY_MATRIX

Last Updated: 2026-02-28  
기준 문서: `docs/PRD.md` v3.0, `docs/USECASE.md` v2.0

## 상태 정의

- `완료`: 요구사항이 코드에 반영되어 기본 동작이 확인됨
- `부분`: 일부 동작만 구현되었거나, 수용 기준의 일부가 미충족/미검증
- `미구현`: 현재 코드베이스에서 요구사항 동작을 확인할 수 없음

## 1) PRD 기능 요구사항(FR) 추적

| ID | 요구사항 요약 | 상태 | 근거 파일 | 비고/갭 |
| --- | --- | --- | --- | --- |
| FR-01 | 텍스트 과업 입력 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 입력값으로 과업/청크 생성 및 `task_created` 이벤트 기록 |
| FR-02 | 로컬 우선 + AI 폴백 청킹 | 부분 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/chunking.ts` | 로컬 실패 시 폴백은 구현됨. 다만 AI는 실제 외부 호출이 아닌 모의 어댑터 |
| FR-03 | 청크 편집/삭제/재정렬 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 수정 시 `estMinutes` 2~15로 clamp, 삭제 시 재정렬 |
| FR-04 | 퀘스트 리스트/현재 청크 강조 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 현재 청크 강조 + 시작 CTA 제공 |
| FR-05 | 타이머 시작/일시정지/재개/완료 | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/timer-accuracy.ts`, `features/mvp/lib/timer-accuracy.test.ts` | 상태 전이/잔여시간 계산/드리프트 테스트 포함 |
| FR-06 | 5분 미세 햅틱 + ON/OFF | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 설정 토글 반영, 미지원 환경은 조용한 폴백 |
| FR-07 | XP/레벨/5스탯 반영 | 완료 | `features/mvp/lib/reward.ts`, `features/mvp/components/mvp-dashboard.tsx` | 완료/복귀 보상 및 레벨업 이벤트 처리 |
| FR-08 | 일간 리포트 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 완료 수/완료율/XP/회복 점수 및 KPI 스냅샷 표시 |
| FR-09 | 복귀 루프(재등록/재청킹) | 완료 | `features/mvp/components/mvp-dashboard.tsx` | `rechunk_requested`/`reschedule_requested` 및 회복 보상 구현 |
| FR-10 | 알림(시작/종료) | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/p1/helpers/notification-capability.ts` | 권한/폴백/알림 트리거(`chunk_started`/`chunk_completed`/`reschedule_requested`) 구현 |

## 2) USECASE 추적

| ID | 유스케이스 요약 | 상태 | 근거 파일 | 비고/갭 |
| --- | --- | --- | --- | --- |
| UC-01 | 과업 입력 -> 자동 청킹 | 부분 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/chunking.ts` | 안전 차단/폴백/이벤트는 구현. AI 실연동과 명시적 재시도 버튼은 없음 |
| UC-02 | 청크 수정/삭제 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 수정/삭제/순서 재배치 동작 |
| UC-03 | 타이머 시작/일시정지/재개/완료 | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/timer-accuracy.ts` | 상태 전이/백그라운드 복귀 보정/완료 후 다음 청크 제안 |
| UC-04 | 5분 미세 햅틱 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | ON/OFF 및 `haptic_fired` 이벤트 |
| UC-05 | 보상/스탯 반영 | 완료 | `features/mvp/lib/reward.ts`, `features/mvp/components/mvp-dashboard.tsx` | XP/스탯/레벨업 즉시 반영 |
| UC-06 | 미완료 -> 재등록/재청킹 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | `rescheduledFor`, `parentChunkId`, 회복 보상 반영 |
| UC-07 | 일간 리포트 | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/kpi.ts` | 리포트 카드 + KPI 요약 |
| UC-08 | 알림(P1) | 부분 | `features/mvp/components/mvp-dashboard.tsx`, `features/p1/helpers/notification-capability.ts` | 권한/상태/트리거 일부 구현, 종료 이벤트 알림 없음 |
| UC-09 | 외부 동기화(P1) | 미구현 | `features/p1/helpers/sync-mock-adapter.ts`, `features/mvp/components/mvp-dashboard.tsx` | 실제 OAuth/API 연동 없음. 상태 전이 Mock만 구현 |

## 3) PRD 릴리즈 게이트 체크 상태

| 게이트 | 상태 | 근거 파일 | 비고/갭 |
| --- | --- | --- | --- |
| 1. 청킹 10초 이내 표시 | 부분 | `features/mvp/components/mvp-dashboard.tsx` | `chunkingLatencyMs`, `withinTenSeconds` 이벤트 기록은 있으나 자동 차단/알람 없음 |
| 2. 3탭/3분 이내 첫 시작 | 부분 | `features/mvp/components/mvp-dashboard.tsx` | `startClickCount`, `withinThreeMinutes` 기록은 있음. 게이트 자동 판정 없음 |
| 3. 타이머 상태 안정성 | 완료 | `features/mvp/lib/timer-accuracy.ts`, `features/mvp/lib/timer-accuracy.test.ts` | 음수 방지/드리프트 검증 구현 |
| 4. 햅틱 ON/OFF 동작 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 설정 연동과 폴백 동작 포함 |
| 5. 완료 보상 즉시 반영 | 완료 | `features/mvp/components/mvp-dashboard.tsx`, `features/mvp/lib/reward.ts` | 완료 즉시 XP/스탯 업데이트 |
| 6. 복귀 2탭 이내 | 부분 | `features/mvp/components/mvp-dashboard.tsx` | 복귀 CTA는 있으나 탭 수 자동 측정 없음 |
| 7. 필수 이벤트 누락 없음 | 부분 | `features/mvp/lib/events.ts`, `features/mvp/lib/kpi.ts`, `scripts/verify-release-gate.mjs` | 필수 이벤트 정의/샘플 검증 있음. 실제 사용자 시나리오 전수 검증은 별도 필요 |
| 8. rawInput 장기 저장 없음 | 완료 | `features/mvp/lib/storage.ts`, `features/mvp/components/mvp-dashboard.tsx` | 저장 시 summary로 정규화 |
| 9. 위험 입력 차단 | 완료 | `features/mvp/components/mvp-dashboard.tsx` | 위험 패턴 차단 + `safety_blocked` 이벤트 |

## 4) 요약

- FR 기준: 완료 8 / 부분 2 / 미구현 0
- UC 기준: 완료 6 / 부분 2 / 미구현 1
- 주요 미구현/갭
  - AI 청킹 실연동 부재(모의 어댑터)
  - 알림 종료 이벤트 미지원
  - 외부 동기화 실제 OAuth/API 연동 부재(mock only)
