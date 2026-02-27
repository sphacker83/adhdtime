# Task Manual Chunk Side Plan - Tasks

Last Updated: 2026-02-27

## Phase Checklist
- [x] Phase 0: 사이드 플랜 문서 생성 및 초기 기준 확정
- [x] Phase 1: 수동 청크 생성 + 입력창 STT/생성 버튼 재배치
- [x] Phase 2: 홈 "오늘의 퀘스트" 폴딩/언폴딩
- [x] Phase 3: 실행 중 청크 시간 조정 ±5 추가
- [x] Phase 4: 청크 생성 입력 3필드 자동 계산
- [x] Phase 5: 회귀 테스트/문서 마감

## Phase 0: 문서 생성 및 기준 확정
- [x] `plan/context/tasks` 3파일 생성
- [x] Last Updated(`2026-02-27`) 명시
- [x] 기능별 AC/리스크/테스트 시나리오/완료 기준 문서화
- [x] 이해관계자(요청자) AC 확인 후 동결

## Phase 1: 수동 청크 생성 + 입력창 STT/생성 버튼 재배치
- [x] Feature 1: 선택 과업 대상 수동 청크 생성 흐름 구현
- [x] Feature 2: STT 버튼을 입력창 내부 우측 마이크 아이콘으로 이동
- [x] Feature 3: 기존 STT 위치를 `청크 생성` 버튼으로 교체하고 Feature 1에 연결
- [x] AC 점검: 생성 대상 taskId 정확성, 예산/정렬 제약, STT 회귀 없음
- [x] 테스트 시나리오 실행: 정상/예산초과/활성과업 미선택/미지원 STT

## Phase 2: 홈 "오늘의 퀘스트" 폴딩/언폴딩
- [x] Feature 4: 과업별 폴딩 토글 UI 추가
- [x] 언폴딩 시 과업 내 청크 목록 표시(행동/상태/시간)
- [x] AC 점검: 폴딩 상태 전환, 빈 상태, 탭 이동 후 정책 일관성
- [x] 테스트 시나리오 실행: 과업 0/1/N개, 청크 상태 변경 직후 갱신

## Phase 3: 실행 중 청크 시간 조정 ±5 추가
- [x] Feature 5: `-5/-1/+1/+5` 버튼 배치
- [x] 기존 최소/최대/예산 제한 및 이벤트 로깅(`chunk_time_adjusted`) 유지
- [x] AC 점검: 경계값/예산 초과 차단, 피드백 문구 일관성
- [x] 테스트 시나리오 실행: 최소/최대 경계, 예산 한계, 남은 시간 환산

## Phase 4: 청크 생성 입력 3필드 자동 계산
- [x] Feature 6: 3필드 중 2개 입력 시 나머지 1개 자동 계산
- [x] 입력 우선순위(마지막 수정 필드 우선) 및 검증 정책 구현
- [x] AC 점검: 3개 조합 계산 정확성, 범위/시간 역전 검증
- [x] 입력 단계 즉시 검증 피드백(`MIN/MAX totalMinutes`, `scheduledFor <= dueAt`) 반영
- [x] 테스트 시나리오 실행: 자정 넘김, 날짜 변경, 범위 초과

## Phase 5: 회귀 테스트/문서 마감
- [x] 전체 플로우 수동 검증(입력 -> 생성 -> 홈 확인 -> 실행/조정)
- [x] 이벤트 로그 메타/상태 전이 회귀 확인
- [x] `context.md` 최종 상태 업데이트
- [x] `tasks.md` 완료 체크 및 잔여 이슈 기록

## Validation Gate
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run test:mvp`
- [x] 주요 사용자 시나리오 수동 테스트 기록
