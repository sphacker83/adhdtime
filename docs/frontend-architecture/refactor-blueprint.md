# Frontend Refactor Blueprint

Last Updated: 2026-02-27

## 1) 배경

현재 프론트엔드는 MVP 기능이 빠르게 확장되면서 단일 파일에 책임이 과도하게 집중되어 있습니다.

- `features/mvp/components/mvp-dashboard.tsx`: 2,911 lines
- `features/mvp/components/mvp-dashboard.module.css`: 988 lines
- `components/phase-one-dashboard.tsx`: 756 lines

결과적으로 다음 문제가 발생합니다.

- UI 렌더링, 도메인 규칙, 브라우저 API, 저장/이벤트 로깅 로직이 한 파일에 혼재
- 기능 변경 시 회귀 범위가 넓어져 수정 비용 증가
- 테스트 단위가 불명확해 안전한 분해가 어려움

## 2) 리팩터링 목표

- 기능 동작을 유지한 채 책임 분리(behavior parity 유지)
- 파일/모듈 경계를 명확히 하여 변경 영향 범위를 축소
- "새 기능 추가"와 "기존 기능 수정"의 작업 난이도 차이를 줄임
- 대규모 컴포넌트 의존성을 단계적으로 해소

## 3) 비목표

- 시각 디자인 전면 개편
- 기술 스택 교체(Next/React/TypeScript 유지)
- 한 번에 전면 재작성(big-bang rewrite)

## 4) 목표 아키텍처

### 4.1 디렉터리 구조 (Target)

```text
app/
  page.tsx                         # 라우트 엔트리(얇게 유지)

features/
  mvp/
    shell/                         # 탭/레이아웃/상위 조립
      components/
      hooks/
      index.ts
    task-input/                    # 입력/STT/미션 생성 폼
      components/
      hooks/
      model/
      index.ts
    task-list/                     # 과업/미션 리스트 및 폴딩
      components/
      hooks/
      model/
      index.ts
    timer-runtime/                 # 실행/일시정지/시간 조정
      components/
      hooks/
      model/
      index.ts
    stats/                         # KPI/스탯 표시
      components/
      selectors/
      index.ts
    settings/                      # 설정 패널
      components/
      index.ts
    recovery/                      # 복귀 루프 액션
      model/
      index.ts
    integrations/                  # Notification/STT/Sync 어댑터 경계
      notification/
      stt/
      sync/
      index.ts
    shared/
      constants/
      selectors/
      types/
      index.ts

components/                        # 진짜 공통 UI 컴포넌트만 유지
lib/                               # 프레임워크 비의존 유틸
types/                             # 앱 전역 타입
```

### 4.2 의존성 규칙

- `app/*`는 feature의 공개 API(`index.ts`)만 import
- feature 내부 모듈은 같은 feature 내부만 직접 참조
- `model/`은 React/DOM 의존 금지(순수 함수 유지)
- `integrations/`만 브라우저 API(`Notification`, `SpeechRecognition`, storage) 접근 가능
- 공통 UI(`components/`)는 도메인 지식 금지

### 4.3 상태 관리 경계

- 상위 상태: `features/mvp/shell`에서 `useReducer` 기반 통합 상태 관리
- 하위 모듈: selector + action creator로 접근
- 부수효과: reducer 외부(effect hook / adapter)로 격리
- 저장/복원: storage adapter 단일 경로 사용

## 5) 모듈 분해 우선순위

1. `task-input` (입력 검증/자동 계산/생성 경계 분리)
2. `timer-runtime` (시간 계산/버튼 액션/로그 분리)
3. `task-list` (홈/할 일 탭 렌더링 분리)
4. `integrations` (STT/알림/외부 동기화 어댑터 분리)
5. `stats`/`settings` (표시 로직과 상호작용 분리)

## 6) 코드 규칙

- 단일 컴포넌트 파일 400 lines 초과 금지(예외 시 ADR 필요)
- 단일 CSS Module 300 lines 초과 금지(모듈별 분리)
- 함수형 순수 로직은 `model/` 또는 `lib/`로 이동
- feature 외부에서 deep import 금지

## 7) 테스트 전략

- 모델 로직: Vitest 단위 테스트 우선 추가
- 모듈 분리 단계마다 회귀 스모크 체크:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:mvp`
  - 필요 시 `npm run build`
- 각 Phase 종료 시 behavior parity 체크리스트를 기록

## 8) 산출물 정의

- 구조 정의: 본 문서(`refactor-blueprint.md`)
- 실행 순서: `refactor-roadmap.md`
- 의사결정 로그: `adr-template.md` 기반 ADR 문서
- 세션 인수인계: `dev/active/frontend-architecture-refactor/*`
