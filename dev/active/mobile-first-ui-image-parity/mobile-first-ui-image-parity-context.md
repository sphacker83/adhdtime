# Mobile-First UI Image Parity Context

Last Updated: 2026-02-28

## SESSION PROGRESS

### ✅ COMPLETED
- 레퍼런스 이미지 경로 최신화: `/docs/ui/main_ui.png`, `/docs/ui/ui.png`, `/docs/ui/add_ui.png`
- 레퍼런스 섹션 매핑 갱신: `1/2/4/5 -> main_ui`, `3/7 -> ui`, `6 -> add_ui`
- Dev Docs 트랙 생성: `dev/active/mobile-first-ui-image-parity/`
- `plan/context/tasks` 3파일에 전략/진행/체크리스트 분리 구조 유지
- 신규 요구사항 6개(헤더 정합, 메시지 제거, 청킹 UI 재구성, 고정 헤더/네비, 진행중 다음 미션, 대기중 완료 제외) 문서 반영
- `MvpDashboard` 레이아웃을 `헤더 고정 + 하단 네비 고정 + 메인 스크롤` 구조로 재구성
- 타이틀/캐릭터 상태 사이 메시지 렌더 제거
- 입력 섹션을 우하단 플로팅 아이콘(⚔️) 기반 `AI 퀘스트 생성` 모달 플로우로 재구성
- 모달에서 퀘스트 이름 입력 우측 STT 버튼 유지, 생성 CTA를 `AI 퀘스트 생성`으로 고정
- 진행중 퀘스트 카드에 `다음 미션`(최대 3개) 표시 추가
- 대기중 퀘스트 목록에서 `done` 항목 제외 규칙 적용
- 일정 정합 강화: 태스크 상태 동기화 effect와 총시간 수정 경로에서 `normalizeTaskScheduleIso`로 시작/마감 자동 정규화
- 검증 완료: `npm run typecheck`, `npm run lint`, `npm run test:mvp` 통과

### 🟡 IN PROGRESS
- 레퍼런스 이미지(`main_ui/add_ui`) 대비 픽셀 단위 미세 간격 보정
- `390/430/768+` 수동 시각 QA 및 접근성 QA 기록

### ⚠️ BLOCKERS
- 레퍼런스 이미지의 정확한 폰트/아이콘 원본 에셋 정보 없음
- 픽셀 단위 동일성 검증을 위한 스크린샷 비교 자동화는 아직 미구성

## Key Decisions
- 이번 트랙은 기능 추가가 아니라 UI 정합과 조작 흐름 개선에 집중한다.
- 기존 `MvpDashboard` 로직(청킹/타이머/보상/이벤트)은 유지하고, 뷰 구조를 먼저 분리한다.
- 모바일 기준 뷰포트를 `390px`로 고정해 1차 맞춤 후 태블릿/데스크톱 확장을 진행한다.
- 스타일 기준은 토큰 근사값(`radius.card`, `space.sectionY`, `touch.min`)을 우선 사용한다.
- 레퍼런스는 섹션별로 분리 적용한다(`main_ui`: 1/2/4/5, `ui`: 3/7, `add_ui`: 6).
- 고정 레이아웃 규칙은 `헤더 고정 + 하단 네비 고정 + 메인 내용만 스크롤`로 유지한다.
- 진행중 퀘스트에는 `다음 미션`을 노출하고, 대기중 퀘스트에서는 완료 항목을 제외한다.

## Files In Scope
- `docs/ui/ui.png` (UI 레퍼런스)
- `docs/ui/main_ui.png` (UI 레퍼런스)
- `docs/ui/add_ui.png` (퀘스트 추가/편집 + 진행중 다음 미션 레퍼런스)
- `app/page.tsx`
- `features/mvp/components/mvp-dashboard.tsx`
- `features/mvp/components/mvp-dashboard.module.css`
- `features/mvp/task-input/components/task-input-section.tsx`
- `features/mvp/task-list/components/home-view.tsx`
- `dev/active/mobile-first-ui-image-parity/mobile-first-ui-image-parity-plan.md`
- `dev/active/mobile-first-ui-image-parity/mobile-first-ui-image-parity-context.md`
- `dev/active/mobile-first-ui-image-parity/mobile-first-ui-image-parity-tasks.md`

## Quick Resume
1. `390/430/768+`에서 `docs/ui/main_ui.png`, `docs/ui/add_ui.png`와 시각 비교 QA를 수행한다.
2. 미세 간격/타이포 보정이 필요하면 `mvp-dashboard.module.css` 최하단 parity override 섹션에서만 수정한다.
3. 수동 QA 결과를 `tasks.md` 체크박스와 본 `context.md`에 반영하고 트랙 close-out 한다.
