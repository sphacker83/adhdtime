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
- 검증 통과:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:mvp` (37 tests)

### 🟡 IN PROGRESS
- 홈/할일/스탯/설정 탭에서 플로팅 버튼 시각 QA(최종 확인)

### ⚠️ BLOCKERS
- `/docs/ui/main_ui.png` 원본 폰트/디자인 토큰 미제공으로 픽셀 단위 100% 동일성은 수동 미세 보정 필요

## Key Decisions
1. 이번 라운드는 `MvpDashboard` 경로만 수정한다. (`PhaseOneDashboard` 미사용)
2. 플로팅 생성 버튼은 홈 탭 조건문 밖으로 이동해 전 탭에서 노출한다.
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
1. 수동 UI QA(`docs/ui/main_ui.png`, `docs/ui/add_ui.png` 비교)로 헤더/플로팅/홈카드를 확인한다.
2. 필요시 `mvp-dashboard.module.css` parity override만 미세 조정한다.
3. 최종 커밋/푸시를 진행한다.
