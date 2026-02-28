# Post-MVP P1 Plan

Last Updated: 2026-02-28

## Executive Summary
MVP 코어 루프 안정화 이후 P1은 사용자 재참여율과 입력 접근성을 높이는 준비 단계다. 우선순위는 `알림(FR-10) -> STT -> 외부 동기화` 순으로 제안한다.

## Current State
- MVP는 local-first 단일 페이지 흐름(입력/청킹/타이머/보상)까지 동작한다.
- 알림 권한/지원성 체크, STT 지원성 체크, 외부 동기화 도메인 계약은 아직 없다.
- 캘린더 연동은 기존 대시보드의 UI 목업 중심이며, P1 전용 도메인 타입/헬퍼가 분리되어 있지 않다.

## Priority Proposal (P1)
1. 알림 FR-10
- 이유: 즉시 실행/복귀 루프에 직접 기여하고, 구현 복잡도 대비 사용자 체감 효과가 가장 크다.
- 선행 조건: 브라우저 capability/permission 체크, 권한 요청 UX, 기본 리마인더 트리거 정책.

2. STT
- 이유: 입력 마찰을 줄여 신규 과업 생성 전환율을 개선할 수 있다.
- 선행 조건: 브라우저 STT 지원성 탐지, 비지원/권한 거부 시 fallback UX.

3. 외부 동기화
- 이유: 가치가 크지만 OAuth/토큰/충돌 해결 등 의존성과 복잡도가 가장 높다.
- 선행 조건: 동기화 도메인 타입, 작업 상태 모델, provider 어댑터 계약.

## Iteration 1 Implementation Order + Acceptance

### Phase 1: Notification Foundation (FR-10)
작업:
- capability/permission 헬퍼 연결
- 권한 요청 버튼과 상태 배지 UI
- 최소 1개 알림 시나리오(예: 청크 시작/복귀 리마인더) 연결

Acceptance Criteria:
- 지원 브라우저에서 권한 상태(`default/granted/denied`)가 정확히 표시된다.
- 권한 요청 결과가 상태에 즉시 반영된다.
- 권한 허용 시 지정 이벤트에서 브라우저 알림이 1회 이상 정상 표시된다.

### Phase 2: STT Foundation
작업:
- STT capability 헬퍼를 입력 UI에 연결
- STT 시작/중지 버튼과 상태 표시(지원/미지원/권한 필요)
- 실제 명령 반영 전, transcript 미리보기까지 1차 연결

Acceptance Criteria:
- 지원 브라우저에서 STT 시작 가능 여부가 정확히 계산된다.
- 비지원 환경에서 입력 폼 fallback이 깨지지 않는다.
- transcript 이벤트를 받아 UI에 표시할 수 있는 상태까지 동작한다.

### Phase 3: External Sync Foundation
작업:
- 동기화 도메인 타입으로 connection/job/conflict 상태를 일관 관리
- provider별 mock adapter 인터페이스 정의
- 동기화 큐 상태(queued/running/success/failed/conflict) 표시

Acceptance Criteria:
- sync 상태가 타입 단에서 모델링되고, UI에서 안전하게 분기 가능하다.
- mock adapter 기준 동기화 작업 생성/완료/실패 상태 전이가 검증된다.
- 충돌(conflict) 상태를 별도 레코드로 남길 수 있다.

## Out Of Scope (이번 턴)
- Service Worker 기반 푸시 알림 구현
- 실 OAuth 인증 플로우 및 토큰 저장
- STT 결과 후처리(명령 파싱/자연어 의도 분류)

## Risks
- 알림/마이크 권한 거부 시 기능 가치 급감
- 브라우저별 STT API 편차(`SpeechRecognition` vs `webkitSpeechRecognition`)
- 동기화 충돌 정책 미정의 시 데이터 신뢰도 저하

## Mitigation
- 권한 거부/미지원 시 fallback 문구와 수동 입력 경로를 기본 제공
- capability 헬퍼로 런타임 분기를 표준화
- 동기화는 mock adapter + 명시적 상태머신부터 시작

## Estimate (초기)
- Phase 1: S-M
- Phase 2: M
- Phase 3: M-L
