# Mobile-First UI Image Parity Context

Last Updated: 2026-02-27

## SESSION PROGRESS

### ✅ COMPLETED
- 레퍼런스 이미지 경로 확인: `/docs/ui.png`
- Dev Docs 트랙 생성: `dev/active/mobile-first-ui-image-parity/`
- `plan/context/tasks` 3파일 스캐폴딩 시작
- 모바일 우선 UI 정합 목표와 단계별 수용 기준 정의

### 🟡 IN PROGRESS
- 없음 (다음 턴부터 Phase 0/1 구현 착수 가능)

### ⚠️ BLOCKERS
- 레퍼런스 이미지의 정확한 폰트/아이콘 원본 에셋 정보 없음
- 픽셀 단위 동일성 검증을 위한 스크린샷 비교 자동화는 아직 미구성

## Key Decisions
- 이번 트랙은 기능 추가가 아니라 UI 정합과 조작 흐름 개선에 집중한다.
- 기존 `MvpDashboard` 로직(청킹/타이머/보상/이벤트)은 유지하고, 뷰 구조를 먼저 분리한다.
- 모바일 기준 뷰포트를 `390px`로 고정해 1차 맞춤 후 태블릿/데스크톱 확장을 진행한다.
- `frontend-dev-guidelines`에 맞춰 feature 단위 분리와 스타일 파일 분할 기준(100줄)을 적용한다.

## Files In Scope
- `docs/ui.png` (UI 레퍼런스)
- `app/page.tsx`
- `features/mvp/components/mvp-dashboard.tsx`
- `features/mvp/components/mvp-dashboard.module.css`
- `dev/active/mobile-first-ui-image-parity/mobile-first-ui-image-parity-plan.md`
- `dev/active/mobile-first-ui-image-parity/mobile-first-ui-image-parity-context.md`
- `dev/active/mobile-first-ui-image-parity/mobile-first-ui-image-parity-tasks.md`

## Quick Resume
1. `plan.md`의 Phase 0 기준으로 레퍼런스 대비 UI 갭 체크리스트를 먼저 고정한다.
2. `mvp-dashboard.tsx`의 렌더 구조를 모바일 섹션 단위로 분리(헤더/상태/입력/퀘스트/탭바)한다.
3. `390px`에서 시각 정합을 맞춘 뒤, `430px`/`768px+` 확장과 회귀 점검을 수행한다.

