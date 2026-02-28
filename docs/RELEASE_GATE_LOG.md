# RELEASE_GATE_LOG

Last Updated: 2026-02-28  
환경: local (`/Users/ethan/Workspace/dev/adhdtime`)

## 1) 표준 실행 명령

```bash
npm run verify:mvp
```

`verify:mvp`는 아래 순서로 실행된다.

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:mvp`
4. `npm run build`
5. `npm run verify:gate`

## 2) 최근 실행 결과

### 실행 #2 (최신)

- 실행 일시: 2026-02-28 18:04 KST
- 실행 명령: `npm run verify:mvp`
- 최종 결과: `PASS` (exit code 0)

| 단계 | 결과 | 핵심 로그 |
| --- | --- | --- |
| typecheck | PASS | `tsc --noEmit` 오류 없음 |
| lint | PASS | `eslint .` 오류 없음 |
| test:mvp | PASS | `8 files, 37 tests passed` |
| build | PASS | Next.js 16.1.6 빌드 성공 |
| verify:gate | PASS | 필수 이벤트 정의/샘플 커버리지/KPI 계산/null 안전 처리/수치 유효성 모두 PASS |

### 실행 #1

- 실행 일시: 2026-02-28 01:25~01:26 KST
- 실행 명령: `npm run verify:mvp`
- 최종 결과: `PASS` (exit code 0)

| 단계 | 결과 | 핵심 로그 |
| --- | --- | --- |
| typecheck | PASS | `tsc --noEmit` 오류 없음 |
| lint | PASS | `eslint .` 오류 없음 |
| test:mvp | PASS | `2 files, 11 tests passed` |
| build | PASS | Next.js 16.1.6 빌드 성공, `/` 정적 페이지 생성 |
| verify:gate | PASS | 필수 이벤트 정의/샘플 커버리지/KPI 계산/null 안전 처리/수치 유효성 모두 PASS |

### verify:gate 확인 항목

- 필수 이벤트 정의가 기대 목록과 일치
- 샘플 이벤트가 필수 이벤트 커버리지 충족
- 핵심 KPI 계산 가능
- 빈 이벤트 입력 시 KPI null 안전 처리

## 3) 실패 시 대응 절차

### A. `typecheck` 실패

1. `npm run typecheck` 단독 실행으로 오류 목록 확정
2. 타입 오류 파일 수정
3. `npm run typecheck` 재실행 후 통과 확인

### B. `lint` 실패

1. `npm run lint` 단독 실행
2. 규칙 위반 수정
3. `npm run lint` 재실행

### C. `test:mvp` 실패

1. `npm run test:mvp`로 실패 케이스 재현
2. 실패한 테스트의 입력/기대값/경계조건 점검
3. 수정 후 `npm run test:mvp` 재확인

### D. `build` 실패

1. `npm run build` 단독 실행
2. SSR/CSR 경계, 타입, import 경로 오류 점검
3. 수정 후 빌드 재실행

### E. `verify:gate` 실패

1. `npm run verify:gate` 단독 실행
2. 실패 메시지별 조치
   - 필수 이벤트 누락: `features/mvp/types/domain.ts`, `features/mvp/lib/kpi.ts`, `scripts/verify-release-gate.mjs` 동기화
   - KPI export 누락: `computeMvpKpis`, `getRequiredEventNames` export 확인
   - null 안전성 실패: `computeMvpKpis`의 분모 0 처리 로직 점검
3. 수정 후 `npm run verify:gate` 재실행

## 4) 재검증 규칙

- 어떤 단계에서 실패하더라도 최종 머지 전에는 반드시 `npm run verify:mvp` 전체를 다시 통과해야 한다.
- 문서 변경만 있는 경우에도, 릴리즈 문서 갱신 시점에는 최신 실행 결과(일시/결과)를 이 파일에 기록한다.
