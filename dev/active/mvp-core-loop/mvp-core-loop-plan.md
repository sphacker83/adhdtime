# MVP Core Loop Plan

Last Updated: 2026-02-28

## Executive Summary
PRD v3 기준 P0 핵심 루프(입력 -> 청킹 -> 실행 타이머 -> 보상 -> 복귀)를 Next.js 단일 페이지에서 동작하도록 재구성한다.

## Current State
- 기존 화면은 중요도/마감/캘린더 중심 대시보드
- PRD의 Mission/TimerSession/XP/5스탯/이벤트 택소노미 미구현
- 문서와 UI IA 불일치

## Target State
- 홈: 상태 카드 + 입력 바 + 오늘의 미션 + 하단 탭
- 하이브리드 청킹: 로컬 룰 우선, AI 폴백 어댑터
- 미션 상태머신: todo/running/paused/done/abandoned/archived
- 완료 보상: XP/레벨/5스탯 즉시 반영
- 이벤트 로깅: PRD 택소노미 + 공통 필드(`sessionId`, `source`) 충족

## Phases

### Phase 1: Domain + Engine
1. 타입 정의(Task/Mission/TimerSession/Stats/Event)
2. 로컬 청킹 + AI 폴백 스텁
3. 청킹 결과 validator
4. 보상 계산 유틸
5. 이벤트 큐 유틸

Acceptance Criteria:
- 청킹 결과가 공통 스키마를 만족한다.
- 완료 이벤트 시 XP/레벨 계산이 일관된다.

### Phase 2: MVP Dashboard
1. 상태 카드(레벨/XP/5스탯)
2. 입력 바 + 생성 액션
3. 미션 리스트 + 현재 미션 강조
4. 시작/일시정지/완료 버튼
5. 완료 후 다음 미션 자동 포커스
6. 5분 햅틱 토글 + 미지원 폴백

Acceptance Criteria:
- 첫 미션 시작까지 3탭 이내
- 타이머 상태 전이가 안정적
- 완료 직후 보상 반영

### Phase 3: Validation
1. 타입체크
2. 린트
3. Dev Docs 상태 업데이트

### Phase 4: PRD v3 P0-Critical Alignment
1. 도메인 타입 정합화(`summary`, `parentMissionId`, `rescheduledFor`, 상태 확장)
2. 안전 차단 이벤트(`safety_blocked`) 반영
3. 복귀 루프 상태 전이 정합화(재청킹/재등록)
4. 이벤트 공통 필드 정합화(`sessionId`, `source`, nullable ID)

Acceptance Criteria:
- 위험 입력 차단 시 `safety_blocked` 이벤트가 누락 없이 기록된다.
- 재청킹 시 원본 미션 `archived`, 신생 미션 `parentMissionId` 연결이 보장된다.
- 재등록 시 대상 미션 `abandoned` + `rescheduledFor` 기록이 보장된다.
- 모든 이벤트에 `sessionId`와 표준 `source`가 포함된다.

## Risks
- 브라우저 백그라운드에서 타이머 드리프트
- Web Vibration API 미지원 환경
- 기존 대시보드 코드와 스펙 괴리

## Mitigation
- elapsed 기반 재계산 방식으로 타이머 감소
- 햅틱은 best-effort + 이벤트만 기록
- 새 컴포넌트 분리로 영향 최소화

## Estimate
- Phase 1: M
- Phase 2: L
- Phase 3: S
- Phase 4: M
