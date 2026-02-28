# Release Readiness + P1 Foundation - Plan

Last Updated: 2026-02-28

## Executive Summary
현재 MVP 코어 루프는 동작하지만, 릴리즈 기준과 문서 정합성 관점에서 `KPI 계산 파이프라인`, `릴리즈 게이트 자동 검증`, `P1(알림/STT/외부동기화) 최소 연결`, `문서 최신화`가 남아 있다. 이번 트랙은 이 4가지를 순차 구현해 “다음 세션에서도 바로 이어갈 수 있는 실행 가능 상태”를 만든다.

## Current State Analysis
- MVP P0 핵심 루프(입력/청킹/타이머/보상/복귀)는 구현 완료 상태.
- 이벤트 로깅은 존재하지만 KPI(Activation/Time to Start/Recovery/D1/D7) 계산 로직은 부재.
- 릴리즈 게이트는 문서로만 존재하고 자동 점검 스크립트가 없다.
- P1은 capability/type 스캐폴딩만 있고 대시보드 UI/동작 연결이 없다.
- `README.md`가 현재 앱 구조와 불일치하며, 요구사항 대비 구현 추적 문서가 없다.

## Proposed Future State
- 이벤트 배열만으로 KPI를 계산해 스탯 탭에서 즉시 확인 가능.
- `npm` 스크립트로 릴리즈 게이트 검증(`typecheck/lint/test/build + KPI/이벤트 조건`)을 한 번에 실행.
- P1 최소 연결:
  - 알림 권한 상태/요청/fallback 및 1개 알림 트리거
  - STT 지원성/시작/중지/transcript 미리보기
  - 외부 동기화 mock adapter + 상태 전이 + conflict 표시
- 문서 세트(README/트레이서빌리티/게이트 로그/Dev Docs)가 구현 상태와 일치.

## Implementation Phases

### Phase 1. KPI Pipeline (Priority: P0, Effort: M)
1.1 KPI 계산 규칙을 코드 레벨로 고정
- 작업: `features/mvp/lib/kpi.ts` 신설, 이벤트 기반 계산 함수 구현
- Acceptance:
  - Activation, Time to Start, Chunk Completion Rate, Recovery Rate, D1/D7 반환
  - 입력 이벤트가 부족할 때 `null`/0 처리 정책이 일관적

1.2 KPI 시각화를 스탯 탭에 연결
- 작업: `mvp-dashboard.tsx`에 KPI 요약 카드 추가
- Acceptance:
  - 데이터가 없을 때도 UI가 깨지지 않음
  - 계산 결과가 이벤트 변화에 따라 즉시 업데이트

1.3 KPI 테스트 추가
- 작업: `features/mvp/lib/kpi.test.ts`
- Acceptance:
  - 주요 경계 케이스(이벤트 없음, 단일 세션, 다중 세션) 검증 통과

의존성: `features/mvp/types/domain.ts` 이벤트 스키마

### Phase 2. Release Gate Automation (Priority: P0, Effort: S-M)
2.1 릴리즈 게이트 스크립트 추가
- 작업: `scripts/verify-release-gate.mjs`
- Acceptance:
  - 필수 이벤트 이름/핵심 KPI 계산 가능 여부/기본 검증 조건 점검
  - 실패 시 비-0 종료코드 반환

2.2 npm 검증 커맨드 정리
- 작업: `package.json` 스크립트 추가 (`test:mvp`, `verify:gate`, `verify:mvp`)
- Acceptance:
  - `npm run verify:mvp` 한 번으로 게이트 검증 가능

의존성: Phase 1 KPI 함수

### Phase 3. P1 Notification (FR-10) (Priority: P1-High, Effort: M)
3.1 권한 상태 배지 + 요청 액션 연결
- 작업: 입력/설정 화면에 상태 배지 및 권한 요청 버튼 노출
- Acceptance:
  - `default/granted/denied/unsupported` 정확히 반영

3.2 fallback 문구 및 1차 트리거 연결
- 작업: 거부/미지원 안내 + `chunk_started` 또는 `reschedule_requested`에서 알림 트리거
- Acceptance:
  - 허용 상태에서 실제 브라우저 알림 1회 이상 확인 가능
  - 미지원/거부 시 앱 흐름은 정상 유지

의존성: `features/p1/helpers/notification-capability.ts`

