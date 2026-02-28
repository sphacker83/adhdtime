# Mobile-First UI Image Parity Tasks

Last Updated: 2026-02-28

## Phase 0: 문서 선행 ✅ COMPLETE
- [x] 12개 요구사항을 plan/context/tasks에 반영
- [x] 영향 파일/타입/검증 범위 확정
- [x] 에이전트 탐색 결과를 설계 의사결정에 반영

Acceptance:
- [x] 구현 전에 AC/리스크/검증 항목이 문서로 확정됨

## Phase 1: 데이터 모델 + 생성 경로 ✅ COMPLETE
- [x] `Chunk.iconKey`/`ChunkDraft.iconKey` 타입 추가
- [x] 청킹 생성 경로(`local/template/ai`)에서 아이콘 매핑 추가
- [x] `ChunkingResult -> Chunk` 매핑에 `iconKey` 포함
- [x] 리청크/수동 변경 경로에서 아이콘 계승
- [x] storage validator에 `iconKey` optional 반영

Acceptance:
- [x] 새로 생성되는 모든 미션이 아이콘을 가진다(없으면 fallback)
- [x] 기존 저장 데이터 로딩이 깨지지 않는다

## Phase 2: 플로팅 퀘스트 생성 UX ✅ COMPLETE
- [x] 플로팅 버튼을 모든 탭에서 렌더
- [x] 버튼 라벨 `퀘스트 생성` 표시(아이콘+텍스트)
- [x] 우하단 플로팅 위치 및 z-index 보정
- [x] 생성 성공 시 모달 자동 닫힘, 실패 시 유지
- [x] 기본 소요시간 표시값을 `--`로 변경

Acceptance:
- [x] 어떤 탭에서도 퀘스트 생성 버튼이 고정 노출된다
- [x] 생성 성공 후 모달이 닫힌다

## Phase 3: 현재 퀘스트 카드/다음 미션 구조 ✅ COMPLETE
- [x] 현재 퀘스트 타이틀을 `퀘스트 : [퀘스트명]`으로 변경
- [x] `#분 청크` 텍스트 제거
- [x] `예상소요시간 / 마감시간 / 마감까지 남은 시간` 표시
- [x] 다음 미션 위치를 CTA(시작/일시정지/완료) 아래로 이동
- [x] 다음 미션 상태 텍스트(`대기`) 제거
- [x] 다음 미션 아이콘 표시
- [x] 다음 미션 삭제 버튼 추가

Acceptance:
- [x] 현재 카드 정보구조가 요구사항 순서로 노출된다
- [x] 다음 미션에서 상태 텍스트 없이 아이콘+액션만 노출된다

## Phase 4: 대기중 퀘스트 수정 UX ✅ COMPLETE
- [x] 대기중 퀘스트에 수정 버튼 추가
- [x] 대기중 미션에 수정 버튼 추가
- [x] 홈 뷰에서 기존 수정 핸들러 재사용 연결
- [x] 액션 버튼 시각 정리(작은 아이콘 버튼 스타일)

Acceptance:
- [x] 홈 탭 대기 목록에서 퀘스트/미션 수정 진입이 가능하다

## Phase 5: 헤더 퍼펙트 정합 + 시간줄 🟡 IN PROGRESS
- [x] `오늘의 달성도` 텍스트/링 위치를 `main_ui.png` 기준으로 재배치
- [x] 타이틀바 하단에 현재 날짜/요일/시간 노출
- [x] 헤더 높이 변경에 맞춰 본문 시작 오프셋 보정
- [x] 2차 미세보정(상단 공백 축소, 달성도 텍스트/링 밀도 조정)

Acceptance:
- [ ] 헤더 핵심 배치가 레퍼런스와 동일한 시각 계층으로 인지된다(수동 QA 필요)

## Validation Gate
1. [x] `npm run typecheck`
2. [x] `npm run lint`
3. [x] `npm run test:mvp`
4. [ ] 수동 QA: 헤더/플로팅/현재퀘스트/다음미션/대기목록
