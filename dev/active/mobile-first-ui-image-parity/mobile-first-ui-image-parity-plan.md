# Mobile-First UI Image Parity Plan

Last Updated: 2026-02-27

## Executive Summary
`/docs/ui.png`를 기준 레퍼런스로 삼아, 현재 `MvpDashboard` UI를 모바일 우선(thumb-friendly) 구조로 재정렬한다. 목표는 기능 변경보다 시각/레이아웃/조작성 정합을 우선 달성하고, 기존 MVP/P1 로직은 최대한 유지하는 것이다.

## Reference
- 기준 이미지: `/docs/ui.png` (768x1376)
- 기준 뷰포트: `390x844`(iPhone 13/14), `393x852`(Pixel 7)

## Current State
- 엔트리: `app/page.tsx` -> `features/mvp/components/mvp-dashboard.tsx`
- 화면/로직이 단일 파일에 집중되어 섹션 단위 시각 튜닝 비용이 높다.
- 현재 UI는 기능은 충분하지만, 레퍼런스 대비 정보 밀도/시각 계층/하단 내비 형태가 다르다.
- `mvp-dashboard.module.css`가 크고 상태 스타일이 섞여 있어 모바일 정밀 조정 시 회귀 위험이 있다.

## Target State
1. 상단 헤더: 앱 타이틀 + 진행도 칩(레벨/일일 진행률) 정렬
2. Status Card: 레이더 차트 중심 카드(라벨/축/채움) 시각 정합
3. 입력 영역: 검색형 인풋 + 마이크 액션 + `AI가 쪼개기` 버튼을 엄지 영역에서 1탭 실행
4. 오늘의 퀘스트: 기본 접힘 리스트 + 첫 카드 확장 시 적응형 타이머/3개 CTA(시작·일시정지·완료)
5. 하단 탭바: 고정 내비(홈/할 일/스탯/설정), safe-area 대응

## Frontend Skill 적용 원칙 (`frontend-dev-guidelines`)
- App Router 진입점은 유지하고 Client Component 경계를 명확히 유지한다.
- `features/` 중심으로 화면 구성 요소를 분리하고 공통 요소만 `components/`로 승격한다.
- 스타일이 100줄 이상 커지면 섹션 단위 `.module.css` 분리를 우선한다.
- 로딩 상태는 조기 return으로 끊지 않고 기존 경계/상태 표현을 유지한다.
- 터치 타겟은 최소 `44x44px`, 핵심 액션은 화면 하단 엄지 영역에 배치한다.

## Implementation Phases

### Phase 0: UI 갭 분석 + 토큰 잠금
작업:
- `/docs/ui.png` 기준으로 spacing/radius/color/type scale 표 작성
- 현재 UI와 섹션별 차이점(헤더/상태/입력/퀘스트/탭바) 체크리스트화

Acceptance Criteria:
- 모바일 390px 기준 섹션별 갭 목록이 문서화되어 우선순위가 확정된다.
- 컬러/폰트/간격 토큰 초안이 준비된다.

### Phase 1: 모바일 셸 재구성
작업:
- `MvpDashboard` 렌더 트리를 모바일 기준 순서로 재배치
- 상단/중단 카드/하단 탭바의 레이아웃 그리드 정리
- safe-area 패딩과 스크롤 영역 분리

Acceptance Criteria:
- 390px에서 1스크린 진입 시 레퍼런스와 동일한 정보 순서를 가진다.
- 하단 탭바가 고정되어도 본문 주요 CTA가 가려지지 않는다.

### Phase 2: Status Card 시각 정합
작업:
- 레벨/진행률 칩, 레이더 카드의 hierarchy와 대비 재조정
- 레이더 축/그리드/데이터 폴리곤 스타일을 레퍼런스 느낌으로 맞춤

Acceptance Criteria:
- Status Card의 시각적 중심이 레이더 차트로 명확히 인지된다.
- 레벨/진행률 정보가 1초 내 스캔 가능 위치에 배치된다.

### Phase 3: 입력 + AI 청킹 액션 최적화
작업:
- 입력창 + 마이크 버튼 + `AI가 쪼개기`를 단일 액션 클러스터로 재구성
- placeholder, 보조문구, STT 상태 배지의 시각 우선순위 정리

Acceptance Criteria:
- 한 손 조작 기준으로 `입력 -> AI가 쪼개기`가 2탭 이내로 완료된다.
- STT 미지원/오류 fallback 문구 가독성이 유지된다.

### Phase 4: 오늘의 퀘스트 + 적응형 타이머 카드 정합
작업:
- 리스트 아이템 기본 높이/아이콘/체크 상태 스타일 정리
- 확장 카드에서 타이머 숫자, 적응형 라벨, 3개 CTA(시작/일시정지/완료) 재정렬

Acceptance Criteria:
- 첫 아이템 확장 상태가 레퍼런스와 유사한 카드 구조를 가진다.
- 타이머 동작(시작/일시정지/완료) 기존 로직 회귀 없이 작동한다.

### Phase 5: 하단 탭바 + 반응형 검증
작업:
- 하단 고정 탭바 아이콘/라벨/활성 상태 스타일 정리
- `390px`, `430px`, `768px+`에서 간격/폰트 스케일 검증

Acceptance Criteria:
- 모바일에서 탭바 가독성과 터치 정확도가 확보된다.
- 태블릿 이상에서 레이아웃 붕괴 없이 확장된다.

## Out Of Scope
- 신규 도메인 기능 추가(알림/STT/동기화 정책 변경)
- 데이터 모델/스토어 구조 재설계
- 디자인 시스템 전면 교체(MUI 전환 포함)

## Risks
- 단일 대형 컴포넌트에서 UI 리팩터링 중 이벤트 핸들러 회귀 가능성
- 타이머/청크 상태 UI를 손볼 때 실행 상태 표기가 깨질 위험
- 모바일 safe-area 처리 누락 시 하단 CTA 접근성 저하

## Mitigation
- UI 구조 분리 시 로직 함수/핸들러 시그니처를 먼저 고정한다.
- 각 Phase 종료 시 `typecheck/lint` + 핵심 수동 시나리오(생성/시작/일시정지/완료) 점검
- 탭바/본문 영역에 대해 iOS/Android safe-area 케이스를 모두 확인한다.

## Success Metrics
- 390px 기준 레퍼런스와 섹션 순서/계층/액션 위치가 동일하게 인지된다.
- 핵심 경로(`입력 -> AI 쪼개기 -> 시작 -> 일시정지 -> 완료`)의 클릭 오류가 없다.
- 기존 이벤트 로깅/상태 전이 테스트가 통과한다.

## Estimate (초기)
- Phase 0: S
- Phase 1: M
- Phase 2: M
- Phase 3: M
- Phase 4: M
- Phase 5: S-M