### Phase 4. P1 STT Foundation (Priority: P1-High, Effort: M)
4.1 STT 상태 배지 + 시작/중지 연결
- 작업: 입력 카드에 STT 컨트롤 추가
- Acceptance:
  - 지원/미지원 상태 즉시 표시
  - 시작/중지 동작과 UI 상태 일치

4.2 transcript 미리보기 연결
- 작업: 인식 중/완료 텍스트 미리보기 표시
- Acceptance:
  - 인식 결과가 입력 전에 확인 가능
  - 미지원 환경 fallback이 기본 텍스트 입력을 방해하지 않음

의존성: `features/p1/helpers/stt-capability.ts`

### Phase 5. P1 External Sync Mock (Priority: P1-Medium, Effort: M-L)
5.1 provider mock adapter 인터페이스 추가
- 작업: `features/p1/helpers/sync-mock-adapter.ts` 신설
- Acceptance:
  - provider별 mock 응답 계약이 타입 안전

5.2 sync job 상태 전이 + conflict 경로 연결
- 작업: 상태머신/헬퍼 + UI 표시(queued/running/success/failed/conflict)
- Acceptance:
  - 상태 전이 로그가 누락 없이 남음
  - conflict 생성/표시 가능

의존성: `features/p1/types/sync-domain.ts`

### Phase 6. Code Review + Hardening (Priority: Cross, Effort: S-M)
6.1 변경 영역 리뷰
- 작업: 이벤트/타이머/STT/알림/동기화 상태 관리 결함 점검
- Acceptance:
  - high severity 이슈 0건
  - 회귀 가능성이 높은 부분에 방어 로직 또는 문서 보강

6.2 검증 게이트 실행
- 작업: `npm run verify:mvp`
- Acceptance:
  - typecheck/lint/test/build/gate script 모두 통과

### Phase 7. Documentation Completion (Priority: Cross, Effort: M)
7.1 README 최신화
- Acceptance: 현재 엔트리/기능/스크립트/구조와 일치

7.2 요구사항 트레이서빌리티 문서 작성
- 작업: `docs/TRACEABILITY_MATRIX.md`
- Acceptance: PRD/USECASE 항목별 구현/부분/미구현 상태와 근거 파일 포함

7.3 KPI/릴리즈 게이트 운영 문서 작성
- 작업: `docs/KPI_PIPELINE.md`, `docs/RELEASE_GATE_LOG.md`
- Acceptance: 계산 규칙, 실행 명령, 최근 실행 결과가 문서화

## Task Breakdown Structure
- T1 (P0, M): KPI 파이프라인 구현 및 테스트
- T2 (P0, S-M): 릴리즈 게이트 자동화
- T3 (P1-High, M): 알림 UI/트리거
- T4 (P1-High, M): STT UI/세션 연결
- T5 (P1-Medium, M-L): 외부 동기화 mock 상태 전이
- T6 (Cross, S-M): 코드 리뷰/회귀 보완
- T7 (Cross, M): 문서 정합화 완료

작업 의존성:
- `T1 -> T2`
- `T3/T4/T5`는 병렬 가능하나 본 트랙에서는 순차 실행
- `T6`은 `T1~T5` 이후
- `T7`은 전 단계 결과 반영 후 마무리

## Risks & Mitigations
- 권한 API(알림/STT) 브라우저 편차
  - 대응: capability 헬퍼 기반 분기 + fallback 메시지 고정
- 이벤트 품질 부족으로 KPI 해석 오류
  - 대응: 계산 함수에서 결측 처리 규칙 명시 + 테스트 케이스 추가
- 동기화 상태 복잡성 증가
  - 대응: mock adapter + 명시적 상태 전이 함수로 제한

## Success Metrics
- `npm run verify:mvp` 통과
- 스탯 탭에서 KPI 5종이 계산/표시
- FR-10/STT/Sync foundation 체크리스트 항목 완료
- 문서 4종(README/TRACEABILITY/KPI/RELEASE GATE) 최신 상태 유지

## Resources & Dependencies
- 내부 의존성: `features/mvp/*`, `features/p1/*`, `docs/*`, `package.json`
- 외부 의존성: 브라우저 Notification/STT API (지원성 차이 존재)

## Schedule Estimate
- Phase 1~2: 0.5~1일
- Phase 3~5: 1~1.5일
- Phase 6~7: 0.5일
- 총합: 약 2~3일 (단일 개발자 기준)
