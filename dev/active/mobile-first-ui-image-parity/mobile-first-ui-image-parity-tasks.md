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

## Phase 5: 헤더 퍼펙트 정합 + 시간줄 ✅ COMPLETE
- [x] `오늘의 달성도` 텍스트/링 위치를 `main_ui.png` 기준으로 재배치
- [x] 타이틀바 하단에 현재 날짜/요일/시간 노출
- [x] 헤더 높이 변경에 맞춰 본문 시작 오프셋 보정
- [x] 2차 미세보정(상단 공백 축소, 달성도 텍스트/링 밀도 조정)

Acceptance:
- [x] 헤더 핵심 배치가 레퍼런스와 동일한 시각 계층으로 인지된다(수동 QA/Playwright 확인)

## Validation Gate
1. [x] `npm run typecheck`
2. [x] `npm run lint`
3. [x] `npm run test:mvp`
4. [x] 수동 QA: 헤더/플로팅/현재퀘스트/다음미션/대기목록

## Phase 6: Responsive Hotfix (2026-02-28) ✅ COMPLETE
- [x] 헤더 `max-width` 캡 제거 후 좌우 full-width 정렬
- [x] 하단 탭바 z-index/폭/하단 safe-area 중복 여백 제거
- [x] 헤더 상단 공백(패딩/높이/갭) 축소
- [x] `현재 미션`, `1개 +`, `대기` 칩 제거
- [x] Playwright 모바일 캡처로 수정 전/후 검증

## Phase 7: Header/Nav/Card Layout Finalization (2026-02-28) ✅ COMPLETE
- [x] 헤더 내부 정렬(타이틀/달성도/시간줄) 재정렬
- [x] 시간줄 폰트 확대 + 하단 여백 축소
- [x] 하단 탭바(52px 버튼) 높이 정합 및 수직 정렬 보정
- [x] 현재 퀘스트 미존재 시 `퀘스트 : 없음` 고정
- [x] `캐릭터 상태` 타이틀 카드 내부 이동
- [x] `대기 중인 퀘스트` 섹션 카드 내부 구조 통일
- [x] 퀘스트 생성 FAB 좌하단 이동 + 세로 레이아웃(아이콘 확대)
- [x] Playwright 추가 검증(`after-plan-home`, `after-plan-modal`, `after-plan-home-v2`)
- [x] Playwright 최종 검증(`post-fix-home-current`, `post-fix-home-current-v2`)

## Phase 8: 중앙 돌출 퀘스트 CTA (2026-02-28) ✅ COMPLETE
- [x] 좌하단 플로팅 퀘스트 생성 버튼 제거
- [x] 하단 네비 중앙 원형 CTA 추가(`퀘스트 생성`)
- [x] 네비 상단 돌출형(`---^---`) 시각 구조 구현
- [x] 모달 상태를 부모로 이동해 중앙 CTA와 연결
- [x] Playwright 캡처 + `typecheck/lint/test:mvp` 재검증

## Phase 9: 하단 바 공백 미세조정 (2026-02-28) ✅ COMPLETE
- [x] 하단 바 패딩/갭 축소
- [x] 좌우 탭 버튼 높이/아이콘/라벨 밀도 조정
- [x] 중앙 CTA 크기/돌출 높이 축소
- [x] 본문 하단 예약 공간 축소
- [x] 모달 하단 안전 여백 동기화
- [x] Playwright 캡처(`nav-center-cta-tuned-home`, `nav-center-cta-tuned-modal`)
- [x] `typecheck/lint/test:mvp` 재검증

## Phase 10: 네비 타이포 + 몬스터 에너지 링 (2026-02-28) ✅ COMPLETE
- [x] 하단 네비 영어 라벨 제거
- [x] 하단 네비 한글 라벨 폰트 크기 상향
- [x] 중앙 CTA 라벨 `퀘스트/생성` 2줄 고정
- [x] 현재 퀘스트 우측 중앙 대형 몬스터 + 링서클 UI 구현
- [x] 링 에너지 비율을 청크 합산 남은시간에 연동
- [x] 청크 완료 시 에너지 즉시 감소 확인
- [x] Playwright 캡처 + `typecheck/lint/test:mvp` 재검증

## Phase 11: 퀘스트 카드 배치 미세조정 (2026-02-28) ✅ COMPLETE
- [x] `퀘스트: 타이틀` 표기 형태 적용
- [x] `미션 제목 / 우측 에너지%` 배치
- [x] `타이머 / 우측 링서클` 배치
- [x] 하단 네비 라벨 크기 추가 상향 + 영어 라벨 제거 유지
- [x] Playwright 캡처(`round7-home-empty`, `round7-home-with-quest`)
- [x] `typecheck/lint/test:mvp` 재검증

## Phase 12: 퀘스트 강조 보정 (2026-02-28) ✅ COMPLETE
- [x] 우측 링서클 고정폭 영역 확보(132px)
- [x] 링/몬스터 크기 확대(122px/66px)
- [x] 타이머 숫자 크기/굵기 강화
- [x] `미션 제목/에너지%`, `타이머/링서클` 간격 재정렬
- [x] Playwright 캡처(`round8-home-empty`, `round8-home-with-quest`)
- [x] `typecheck/lint/test:mvp` 재검증

## Phase 13: 모바일 레이아웃 안정화 (2026-02-28) ✅ COMPLETE
- [x] 모바일에서도 퀘스트 생성 모달 시간 카드 3열 유지
- [x] 모바일에서도 현재 퀘스트 메타 3열 유지
- [x] 대기중 퀘스트 메타 아이콘/텍스트 크기 상향
- [x] 아이콘 1개가 2줄 텍스트를 커버하는 메타 구조 보정
- [x] Playwright 캡처 + `typecheck/lint/test:mvp` 재검증
