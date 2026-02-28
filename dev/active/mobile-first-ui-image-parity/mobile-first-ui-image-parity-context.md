# Mobile-First UI Image Parity Context

Last Updated: 2026-02-28

## SESSION PROGRESS

### ✅ COMPLETED
- 레퍼런스 이미지 경로 확인: `/docs/ui.png`
- 레퍼런스 섹션 매핑 고정: `1/2/4/5/6 -> main_ui`, `3/7 -> ui`
- Dev Docs 트랙 생성: `dev/active/mobile-first-ui-image-parity/`
- `plan/context/tasks` 3파일에 전략/진행/체크리스트 분리 구조 확정
- 모바일 우선 UI 정합 목표와 단계별 수용 기준 정의
- 기능 로직 유지 상태로 홈 UI 구조/스타일 반영 완료 (`mvp-dashboard`, `home-view`, `task-input-section`)
- 대기중 퀘스트 목록에서 현재 퀘스트 제외 로직 제거(할일형 목록/아코디언 유지)
- 탭 노출 조건 수정: `태스크 청킹`은 홈 탭 전용, `캐릭터 상태`는 홈/스탯에서 렌더링
- 대기중 퀘스트 행 UI 보정: 아이콘/화살표/메타(시작/마감/소요) 가독성 및 간격 조정
- 대기중 퀘스트 구조 보정: 외부 래퍼 카드 제거 + 타이틀 분리 + 아코디언 아이콘 absolute 배치
- `TaskInputSection` 설명 문구 제거 및 상단 액션 버튼 라벨 `퀘스트 추가`로 변경
- `퀘스트 추가/편집` 모달을 `main_ui.png` 기준으로 재정렬: 하단 시트형/시간 카드 3종/단일 CTA
- 시간 카드 입력 흐름 변경: 시작 예정/마감 기한은 버튼 클릭 시 일정 선택, 소요 시간은 버튼 클릭 시 숫자 입력
- 일정 표기 규칙 통일: `오늘/내일/D-##`
- 실행 중 청크 증감 버튼을 한 줄(`-5/-1/+1/+5`)로 통일
- 퀘스트/AI 생성 + 수동 청크 생성 시 일정 정규화/엄격 파싱 적용
- 시간 동기화 로직 보정: 소요 시간 변경 시 `마감 = 시작 + 소요`를 강제 앵커(`scheduledFor`)로 유지
- 하단 탭 아이콘/라벨 구조 반영 및 모바일 톤 재정렬
- 검증 통과: `npm run typecheck`, `npm run lint`, `npm run test:mvp`(8 files, 35 tests)

### 🟡 IN PROGRESS
- Phase 5 잔여 검증: `390px/430px/768px+` 시각 QA
- 접근성 수동 점검: 포커스/대비/터치 타깃/모달 닫힘 후 포커스 복귀

### ⚠️ BLOCKERS
- 레퍼런스 이미지의 정확한 폰트/아이콘 원본 에셋 정보 없음
- 픽셀 단위 동일성 검증을 위한 스크린샷 비교 자동화는 아직 미구성

## Key Decisions
- 이번 트랙은 기능 추가가 아니라 UI 정합과 조작 흐름 개선에 집중한다.
- 기존 `MvpDashboard` 로직(청킹/타이머/보상/이벤트)은 유지하고, 뷰 구조를 먼저 분리한다.
- 모바일 기준 뷰포트를 `390px`로 고정해 1차 맞춤 후 태블릿/데스크톱 확장을 진행한다.
- 스타일 기준은 토큰 근사값(`radius.card`, `space.sectionY`, `touch.min`)을 우선 사용한다.
- 레퍼런스는 섹션별로 분리 적용한다(`main_ui.png`: 1/2/4/5/6, `ui.png`: 3/7).

## Files In Scope
- `docs/ui.png` (UI 레퍼런스)
- `docs/main_ui.png` (UI 레퍼런스)
- `app/page.tsx`
- `features/mvp/components/mvp-dashboard.tsx`
- `features/mvp/components/mvp-dashboard.module.css`
- `dev/active/mobile-first-ui-image-parity/mobile-first-ui-image-parity-plan.md`
- `dev/active/mobile-first-ui-image-parity/mobile-first-ui-image-parity-context.md`
- `dev/active/mobile-first-ui-image-parity/mobile-first-ui-image-parity-tasks.md`

## Quick Resume
1. `tasks.md`의 섹션별 패리티 체크리스트(1~7, 공통 인터랙션)를 순서대로 검증한다.
2. `390/430/768+`에서 깨지는 항목만 토큰 단위로 미세 조정한다.
3. 접근성 항목(포커스/대비/터치/모달 종료 복귀)을 완료 처리하고 트랙을 close-out 한다.
