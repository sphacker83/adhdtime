# Mobile-First UI Image Parity Context

Last Updated: 2026-02-28

## SESSION PROGRESS

### ✅ COMPLETED
- 기존 라운드 반영사항(고정 헤더/하단 탭, 다음 미션 기본 표시, 대기중 done 제외)이 `main`에 반영되어 있음
- 이번 라운드 착수 전 탐색 완료:
  - 플로팅 버튼/모달 닫힘 이슈 원인 확인
  - 다음 미션 아이콘 도입을 위한 타입/생성/저장 경로 확인
  - 헤더 정합(`오늘의 달성도` 텍스트+링, 하단 시간줄) 수정 지점 확인
- 문서 선행 원칙에 따라 `plan/context/tasks` 재작성 완료
- `Chunk.iconKey` 모델 추가 및 생성/저장 경로 반영(`domain/chunking/storage`)
- 플로팅 `퀘스트 생성` 버튼을 전 탭 우하단 고정 노출로 변경
- 퀘스트 생성 성공 시 모달 자동 닫힘 적용
- 기본 소요시간 표시 `--` 반영
- 현재 퀘스트 카드 구조 변경:
  - 타이틀 `퀘스트 : [이름]`
  - `#분 청크` 제거
  - 예상소요시간/마감시간/마감까지 남은 시간 표시
  - 다음 미션 섹션을 CTA 아래로 이동
- 다음 미션 개선:
  - 상태 텍스트 제거
  - 아이콘(`iconKey`) 표시
  - 삭제 버튼 추가
- 대기중 퀘스트/미션 수정 버튼 추가(기존 핸들러 재사용)
- 헤더 보정:
  - `오늘의 달성도` 텍스트/링 위치 조정
  - 타이틀바 하단 날짜/요일/시간 표시 추가
- 헤더 2차 미세 보정:
  - 상단 공백(패딩/갭/그림자) 축소
  - 달성도 텍스트 우측 정렬 및 링 크기/간격 재조정
  - 본문 시작 간격 동기화
- 반응형 hotfix 적용:
  - 헤더/탭바 `max-width` 캡 제거로 좌우 full-width 정렬
  - 하단 탭바 하단 여백 누적 해소(`shell padding`, `tabBar padding` 재조정)
  - 모달 오픈 시 탭바 가림 방지(z-index 재정렬)
  - 현재 퀘스트의 `현재 미션`, `1개 +`, `대기` 칩 제거
- Round 3 UI 보정 적용:
  - 헤더 내부 정렬 재조정(타이틀/달성도/시간줄)
  - 시간줄 폰트 확대 및 헤더 하단 공백 축소
  - 탭바 높이(52px 버튼 기준) 정합화 + 버튼 수직 정렬 보정
  - `퀘스트 : 없음` fallback 고정
  - `캐릭터 상태` 타이틀 카드 내부 이동
  - `대기 중인 퀘스트` 섹션 카드 내부 구조 통일
  - 퀘스트 생성 FAB 좌하단 이동 + 세로 레이아웃(큰 아이콘) 적용
- Playwright 실측 검증 완료:
  - `output/playwright/before-fix-home.png`
  - `output/playwright/after-fix-home.png`
  - `output/playwright/after-fix-modal-open.png`
  - `output/playwright/after-plan-home.png`
  - `output/playwright/after-plan-modal.png`
  - `output/playwright/after-plan-home-v2.png`
  - `output/playwright/post-fix-home-current.png`
  - `output/playwright/post-fix-home-current-v2.png`
- 최종 레이아웃 충돌 해소:
  - 헤더 `display:grid`에 남아 있던 `justify-content: space-between` 잔존값 제거
  - 헤더 시간줄 width를 100%로 고정해 좌우 full-width 정렬 확보
  - 하단 탭바를 `display:flex`, `height: 52px`로 고정해 버튼/컨테이너 높이 불일치 해소
- 상위 문서 동기화 완료:
  - `docs/PRD.md` v3.2 반영
  - `docs/DEVELOPMENT_PLAN.md` v2.2 반영
- main 브랜치 1차 반영 완료:
  - commit: `8f9f2b3`
  - 내용: 모바일 UI 파리티 보정 + 문서 동기화 + Playwright 캡처
- Round 4 네비 CTA 재구성 완료:
  - 좌하단 플로팅 CTA 제거
  - 하단 네비 중앙 원형 CTA + 상단 돌출(`---^---`) 형태 적용
  - 모달 상태를 `MvpDashboard`로 승격해 중앙 CTA와 연결
  - Playwright 캡처 추가:
    - `output/playwright/nav-center-cta-home.png`
    - `output/playwright/nav-center-cta-modal.png`
- 문서 체계 정리:
  - 비어 있던 사이드 플랜 트랙 `dev/active/task-json-preset-scoring-side-plan`을 `dev/archive/`로 이동
- 검증 통과:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:mvp` (37 tests)

### 🟡 IN PROGRESS
- `/docs/ui/main_ui.png` 대비 헤더 픽셀 미세 보정(폰트 렌더링 차이) 수동 QA

### ⚠️ BLOCKERS
- `/docs/ui/main_ui.png` 원본 폰트/디자인 토큰 미제공으로 픽셀 단위 100% 동일성은 수동 미세 보정 필요

## Key Decisions
1. 이번 라운드는 `MvpDashboard` 경로만 수정한다. (`PhaseOneDashboard` 미사용)
2. 퀘스트 생성 CTA는 하단 네비 중앙 돌출 원형 버튼으로 유지한다(플로팅 사용 안 함).
3. 생성 모달 닫힘은 `onGenerateTask` 성공 boolean 반환으로 제어한다.
4. 미션 아이콘은 `Chunk.iconKey` optional 필드로 도입해 기존 데이터와 호환한다.
5. 홈 뷰 편집/삭제 액션은 기존 핸들러를 재사용해 회귀 위험을 줄인다.
6. 헤더 정합은 CSS 최하단 parity override 블록에서만 수정한다.

## Files In Scope
- `docs/ui/main_ui.png`
- `docs/ui/add_ui.png`
- `features/mvp/components/mvp-dashboard.tsx`
- `features/mvp/components/mvp-dashboard.module.css`
- `features/mvp/task-input/components/task-input-section.tsx`
- `features/mvp/task-list/components/home-view.tsx`
- `features/mvp/types/domain.ts`
- `features/mvp/lib/chunking.ts`
- `features/mvp/lib/storage.ts`
- `features/mvp/shared/model/display-utils.ts`
- `dev/active/mobile-first-ui-image-parity/mobile-first-ui-image-parity-plan.md`
- `dev/active/mobile-first-ui-image-parity/mobile-first-ui-image-parity-context.md`
- `dev/active/mobile-first-ui-image-parity/mobile-first-ui-image-parity-tasks.md`

## Quick Resume
1. 수동 UI QA(`docs/ui/main_ui.png`, `docs/ui/add_ui.png` 비교)로 헤더/중앙 CTA/홈카드를 확인한다.
2. 필요시 `mvp-dashboard.module.css` parity override만 미세 조정한다.
3. 최종 커밋/푸시를 진행한다.
