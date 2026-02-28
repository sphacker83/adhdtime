# ADHDTime

ADHD 친화형 실행 보조 웹앱입니다.  
현재 메인 엔트리는 `app/page.tsx`이며, `features/mvp/components/mvp-dashboard.tsx` 단일 대시보드에서 MVP 루프를 제공합니다.

## 현재 범위 (2026-02-28 기준)

### MVP P0 코어 루프 (구현됨)
- 텍스트 과업 입력
- 문장 유사도 기반 로컬 퀘스트/미션 추천(프리셋 JSON)
- 미션 수정/삭제/순서 재정렬
- 미션 타이머(시작/일시정지/재개/완료)
- 5분 미세 햅틱 ON/OFF
- 보상(XP/레벨/5스탯) 즉시 반영
- 복귀 루프(재청킹/내일로 재등록)
- 일간 리포트 + MVP KPI 스냅샷
- 필수 이벤트 로깅 + 위험 입력 차단 + raw 입력 장기 저장 최소화

### P1 Foundation (부분 구현)
- 브라우저 알림 권한 상태/요청/폴백 UI
- STT 지원성 감지 + 시작/중지 + transcript 미리보기
- 외부 동기화 상태 전이 Mock(성공/실패/충돌)

## 기술 스택

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Vitest 4
- ESLint 9 + eslint-config-next

## 시작하기

```bash
npm install
npm run dev
```

접속: `http://localhost:3000`

## NPM 스크립트

```bash
npm run dev         # 개발 서버
npm run build       # 프로덕션 빌드
npm run start       # 프로덕션 서버 실행
npm run lint        # ESLint 검사
npm run typecheck   # TypeScript 타입 검사
npm run test:mvp    # MVP 도메인 테스트(kpi, timer-accuracy)
npm run verify:gate # 릴리즈 게이트 스크립트 실행
npm run verify:mvp  # typecheck -> lint -> test -> build -> gate 일괄 검증
```

## 릴리즈 검증 진입점

MVP 릴리즈 전 기본 검증은 아래 명령 1회로 수행합니다.

```bash
npm run verify:mvp
```

자세한 실행 로그/실패 대응은 `docs/RELEASE_GATE_LOG.md`를 참고하세요.

## 프로젝트 구조 (현재 사용 기준)

```text
app/                         # Next.js App Router 엔트리
features/mvp/               # MVP 루프 UI/도메인 로직/타입
scripts/                    # 릴리즈 게이트 스크립트
docs/                       # 기준 문서 + 아카이브 인덱스 (docs/README.md)
dev/active/                 # 진행 중 Dev Docs 트랙
dev/archive/                # 완료/중단 Dev Docs 트랙 보관
```

## 참고 문서

- `docs/README.md`
- `docs/PRD.md`
- `docs/USECASE.md`
- `docs/TRACEABILITY_MATRIX.md`
- `docs/KPI_PIPELINE.md`
- `docs/RELEASE_GATE_LOG.md`

## 현재 주의사항

- 로컬 추천에서 유사한 퀘스트를 찾지 못하면 자동 생성하지 않고 재입력을 요청합니다.
- 외부 캘린더 동기화는 실제 OAuth 연동이 아니라 상태 전이 Mock입니다.
- 알림은 현재 `mission_started`/`reschedule_requested` 이벤트 트리거 중심입니다.
