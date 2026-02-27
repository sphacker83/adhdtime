# Task Manual Chunk Side Plan - Plan

Last Updated: 2026-02-27

## Executive Summary
홈/입력 플로우의 청크 조작성을 높이기 위해 별도 사이드 플랜 트랙을 분리한다. 이번 트랙은 코드 구현 전 문서 기준을 먼저 확정하고, 사용자 요청 6개를 `입력 UX 개선 -> 홈 가시성 개선 -> 시간 계산 자동화` 순서로 적용한다.

## Current State (2026-02-27 구현 반영)
- 과업 입력 카드에서 STT는 입력창 내부 우측 아이콘 버튼으로 동작하며, 기존 STT 상태/에러/미지원 메시지는 유지된다.
- 입력 카드 보조 액션은 `청크 생성` 버튼으로 연결되어 선택 과업 대상 수동 청크를 추가한다.
- 홈 탭 `오늘의 퀘스트`는 과업별 폴딩/언폴딩을 지원하며, "남은 N개"와 펼침 목록 모두 actionable(`todo/running/paused`) 기준으로 일치한다.
- 실행 중 청크 시간 조정은 `-5/-1/+1/+5`를 지원하고 기존 최소/최대/예산 제약을 그대로 적용한다.
- 청크 생성 입력 3필드는 3개 조합 자동 계산을 지원하며, `last edited field` 우선 정책과 입력 단계 즉시 검증(MIN/MAX, 시작<=마감)을 적용한다.

## Status Snapshot
- Feature 1~5: 완료
- Feature 6: 완료 (마지막 편집 필드 우선 + 입력 단계 즉시 검증 반영)
- 잔여 작업: Phase 5 수동 회귀 테스트 기록 및 마감

## Priority & Phasing
1. `P0` 입력 UX 및 생성 플로우 핵심 변경 (Feature 1~3)
2. `P1` 홈 탭 가시성/조작성 개선 (Feature 4~5)
3. `P0` 시간 필드 자동 계산 규칙 확정 및 반영 (Feature 6)
4. `Cross` 회귀 테스트 및 문서 마감

## Feature Specifications

### Feature 1. 사용자 수동 청크 생성 가능 (Priority: P0)
대상: 선택된 과업에 사용자가 직접 `action + estMinutes` 청크를 추가할 수 있어야 한다.

Candidate Files:
- `features/mvp/components/mvp-dashboard.tsx`
- `features/mvp/types/domain.ts` (필요 시 타입 보강)
- `features/mvp/components/mvp-dashboard.module.css`

Acceptance Criteria:
1. 활성 과업이 선택된 상태에서 수동 청크 생성 액션을 실행하면 해당 과업에 청크가 추가된다.
2. 생성된 청크는 기존 정렬 규칙(order)과 예산 규칙(totalMinutes 대비 chunk 합계)을 위반하지 않는다.
3. 실행 잠금 상태(`running` 또는 `paused` 청크 존재)에서 금지해야 하는 편집/생성 조건이 있으면 동일 정책으로 차단된다.

Risks:
- 예산 초과/순서 충돌로 인해 청크 상태 불일치가 발생할 수 있다.
- 수동 생성과 AI 생성이 혼재될 때 이벤트 로그 메타 정의가 모호해질 수 있다.

Test Scenarios:
1. 정상 케이스: 활성 과업 선택 후 수동 청크 생성 -> 목록/예산/정렬 반영 확인.
2. 경계 케이스: 과업 예산 직전 상태에서 추가 생성 -> 차단 메시지 확인.
3. 상태 케이스: 실행 중 청크가 있는 상태에서 정책 위반 생성 시도 -> 차단 확인.

Completion Criteria:
- 수동 청크 생성 성공/실패 경로가 UI 피드백과 이벤트 로그에 일관되게 남는다.

### Feature 2. STT 버튼을 입력창 내부 우측 마이크 아이콘으로 이동 (Priority: P0)
대상: STT 트리거를 텍스트 입력 내부 우측 아이콘 버튼으로 변경한다.

Candidate Files:
- `features/mvp/components/mvp-dashboard.tsx`
- `features/mvp/components/mvp-dashboard.module.css`
- `components/ui-icons.tsx` (마이크 아이콘 추가 시)

