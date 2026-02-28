# Mobile-First UI Image Parity Context

Last Updated: 2026-02-28

## SESSION PROGRESS

### ✅ COMPLETED
- 레퍼런스 이미지 경로 확인: `/docs/ui.png`
- Dev Docs 트랙 생성: `dev/active/mobile-first-ui-image-parity/`
- `plan/context/tasks` 3파일 스캐폴딩 시작
- 모바일 우선 UI 정합 목표와 단계별 수용 기준 정의
- 사용자 제공 레퍼런스 이미지 기준 UI 요소 분석/분해 완료
- 섹션별 갭 체크리스트 문서 작성: `mobile-first-ui-image-parity-gap-analysis.md`
- 기능 로직 유지 상태로 홈 UI 구조/스타일 반영 완료 (`mvp-dashboard`, `home-view`, `task-input-section`)
- `퀘스트 추가/편집` 모달형 입력 흐름 반영(기존 생성/STT/시간 메타 로직 재사용)
- 하단 탭 아이콘/라벨 구조 반영 및 모바일 톤 재정렬
- 대기중 퀘스트 목록에서 현재 퀘스트 제외 로직 제거(할일형 목록/아코디언 유지)
- 탭 노출 조건 수정: `태스크 청킹`은 홈 탭 전용, `캐릭터 상태`는 홈/스탯에서 렌더링
- 대기중 퀘스트 행 UI 보정: 좌측 몬스터 아이콘 확대/우측 아코디언 화살표 시각 강화
- 대기중 퀘스트 메타 라벨 복구(`시작(Start)/마감(Due)/소요(Est. Min.)`) 및 compact 3칩 레이아웃 적용
- 대기중 퀘스트 아코디언 아이콘을 우상단 absolute로 재배치(본문 영향 제거)
- 대기중 퀘스트 메타 표기 포맷 수정: `시각(시작)` + 2행 `(Start)` 형태로 통일, 텍스트 ellipsis 제거
- 대기중 퀘스트 메타 재수정: 셀 카드 배경/보더 제거, 괄호 없는 `시작/마감/소요` 표기 + tighter spacing
- 대기중 퀘스트 메타 최종 보정: 괄호 표기 `(Start)/(Due)/(Est. Min.)` 복구, 좌측정렬 + 아이콘/패딩/줄간격 추가 축소
- 대기중 퀘스트 구조 보정: 외부 리스트 래퍼 카드 제거, 타이틀 분리, spacing/line-height를 타이트+가독성 기준으로 재조정
- 검증 통과: `npm run typecheck`, `npm run lint`, `npm run test:mvp`(8 files, 33 tests)

### 🟡 IN PROGRESS
- Phase 5 잔여 검증: `390px/430px/768px+` 시각 QA + 접근성 수동 점검

### ⚠️ BLOCKERS
- 레퍼런스 이미지의 정확한 폰트/아이콘 원본 에셋 정보 없음
- 픽셀 단위 동일성 검증을 위한 스크린샷 비교 자동화는 아직 미구성

## Key Decisions
- 이번 트랙은 기능 추가가 아니라 UI 정합과 조작 흐름 개선에 집중한다.
- 기존 `MvpDashboard` 로직(청킹/타이머/보상/이벤트)은 유지하고, 뷰 구조를 먼저 분리한다.
- 모바일 기준 뷰포트를 `390px`로 고정해 1차 맞춤 후 태블릿/데스크톱 확장을 진행한다.
- `frontend-dev-guidelines`에 맞춰 feature 단위 분리와 스타일 파일 분할 기준(100줄)을 적용한다.
- 레퍼런스는 단일 이미지가 아니라 섹션별로 분리 적용한다(`main_ui.png`: 1/2/4/5/6, `ui.png`: 3/7).

## Files In Scope
- `docs/ui.png` (UI 레퍼런스)
- `docs/main_ui.png` (UI 레퍼런스)
- `app/page.tsx`
- `features/mvp/components/mvp-dashboard.tsx`
- `features/mvp/components/mvp-dashboard.module.css`
- `dev/active/mobile-first-ui-image-parity/mobile-first-ui-image-parity-plan.md`
- `dev/active/mobile-first-ui-image-parity/mobile-first-ui-image-parity-context.md`
- `dev/active/mobile-first-ui-image-parity/mobile-first-ui-image-parity-tasks.md`
- `dev/active/mobile-first-ui-image-parity/mobile-first-ui-image-parity-gap-analysis.md`

## Quick Resume
1. Phase 5 잔여 항목(반응형 390/430/768+, 접근성 체크리스트)을 수동 QA로 확정한다.
2. 이미지 대비 오차가 큰 타이포/간격 토큰만 미세 조정한다.
3. 최종 스크린샷 비교 로그를 남기고 문서를 close-out 한다.
