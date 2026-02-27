# MVP Core Loop Implementation Issues

Last Updated: 2026-02-27
Source Docs: `docs/PRD.md` v3.0, `docs/USECASE.md` v2.0, `docs/DEVELOPMENT_PLAN.md` v2.0
Review Method: `documentation-architect` 구조화 + `plan-reviewer` 갭 검증 기준

## 코드 기준 상태 체크리스트 (2026-02-27)
- 참고: 아래 상세 항목의 `Why`는 이슈 등록 당시 맥락이며, 현재 상태는 본 체크리스트를 우선합니다.
- [x] MVP-001 도메인 타입 PRD v3 정합화
  - 근거: `features/mvp/types/domain.ts`에 `summary`, `abandoned/archived`, `parentChunkId`, `rescheduledFor` 반영
- [x] MVP-002 안전 차단 이벤트(`safety_blocked`) 추가
  - 근거: `features/mvp/components/mvp-dashboard.tsx` 위험 입력 분기에서 `safety_blocked` 이벤트 기록
- [x] MVP-003 복귀 루프 상태 전이 정합화 (재청킹/재등록)
  - 근거: 재청킹 시 원본 `archived` + 신생 `parentChunkId`, 재등록 시 `abandoned` + `rescheduledFor`, `chunk_abandoned` 이벤트 기록
- [x] MVP-004 이벤트 공통 필드 확장(`sessionId`, `source` 표준)
  - 근거: `features/mvp/lib/events.ts` 공통 필드 강제 + 대시보드 `sessionIdRef` 기반 로깅
- [x] MVP-005 릴리즈 게이트 계측 훅 구현 (10초/3탭/2탭/3분)
  - 근거: `chunkingLatencyMs`, `startClickCount`, `recoveryClickCount`, `timeToFirstStartMs` 메타 기록
- [x] MVP-006 rawInput 최소 저장 정책 구현
  - 근거: `features/mvp/lib/chunking.ts`의 `normalizeTaskSummary`(길이 제한) + `features/mvp/components/mvp-dashboard.tsx` 저장 시 요약값 사용
- [x] MVP-007 타이머 정확도 회귀 테스트 기준 확정
  - 근거: `features/mvp/lib/timer-accuracy.ts` 순수 함수 + `features/mvp/lib/timer-accuracy.test.ts` 3개 케이스(10분 드리프트, 백그라운드 복귀, 0초 클램프) + `npm run test:mvp` 통과
- [x] MVP-008 청킹 검증 강화 (동사 시작/개수/시간)
  - 근거: `features/mvp/lib/chunking.ts`에서 `warnings` 추가, 개수 권장 경고, 동사 시작 권장, `estMinutes` 범위 강제
- [x] MVP-009 복귀 UX 카피/피드백 일관화
  - 근거: `features/mvp/components/mvp-dashboard.tsx` 재청킹/재등록/차단 피드백 톤 통일 + `docs/mvp-009-recovery-copy-guide.md` 카피 가이드 테이블 추가
- [x] MVP-010 이벤트 로그 조회 편의 개선
  - 근거: `features/mvp/components/mvp-dashboard.tsx` 최근 이벤트에 `source` 및 `meta` 요약 표시
- [x] MVP-011 타입/린트/빌드 파이프라인 체크 문서화
  - 근거: `dev/active/mvp-core-loop/mvp-core-loop-tasks.md`에 실행 순서/통과 기준/최근 실행 결과 추가

---

## P0-Critical (이번 스프린트 즉시)

### MVP-001 도메인 타입 PRD v3 정합화
- Priority: P0-Critical
- Why: 현재 타입이 PRD v3 상태/필드와 불일치 (`abandoned`, `archived`, `parentChunkId`, `rescheduledFor`, `summary` 누락)
- Scope:
  - `features/mvp/types/domain.ts`
  - `features/mvp/components/mvp-dashboard.tsx`
  - `features/mvp/lib/storage.ts`
- AC:
  - `ChunkStatus`에 `abandoned`, `archived` 포함
  - `Task.summary`, `Chunk.parentChunkId`, `Chunk.rescheduledFor` 포함
  - 컴파일 에러 없이 기존 플로우 동작 유지
- Depends On: 없음
- Estimate: M

### MVP-002 안전 차단 이벤트(`safety_blocked`) 추가
- Priority: P0-Critical
- Why: 위험 입력 차단은 있으나 이벤트 로깅 누락(게이트 불충족 위험)
- Scope:
  - `features/mvp/types/domain.ts`
  - `features/mvp/components/mvp-dashboard.tsx`
  - `features/mvp/lib/events.ts`
- AC:
  - 위험 입력 차단 시 `safety_blocked` 이벤트 기록
  - 이벤트에 `taskId` 없을 때도 일관된 payload 구조 유지
  - 최근 이벤트 목록에서 확인 가능
- Depends On: MVP-001
- Estimate: S

### MVP-003 복귀 루프 상태 전이 정합화 (재청킹/재등록)
- Priority: P0-Critical
- Why: 현재 재청킹은 원본 청크 삭제, 재등록은 순서 이동만 수행해 PRD의 상태/추적 요구를 만족하지 못함
- Scope:
  - `features/mvp/components/mvp-dashboard.tsx`
  - `features/mvp/types/domain.ts`
- AC:
  - 재청킹 시 원본 청크 `archived`, 신생 청크 `parentChunkId` 연결
  - 재등록 시 대상 청크 `abandoned` 처리 + `rescheduledFor` 기록
  - `rechunk_requested`, `reschedule_requested`, `chunk_abandoned` 이벤트가 일관되게 기록