Acceptance Criteria:
1. 입력창 우측 내부에 마이크 아이콘 버튼이 표시된다.
2. 버튼 클릭 시 기존 STT 시작/중지 동작 및 비활성화 조건이 유지된다.
3. STT 미지원/권한 이슈 상태 메시지(`fallback`, `error`, `transcript`) 동작이 회귀되지 않는다.

Risks:
- 모바일에서 입력창 내부 버튼 터치 영역이 좁아 사용성이 저하될 수 있다.
- 입력창 padding/포커스 스타일 변경으로 레이아웃 깨짐 가능성이 있다.

Test Scenarios:
1. 데스크톱/모바일에서 입력창 렌더링과 마이크 버튼 클릭 동작 확인.
2. STT 지원/미지원 환경에서 버튼 활성 상태와 에러 문구 표시 확인.
3. STT 청취 중 버튼 상태(아이콘/색상/텍스트 대체)가 올바르게 전환되는지 확인.

Completion Criteria:
- STT 제어가 입력창 내부 아이콘 UX로 이동해도 기존 STT 기능이 동일하게 동작한다.

### Feature 3. 기존 STT 버튼 위치에 "청크 생성" 버튼 배치 (선택 과업에 청크 추가) (Priority: P0)
대상: 기존 STT 버튼 자리를 `청크 생성` 액션으로 교체하고, 선택 과업 대상 수동 청크 생성 진입점으로 사용한다.

Candidate Files:
- `features/mvp/components/mvp-dashboard.tsx`
- `features/mvp/components/mvp-dashboard.module.css`

Acceptance Criteria:
1. 기존 STT 버튼 위치에 `청크 생성` 버튼이 노출된다.
2. `청크 생성` 버튼은 활성 과업이 없으면 비활성화되거나 생성 대상을 먼저 선택하도록 안내한다.
3. `청크 생성` 실행 시 Feature 1의 수동 청크 생성 로직으로 연결된다.

Risks:
- 기존 `AI가 쪼개기`와 역할이 혼동되면 사용자가 잘못된 생성 액션을 누를 가능성이 있다.
- 활성 과업 기준이 불명확하면 다른 과업에 잘못 추가될 수 있다.

Test Scenarios:
1. 활성 과업 선택/미선택 상태에서 버튼 활성 조건 확인.
2. 버튼 클릭 시 대상 과업 ID와 생성된 청크의 taskId 일치 확인.
3. 기존 AI 생성 흐름과 충돌 없이 공존하는지 회귀 확인.

Completion Criteria:
- 사용자가 입력 카드에서 생성 액션을 통해 명시적으로 선택 과업에 청크를 추가할 수 있다.

### Feature 4. 홈 "오늘의 퀘스트" 폴딩/언폴딩으로 과업 내 청크 확인 (Priority: P1)
대상: 홈 탭 리스트에서 과업별 청크를 펼쳐 볼 수 있는 접기/펼치기 UI를 추가한다.

Candidate Files:
- `features/mvp/components/mvp-dashboard.tsx`
- `features/mvp/components/mvp-dashboard.module.css`
- `components/ui-icons.tsx` (chevron 아이콘 재사용)

Acceptance Criteria:
1. 각 과업 행에서 폴딩/언폴딩 토글이 가능하다.
2. 언폴딩 시 해당 과업의 actionable 청크 목록(행동명/상태/남은 시간 또는 예정 시간)을 확인할 수 있다.
3. 폴딩 기본 상태와 active task 동기화 정책이 일관된다(예: 선택 과업 자동 펼침 여부 명시).

Risks:
- 홈 탭 렌더링 비용 증가로 스크롤 성능 저하가 생길 수 있다.
- 폴딩 상태를 어디에 저장할지(local state vs persisted state) 결정이 필요하다.

Test Scenarios:
1. 과업 0개/1개/다수 환경에서 폴딩 동작과 빈 상태 렌더링 확인.
2. 탭 전환 후 폴딩 상태 유지 정책 검증.
3. 청크 상태 변경(시작/완료) 직후 언폴딩 목록 갱신 확인.

