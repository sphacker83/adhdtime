# ADHD Time

ADHD 사용자의 실행 부담을 낮추기 위한 태스크 중심 타이머 웹 앱입니다.  
Next.js(App Router) 기반으로 작성되어 있으며, 단일 대시보드에서 작업 집중 흐름을 관리합니다.

## 주요 기능

- 작업 생성/수정 모달
- 중요도(HIGH/MEDIUM/LOW) 기반 우선순위 관리
- 마감일 기준 D-Day 및 진행 시각화
- 작업 상태 전환(READY/RUNNING/COMPLETED)
- 작업 필터/정렬(중요도, 마감임박)
- 캘린더 연동 상태/동기화 로그(Mock UI)

## 기술 스택

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- ESLint 9 + eslint-config-next

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 스크립트

```bash
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run start      # 빌드 결과 실행
npm run lint       # ESLint 검사
npm run typecheck  # 타입 검사
```

## 프로젝트 구조

```text
app/          # 라우팅 및 전역 스타일
components/   # 대시보드/카드/모달 등 UI 컴포넌트
lib/          # 도메인 로직(타이머, 상태, 정렬/필터)
types/        # 공통 타입 정의
docs/         # 기획/설계 문서
```

## 참고

현재 일부 데이터(작업, 캘린더 연결/동기화)는 데모를 위한 mock 데이터로 동작합니다.