- Depends On: MVP-001
- Estimate: M

### MVP-004 이벤트 공통 필드 확장(`sessionId`, `source` 표준)
- Priority: P0-Critical
- Why: KPI 계산/분석 기준에 필요한 공통 필드 부족
- Scope:
  - `features/mvp/types/domain.ts`
  - `features/mvp/lib/events.ts`
  - `features/mvp/components/mvp-dashboard.tsx`
- AC:
  - 모든 이벤트에 `sessionId` 포함
  - `source` 타입이 `local|ai|system|user`를 수용
  - 기존 이벤트 생성 코드가 타입 안전하게 마이그레이션
- Depends On: MVP-001
- Estimate: M

---

## P0-High (MVP 게이트 직접 영향)

### MVP-005 릴리즈 게이트 계측 훅 구현 (10초/3탭/2탭/3분)
- Priority: P0-High
- Why: 현재 성능/탭 게이트를 검증할 계측값이 없음
- Scope:
  - `features/mvp/components/mvp-dashboard.tsx`
  - `features/mvp/lib/events.ts`
- AC:
  - 청킹 소요시간(ms), 첫 시작까지 클릭 수, 복귀 동선 클릭 수, 첫 시작까지 경과시간 기록
  - 게이트 판정에 필요한 이벤트/메타가 누락 없이 저장
  - 수동 검수 시 값 확인 가능
- Depends On: MVP-004
- Estimate: M

### MVP-006 rawInput 최소 저장 정책 구현
- Priority: P0-High
- Why: 현재 `Task.title`이 원문 그대로 저장되어 장기 저장 최소화 정책이 약함
- Scope:
  - `features/mvp/components/mvp-dashboard.tsx`
  - `features/mvp/lib/chunking.ts`
  - `features/mvp/types/domain.ts`
- AC:
  - 저장용 필드(`summary`)는 정규화/길이 제한 정책 적용
  - 원문은 상태 저장소에 별도 영구 보관하지 않음
  - 설정 화면 안내 문구와 실제 동작 일치
- Depends On: MVP-001
- Estimate: M

### MVP-007 타이머 정확도 회귀 테스트 기준 확정
- Priority: P0-High
- Why: PRD 드리프트 요구(±2초) 대비 자동 검증 부재
- Scope:
  - `features/mvp/lib/*`
  - 신규 테스트 디렉터리
- AC:
  - 10분 시뮬레이션 기준 드리프트 허용 범위 테스트 추가
  - 백그라운드 복귀 케이스 테스트 추가
  - 테스트 실패 시 원인 파악 가능한 메시지 제공
- Depends On: 없음
- Estimate: M

### MVP-008 청킹 검증 강화 (동사 시작/개수/시간)
- Priority: P0-High
- Why: validator가 일부 조건만 약하게 검증해 문서 계약과 차이 가능
- Scope:
  - `features/mvp/lib/chunking.ts`
- AC:
  - `chunks.length` 권장 범위 체크(경고 또는 폴백 정책 명확화)
  - action 동사성 판정 규칙 보강
  - `estMinutes` 2~15 강제 및 메시지 표준화
- Depends On: 없음
- Estimate: S

---

## P0-Medium (품질/운영성)

### MVP-009 복귀 UX 카피/피드백 일관화
- Priority: P0-Medium
- Why: 일부 메시지는 정책에 맞지만 시나리오별 일관성이 부족
- Scope:
  - `features/mvp/components/mvp-dashboard.tsx`
  - `features/mvp/components/mvp-dashboard.module.css`
- AC:
  - 재청킹/재등록/차단 케이스 카피 톤 통일
  - 비난형 문구 없음
  - 1개 카피 가이드 테이블 문서화
- Depends On: 없음
- Estimate: S

### MVP-010 이벤트 로그 조회 편의 개선
- Priority: P0-Medium
- Why: 디버깅 시 현재 이벤트 리스트는 핵심 메타를 충분히 보여주지 않음
- Scope:
  - `features/mvp/components/mvp-dashboard.tsx`
- AC:
  - 최근 이벤트에서 `source`, 주요 `meta` 일부 확인 가능
  - 게이트 검증에 필요한 이벤트 추적 가능
- Depends On: MVP-004
- Estimate: S

### MVP-011 타입/린트/빌드 파이프라인 체크 문서화
- Priority: P0-Medium
- Why: 이슈 완료 검증 기준을 동일하게 적용하기 위한 문서 필요
- Scope:
  - `dev/active/mvp-core-loop/mvp-core-loop-tasks.md`
  - 필요 시 `README.md`
- AC:
  - 각 이슈 종료 조건에 `typecheck/lint/build` 명시
  - 공통 실행 명령 문서화
- Depends On: 없음
- Estimate: XS

---

## P1 Backlog (MVP 이후)

### MVP-101 OS 로컬 알림 지원 (FR-10)
- Priority: P1
- Scope: 설정/권한/시작-종료 알림

### MVP-102 음성 입력(STT) 실기능 연결
- Priority: P1
- Scope: 입력 바 마이크 버튼 동작, 권한 에러 처리

### MVP-103 외부 동기화 기본 설계
- Priority: P1
- Scope: 7일 범위 동기화 정책/충돌 정책

---

## 권장 실행 순서 (의존성 기준)

1. MVP-001
2. MVP-002, MVP-004
3. MVP-003, MVP-006
4. MVP-005, MVP-008
5. MVP-007