Completion Criteria:
- 홈 탭에서 과업별 청크를 즉시 확인할 수 있어 태스크 전환 없이 현재 진행 문맥을 파악할 수 있다.

### Feature 5. 실행 중 청크 시간 조정에 ±5 추가 (Priority: P1)
대상: 현재 `-1/+1` 버튼 외에 `-5/+5` 조정 버튼을 추가한다.

Candidate Files:
- `features/mvp/components/mvp-dashboard.tsx`
- `features/mvp/components/mvp-dashboard.module.css`

Acceptance Criteria:
1. 실행 중 청크 영역에 `-5분`, `-1분`, `+1분`, `+5분` 액션이 표시된다.
2. 최소/최대 청크 시간, 과업 예산 초과 방지 규칙이 기존과 동일하게 적용된다.
3. 이벤트 로그(`chunk_time_adjusted`)의 `deltaMinutes`에 ±5가 기록된다.

Risks:
- 큰 증감 값으로 경계값 초과 시 피드백 메시지가 혼란스러울 수 있다.
- 버튼 수 증가로 모바일 한 줄 레이아웃이 깨질 수 있다.

Test Scenarios:
1. 최소/최대 경계 근처에서 ±5 버튼 비활성/오류 메시지 확인.
2. 예산 제한이 걸린 과업에서 +5 차단 동작 확인.
3. 남은 시간 비율 환산 로직(remainingSecondsByChunk) 정확성 확인.

Completion Criteria:
- ±1과 ±5 모두 정책 위반 없이 동작하고 이벤트/피드백이 일관된다.

### Feature 6. 청크 생성 시 `totalMinutes/scheduledFor/dueAt` 3필드 중 2개 입력 시 1개 자동 계산 (Priority: P0)
대상: 청크 생성 입력에서 세 필드 관계를 수학적으로 연결해 입력 마찰을 줄인다.

Candidate Files:
- `features/mvp/components/mvp-dashboard.tsx`
- `features/mvp/types/domain.ts` (필요 시 메타 필드/정책 타입화)

Acceptance Criteria:
1. `scheduledFor + dueAt` 입력 시 `totalMinutes`를 자동 계산한다.
2. `totalMinutes + scheduledFor` 입력 시 `dueAt`를 자동 계산한다.
3. `totalMinutes + dueAt` 입력 시 `scheduledFor`를 자동 계산한다.
4. 계산 결과는 기존 제약(`MIN/MAX`, `scheduledFor <= dueAt`)을 만족해야 하며 위반 시 명확한 에러를 표시한다.
5. 수동 수정 우선순위(사용자가 마지막으로 편집한 필드 우선) 정책이 문서와 구현에서 일치한다.

Risks:
- 로컬 타임존/서머타임 경계에서 분 단위 계산 오차가 날 수 있다.
- 자동 계산과 수동 입력이 반복될 때 무한 업데이트 루프가 생길 수 있다.

Test Scenarios:
1. 3가지 조합 각각에서 자동 계산 결과가 기대값과 일치하는지 확인.
2. 경계 시간(자정 넘김, 날짜 변경)에서 계산 안정성 확인.
3. `totalMinutes`가 허용 범위를 벗어나는 입력에서 검증 메시지 확인.

Completion Criteria:
- 3필드 중 2개만 입력해도 나머지 1개가 예측 가능하고, 잘못된 값은 즉시 차단된다.

## Cross-Cutting Risks
- 입력 카드의 역할이 늘어나면서 버튼 의미가 복잡해질 수 있음.
- 홈 탭과 할 일 탭의 상태 동기화가 깨지면 사용자 혼란이 발생할 수 있음.
- 자동 계산 도입 후 기존 저장 데이터와의 호환 검증이 필요함.

## Implementation Completion Definition
1. Feature 1~6의 AC가 모두 충족된다.
2. 각 기능별 테스트 시나리오(정상/경계/오류)가 최소 1회 이상 검증된다.
3. `tasks.md` Phase 체크리스트가 완료 상태로 업데이트된다.
4. `context.md`에 최종 결정/변경 파일/회귀 이슈 유무가 기록된다.
