# Gemini 통합 가이드

**GEMINI CLI용:** 사용자가 이 쇼케이스 저장소의 구성요소를 자신의 프로젝트에 통합해 달라고 요청하면, 아래 절차를 따르세요.

---

## 개요

이 저장소는 Gemini CLI 인프라 구성요소를 모아둔 **레퍼런스 라이브러리**입니다. 사용자는 특정 조각을 프로젝트에 적용하려고 합니다. 당신의 역할은 다음과 같습니다.

1. 프로젝트 구조에 대해 **확인 질문**하기
2. 적절한 파일 **복사**하기
3. 사용자 환경에 맞게 **설정 커스터마이징**하기
4. 통합이 정상 동작하는지 **검증**하기

**핵심 원칙:** 프로젝트 구조를 추측하지 말고 반드시 먼저 물어보세요. 한 프로젝트에서 맞는 설정이 다른 프로젝트에서는 깨질 수 있습니다.

---

## 기술 스택 호환성 확인

**중요:** 스킬을 통합하기 전에, 사용자 기술 스택이 해당 스킬 요구사항과 맞는지 먼저 확인해야 합니다.

### 프론트엔드 스킬

**frontend-dev-guidelines 요구사항:**
- Next.js (latest)
- React (18+)
- TypeScript
- (선택) MUI v7
- (선택) TanStack Query (클라이언트 데이터 페칭/캐싱)

**통합 전 질문:**
"Next.js(최신)를 사용하시나요? App Router(`app/`)인가요, Pages Router(`pages/`)인가요? 그리고 MUI v7을 사용하시나요?"

**아니오라면:**
```
frontend-dev-guidelines는 Next.js(최신) 기준입니다. 다음 중 가능합니다:
1. 이 스킬을 템플릿으로 삼아 [사용자 스택]용 변형 스킬 생성
2. 프레임워크 독립 패턴(파일 구조, 성능 등)만 추출
3. 이 스킬은 건너뛰기

어떤 방식이 좋을까요?
```

### 백엔드 스킬

**backend-dev-guidelines 요구사항:**
- Node.js/Express
- TypeScript
- Prisma ORM
- Sentry

**통합 전 질문:**
"Node.js + Express + Prisma를 사용하시나요?"

**아니오라면:**
```
backend-dev-guidelines는 Express/Prisma 기준입니다. 다음 중 가능합니다:
1. 이 스킬을 템플릿으로 [사용자 스택]에 맞는 가이드로 변형
2. 아키텍처 패턴(계층형 구조)만 추출
3. 이 스킬 건너뛰기

어떤 방식이 좋을까요?
```

### 기술 스택 무관 스킬

아래는 어떤 스택에서도 사용 가능합니다.
- ✅ **skill-developer** - 메타 스킬, 기술 의존 없음
- ✅ **route-tester** - JWT 쿠키 인증만 있으면 프레임워크 무관
- ✅ **error-tracking** - Sentry는 대부분 스택에서 사용 가능

---

## 일반 통합 패턴

사용자가 **"[컴포넌트]를 내 프로젝트에 추가해줘"**라고 하면:

1. 컴포넌트 유형 식별 (skill/hook/agent/command)
2. 프론트/백엔드 스킬이라면 **기술 스택 호환성 확인**
3. 프로젝트 구조 질문
4. 파일 복사 또는 스택 맞춤 변형
5. 사용자 환경에 맞게 설정 조정
6. 통합 검증
7. 다음 단계 안내

---

## 스킬 통합

### 단계별 절차

**사용자가 스킬을 요청할 때** (예: "backend-dev-guidelines 추가"):

#### 1. 프로젝트 파악

**아래 질문을 먼저 하세요:**
- "프로젝트 구조가 어떻게 되나요? 단일 앱/모노레포/멀티서비스인가요?"
- "[백엔드/프론트엔드] 코드는 어디에 있나요?"
- "어떤 프레임워크/기술을 사용하나요?"

#### 2. 스킬 복사

```bash
cp -r /path/to/showcase/.gemini/skills/[skill-name] \
      $GEMINI_PROJECT_DIR/.gemini/skills/
```

#### 3. skill-rules.json 처리

**파일 존재 여부 확인:**
```bash
ls $GEMINI_PROJECT_DIR/.gemini/skills/skill-rules.json
```

**없다면:**
- 쇼케이스 템플릿 복사
- 사용하지 않을 스킬 항목 제거
- 프로젝트에 맞게 수정

**있다면:**
- 기존 `skill-rules.json` 읽기
- 새 스킬 항목 추가
- 기존 설정을 깨지 않도록 병합

#### 4. 경로 패턴 커스터마이징

**중요:** `skill-rules.json`의 `pathPatterns`를 사용자 구조에 맞게 반드시 수정하세요.

**예시 - 모노레포:**
```json
{
  "backend-dev-guidelines": {
    "fileTriggers": {
      "pathPatterns": [
        "packages/api/src/**/*.ts",
        "packages/server/src/**/*.ts",
        "apps/backend/**/*.ts"
      ]
    }
  }
}
```

**예시 - 단일 백엔드:**
```json
{
  "backend-dev-guidelines": {
    "fileTriggers": {
      "pathPatterns": [
        "src/**/*.ts",
        "backend/**/*.ts"
      ]
    }
  }
}
```

**안전한 범용 패턴**(구조가 불명확할 때):
```json
{
  "pathPatterns": [
    "**/*.ts",
    "src/**/*.ts",
    "backend/**/*.ts"
  ]
}
```

#### 5. 통합 검증

```bash
# 스킬 복사 확인
ls -la $GEMINI_PROJECT_DIR/.gemini/skills/[skill-name]

# skill-rules.json 문법 확인
cat $GEMINI_PROJECT_DIR/.gemini/skills/skill-rules.json | jq .
```

**사용자에게 안내:** "[사용자 백엔드 경로]의 파일을 수정해 보세요. 스킬이 활성화되어야 합니다."

---

### 스킬별 메모

#### backend-dev-guidelines
- **요구 기술:** Node.js/Express, Prisma, TypeScript, Sentry
- **질문:** "Express + Prisma 쓰시나요?" "백엔드 코드는 어디 있나요?"
- **스택이 다르면:** 템플릿 기반 변형 제안
- **수정 포인트:** `pathPatterns`
- **예시 경로:** `api/`, `server/`, `backend/`, `services/*/src/`
- **변형 팁:** Routes→Controllers→Services 패턴은 대부분 프레임워크에 이식 가능

#### frontend-dev-guidelines
- **요구 기술:** Next.js (latest), React 18+, TypeScript (MUI v7/TanStack Query는 선택)
- **질문:** "Next.js를 쓰시나요? App Router인가요, Pages Router인가요?" "프론트엔드 코드는 어디 있나요? (예: app/, src/app/, pages/, src/pages/)"
- **라우팅 기준:** Next.js 라우팅(App Router면 `next/navigation`, Pages Router면 `next/router`) 전제
- **스택이 다르면:** Vue/Angular 등 맞춤 버전 생성 제안
- **수정 포인트:** `pathPatterns` + 프레임워크 종속 예시 전반
- **예시 경로:** `app/`, `src/app/`, `pages/`, `src/pages/`, `frontend/`, `client/`, `web/`, `apps/web/src/`
- **변형 팁:** 파일 구조/성능 패턴은 이식 가능, 컴포넌트 코드는 이식 어려움

#### route-tester
- **요구 기술:** JWT 쿠키 기반 인증(프레임워크 무관)
- **질문:** "JWT 쿠키 인증을 사용하시나요?"
- **아니오라면:** "[현재 인증 방식]에 맞게 변형할까요, 아니면 건너뛸까요?"
- **수정 포인트:** 서비스 URL, 인증 패턴
- **적용 가능:** JWT 쿠키를 쓰는 모든 백엔드

#### error-tracking
- **요구 기술:** Sentry(대부분 백엔드에서 사용 가능)
- **질문:** "Sentry를 사용하시나요?" "백엔드 코드는 어디 있나요?"
- **Sentry 미사용 시:** "[다른 에러 추적 도구] 템플릿으로 변형할까요?"
- **수정 포인트:** `pathPatterns`
- **변형 팁:** 에러 추적 철학은 Rollbar/Bugsnag 등에도 적용 가능

#### skill-developer
- **요구 기술:** 없음
- **그대로 복사 가능** - 어떤 스택에도 적용 가능한 메타 스킬

---

## 다른 기술 스택으로 스킬 변형

사용자 스택이 스킬 요구사항과 다를 때 선택지:

### 옵션 1: 기존 스킬 변형 (권장)

**사용 시점:** 사용자 스택에 맞는 유사 가이드를 원할 때

**절차:**
1. 시작점으로 스킬 복사
```bash
cp -r showcase/.gemini/skills/frontend-dev-guidelines \
      $GEMINI_PROJECT_DIR/.gemini/skills/vue-dev-guidelines
```

2. 변경 필요 항목 식별
- 프레임워크 종속 코드 예시 (React → Vue)
- 라이브러리 API (MUI → Vuetify/PrimeVue)
- import 구문
- 컴포넌트 패턴

3. 유지할 항목
- 파일 구성 원칙
- 성능 최적화 전략
- TypeScript 기준
- 일반 베스트 프랙티스

4. 예시 체계적으로 교체
- 사용자에게 스택 내 대응 패턴 확인
- 코드 예시를 해당 프레임워크로 치환
- 전체 섹션 구조는 유지

5. 스킬명/트리거 갱신
- 스킬 이름 변경
- `skill-rules.json` 트리거 갱신
- 활성화 테스트

**예시 - Vue 변형 안내 문구:**
```
frontend-dev-guidelines 스킬 구조를 기반으로 vue-dev-guidelines를 만들겠습니다.
- React.FC → Vue defineComponent
- useSuspenseQuery → Vue composables
- MUI 컴포넌트 → [사용자 UI 라이브러리]
- 유지: 파일 구조, 성능 패턴, TypeScript 가이드

몇 분 정도 걸리는데 진행할까요?
```

### 옵션 2: 프레임워크 무관 패턴만 추출

**사용 시점:** 스택 차이가 크지만 핵심 원칙은 적용 가능할 때

**절차:**
1. 기존 스킬 전체 검토
2. 프레임워크 무관 패턴 추출
- 계층형 아키텍처(백엔드)
- 파일 구조 전략
- 성능 최적화 원칙
- 테스트 전략
- 에러 처리 철학

3. 해당 패턴만 담은 새 스킬 생성
4. 프레임워크 종속 예시는 추후 사용자와 보강

### 옵션 3: 참고용으로만 사용

**사용 시점:** 변형 비용이 너무 크거나 구조가 완전히 다를 때

**절차:**
1. 사용자가 기존 스킬을 참고
2. 새 스킬은 처음부터 작성
3. 구조 템플릿만 기존 스킬에서 차용
4. 모듈형 패턴(메인 + 리소스 파일) 준수

### 스택 간 일반적으로 이식되는 항목

**아키텍처/구성:**
- ✅ 계층형 아키텍처(Routes/Controllers/Services)
- ✅ 관심사 분리
- ✅ 파일 조직 전략(features/ 패턴)
- ✅ 점진적 공개(메인 + 리소스)
- ✅ 데이터 접근용 Repository 패턴

**개발 실무:**
- ✅ 에러 처리 철학
- ✅ 입력 검증 중요성
- ✅ 테스트 전략
- ✅ 성능 최적화 원칙
- ✅ TypeScript 베스트 프랙티스

**프레임워크 종속 코드:**
- ❌ React hooks는 Vue/Angular에 직접 이식 불가
- ❌ MUI 컴포넌트는 타 UI 라이브러리와 비호환
- ❌ Prisma 쿼리는 ORM별 문법 상이
- ❌ Express 미들웨어는 프레임워크별 차이 큼
- ❌ 라우팅 구현은 프레임워크 종속

### 변형 권장 vs 스킵 기준

**변형 권장:**
- 사용자가 유사 가이드를 원함
- 계층 구조 등 핵심 패턴이 적용 가능
- 사용자와 함께 프레임워크 예시를 맞출 시간 확보

**스킵 권장:**
- 스택 차이가 매우 큼
- 해당 패턴이 사용자에게 필요 없음
- 변형 비용이 과도함
- 사용자가 처음부터 새로 만들길 원함

---

## 훅 통합

### 필수 훅(대체로 안전하게 복사 가능)

#### skill-activation-prompt (UserPromptSubmit)

**목적:** 사용자 프롬프트 기준으로 스킬 자동 제안

**통합 (커스터마이징 불필요):**

```bash
# 두 파일 복사
cp showcase/.gemini/hooks/skill-activation-prompt.sh \
   $GEMINI_PROJECT_DIR/.gemini/hooks/
cp showcase/.gemini/hooks/skill-activation-prompt.ts \
   $GEMINI_PROJECT_DIR/.gemini/hooks/

# 실행 권한 부여
chmod +x $GEMINI_PROJECT_DIR/.gemini/hooks/skill-activation-prompt.sh

# 필요 시 의존성 설치
if [ -f "showcase/.gemini/hooks/package.json" ]; then
  cp showcase/.gemini/hooks/package.json \
     $GEMINI_PROJECT_DIR/.gemini/hooks/
  cd $GEMINI_PROJECT_DIR/.gemini/hooks && npm install
fi
```

**settings.json 추가 항목:**
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "$GEMINI_PROJECT_DIR/.gemini/hooks/skill-activation-prompt.sh"
          }
        ]
      }
    ]
  }
}
```

**이 훅은 범용입니다.** 별도 구조 의존이 거의 없습니다.

#### post-tool-use-tracker (PostToolUse)

**목적:** 파일 변경 추적으로 컨텍스트 관리 보조

**통합 (커스터마이징 불필요):**

```bash
# 파일 복사
cp showcase/.gemini/hooks/post-tool-use-tracker.sh \
   $GEMINI_PROJECT_DIR/.gemini/hooks/

# 실행 권한 부여
chmod +x $GEMINI_PROJECT_DIR/.gemini/hooks/post-tool-use-tracker.sh
```

**settings.json 추가 항목:**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|MultiEdit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "$GEMINI_PROJECT_DIR/.gemini/hooks/post-tool-use-tracker.sh"
          }
        ]
      }
    ]
  }
}
```

**이 훅도 범용입니다.**

---

### 선택 훅(강한 커스터마이징 필요)

#### tsc-check.sh / trigger-build-resolver.sh (Stop 훅)

⚠️ **주의:** 특정 멀티서비스 모노레포를 전제로 작성되어 있습니다.

**통합 전 질문:**
1. "여러 TypeScript 서비스를 가진 모노레포인가요?"
2. "서비스 디렉터리 이름은 무엇인가요?"
3. "`tsconfig.json`은 어디에 있나요?"

**단순 프로젝트(단일 서비스)라면:**
- 이 훅은 **스킵 권장**
- 과한 구성일 수 있음
- 필요 시 수동으로 `tsc --noEmit` 실행

**복잡 프로젝트(멀티서비스 모노레포)라면:**

1. 파일 복사
2. `tsc-check.sh`의 서비스 분기 수정
```bash
case "$repo" in
    email|exports|form|frontend|projects|uploads|users|utilities|events|database)
        echo "$repo"
        return 0
        ;;
esac
```

3. 사용자 실제 서비스명으로 교체
```bash
case "$repo" in
    api|web|auth|payments|notifications)
        echo "$repo"
        return 0
        ;;
esac
```

4. settings.json 반영 전에 수동 테스트
```bash
./.gemini/hooks/tsc-check.sh
```

**중요:** 이 훅이 실패하면 Stop 이벤트를 막을 수 있습니다. 반드시 동작 확인 후 추가하세요.

---

## 에이전트 통합

에이전트는 **독립형**이라 가장 간단합니다.

### 기본 통합

```bash
cp showcase/.gemini/agents/[agent-name].md \
   $GEMINI_PROJECT_DIR/.gemini/agents/
```

이후 즉시 사용 가능합니다.

### 하드코딩 경로 점검

일부 에이전트는 경로를 직접 적어둘 수 있습니다. 복사 전 다음 패턴을 확인하세요.

- `~/git/old-project/` → `$GEMINI_PROJECT_DIR` 또는 `.`로 변경
- `/root/git/project/` → `$GEMINI_PROJECT_DIR` 또는 `.`로 변경
- 스크린샷 저장 경로 하드코딩 → 사용자에게 원하는 저장 위치 확인

필요 시 치환 예시:
```bash
sed -i 's|~/git/old-project/|.|g' $GEMINI_PROJECT_DIR/.gemini/agents/[agent].md
sed -i 's|/root/git/.*PROJECT.*DIR|$GEMINI_PROJECT_DIR|g' \
    $GEMINI_PROJECT_DIR/.gemini/agents/[agent].md
```

### 에이전트별 메모

**auth-route-tester / auth-route-debugger:**
- JWT 쿠키 인증 전제
- 질문: "JWT 쿠키 인증을 사용하시나요?"
- 미사용 시: 스킵 또는 인증 방식 맞춤 변형 제안

**frontend-error-fixer:**
- 스크린샷 경로를 참조할 수 있음
- 질문: "스크린샷 저장 경로를 어디로 할까요?"

**기타 에이전트:**
- 대체로 그대로 복사 가능

---

## 슬래시 명령어 통합

```bash
cp showcase/.gemini/commands/[command].toml \
   $GEMINI_PROJECT_DIR/.gemini/commands/
```

### 경로 커스터마이징

명령어 파일은 Dev Docs 경로를 참조할 수 있습니다.

**dev-docs / dev-docs-update:**
- `dev/active/` 경로 참조 여부 확인
- 질문: "개발 문서는 어디에 저장할까요?"
- 명령어 내 경로를 사용자 구조로 수정

**route-research-for-testing:**
- 서비스/API 경로 참조 가능
- 사용자 API 구조를 먼저 확인

---

## 공통 패턴과 베스트 프랙티스

### 프로젝트 구조 확인 패턴

**추측 금지:**
- ❌ "blog-api 서비스에 추가하겠습니다"
- ❌ "frontend 디렉터리 기준으로 설정하겠습니다"

**질문 우선:**
- ✅ "구조가 모노레포인가요, 단일 앱인가요?"
- ✅ "백엔드 코드는 어디에 있나요?"
- ✅ "워크스페이스/멀티서비스를 쓰나요?"

### skill-rules.json 커스터마이징 패턴

**워크스페이스 모노레포:**
```json
{
  "pathPatterns": [
    "packages/*/src/**/*.ts",
    "apps/*/src/**/*.tsx"
  ]
}
```

**Nx 모노레포:**
```json
{
  "pathPatterns": [
    "apps/api/src/**/*.ts",
    "libs/*/src/**/*.ts"
  ]
}
```

**단순 구조:**
```json
{
  "pathPatterns": [
    "src/**/*.ts",
    "backend/**/*.ts"
  ]
}
```

### settings.json 통합 패턴

**쇼케이스 `settings.json`을 통째로 복사하면 안 됩니다.**

필요한 섹션만 추출해 기존 설정과 병합하세요.

1. 사용자 기존 `settings.json` 읽기
2. 필요한 훅 섹션만 추가
3. 기존 설정 보존

**병합 예시:**
```json
{
  // ... 기존 설정 ...
  "hooks": {
    // ... 기존 훅 ...
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "$GEMINI_PROJECT_DIR/.gemini/hooks/skill-activation-prompt.sh"
          }
        ]
      }
    ]
  }
}
```

---

## 검증 체크리스트

통합 후 아래를 확인하세요.

```bash
# 1. 훅 실행 권한
ls -la $GEMINI_PROJECT_DIR/.gemini/hooks/*.sh
# 기대값: -rwxr-xr-x

# 2. skill-rules.json 유효성
cat $GEMINI_PROJECT_DIR/.gemini/skills/skill-rules.json | jq .
# 오류 없이 파싱되어야 함

# 3. 훅 의존성 설치 여부(타입스크립트 훅일 때)
ls $GEMINI_PROJECT_DIR/.gemini/hooks/node_modules/
# package.json이 있다면 패키지 목록이 보여야 함

# 4. settings.json 유효성
cat $GEMINI_PROJECT_DIR/.gemini/settings.json | jq .
# 오류 없이 파싱되어야 함
```

**사용자 테스트 요청:**
- "[관련 경로] 파일을 수정해 보세요. 스킬이 활성화되어야 합니다."
- "[주제]에 대해 질문해 보세요. 관련 스킬을 제안해야 합니다."

---

## 자주 하는 실수

### ❌ `settings.json`을 그대로 복사
**문제:** Stop 훅이 존재하지 않는 서비스를 참조
**대응:** `UserPromptSubmit`/`PostToolUse`만 추출

### ❌ 예시 서비스명을 그대로 사용
**문제:** 사용자 프로젝트엔 `blog-api`, `auth-service`가 없음
**대응:** 실제 구조를 물어보고 반영

### ❌ 훅 실행 권한 부여 누락
**문제:** 실행 권한이 없어 훅 미동작
**대응:** 복사 후 항상 `chmod +x`

### ❌ 모노레포 구조를 기본 가정
**문제:** 대부분은 단일 서비스
**대응:** 먼저 질문 후 맞춤 설정

### ❌ 스킬을 한 번에 전부 추가
**문제:** 과도하고 불필요한 항목 포함 가능
**대응:** 사용자 업무와 관련된 것부터 소수 적용

### ❌ Stop 훅 무검증 적용
**문제:** 실패 시 Stop 이벤트 차단
**대응:** 수동 테스트 후 정상일 때만 등록

---

## 통합 대화 예시

### 예시 1: 백엔드 스킬 추가

**사용자:** "backend-dev-guidelines 스킬 추가해줘"

**Gemini 응답 예시:**
```
backend-dev-guidelines를 추가하겠습니다. 먼저 프로젝트 구조를 확인해야 합니다.

1. 모노레포(멀티서비스)인가요, 단일 백엔드 앱인가요?
2. 백엔드 코드 경로는 어디인가요? (예: src/, backend/, server/)
3. Express.js를 사용하시나요?
```

**사용자:** "단일 앱이고 src/api/에 있어요. Express 씁니다"

**Gemini 처리:**
1. 스킬 디렉터리 복사
2. `skill-rules.json`의 `pathPatterns`를 `"src/api/**/*.ts"`로 설정
3. 복사/JSON 유효성 확인
4. 완료 안내
```
✅ backend-dev-guidelines 스킬을 추가했습니다.

설정 내용:
- src/api/ 경로 파일 편집 시 스킬 트리거
- "controller", "service", "route", "API" 키워드로 활성화

테스트: src/api/ 파일을 편집해 보세요. 스킬 제안이 나타나야 합니다.
```

### 예시 2: 훅 설정

**사용자:** "스킬 활성화 훅 설정해줘"

**Gemini 응답 예시:**
```
스킬 자동 활성화를 위해 두 훅을 설정하겠습니다.
1. skill-activation-prompt: 프롬프트 기반 스킬 제안
2. post-tool-use-tracker: 파일 변경 추적

현재 .gemini/settings.json이 이미 있나요, 아니면 새로 만들까요?
```

**사용자:** "기존 settings.json 있어요"

**Gemini 처리:**
1. 기존 `settings.json` 읽기
2. 훅 파일 2개 복사
3. hooks 디렉터리에서 `npm install`
4. 기존 설정 보존하며 훅 섹션 병합
5. 실행 권한 부여
6. 완료 안내
```
✅ 스킬 활성화 훅 설정 완료

적용 내용:
- skill-activation-prompt 훅 복사
- post-tool-use-tracker 훅 복사
- 의존성 설치
- settings.json에 훅 설정 병합

테스트: "help with backend development"처럼 질문해 보세요.
관련 스킬이 제안되어야 합니다.
```

### 예시 3: 에이전트 추가

**사용자:** "code-architecture-reviewer 에이전트 추가해줘"

**Gemini 응답 예시:**
```
code-architecture-reviewer는 아키텍처 이슈와 베스트 프랙티스를 점검하는 독립형 에이전트입니다.
별도 설정 없이 바로 사용 가능하므로 .gemini/agents/로 복사하겠습니다.
```

**처리 후 안내:**
```
✅ code-architecture-reviewer 에이전트 추가 완료

사용 방법(Task 도구):
- subagent_type: "code-architecture-reviewer"
- prompt: 리뷰할 코드/범위 설명

아키텍처 관점 피드백을 반환합니다.
```

### 예시 4: 기술 스택 불일치

**사용자:** "Vue 프로젝트에 frontend-dev-guidelines 추가해줘"

**Gemini 응답 예시:**
```
현재 프로젝트는 Vue이고, frontend-dev-guidelines는 Next.js(최신) + React 기준입니다.
다음 중 선택할 수 있습니다.

옵션 1 (권장): frontend-dev-guidelines를 템플릿으로 vue-dev-guidelines 생성
- 컴포넌트 패턴을 Vue(Composition API, defineComponent)로 변환
- (있다면) MUI 예시를 사용 중인 UI 라이브러리로 변환
- 데이터 페칭 패턴을 Vue 방식으로 변환
- 파일 구조/성능/TypeScript 기준은 유지

옵션 2: 프레임워크 무관 패턴만 추출
옵션 3: 건너뛰고 Vue 스킬을 처음부터 작성

어떤 옵션이 좋을까요?
```

**사용자:** "옵션 1, Vuetify 써요"

**Gemini 처리:**
1. `frontend-dev-guidelines` 복사 후 `vue-dev-guidelines`로 생성
2. 리소스 파일 전반에서 React → Vue Composition API 변환
3. MUI 예시 → Vuetify로 치환
4. `skill-rules.json`을 `.vue` 트리거로 갱신
5. 완료 안내
```
✅ Vue 3 + Vuetify용 vue-dev-guidelines를 만들었습니다.

변경 사항:
- React.FC → Vue defineComponent
- MUI v7 예시 → Vuetify 컴포넌트
- TanStack Query 예시 → Vue 데이터 페칭 방식
- 파일 트리거를 .vue 중심으로 변경

유지 사항:
- features/ 파일 구조
- 성능 최적화 전략
- TypeScript 기준
- 로딩/오류 상태 처리 원칙

테스트: .vue 파일을 편집해 보세요. 스킬이 활성화되어야 합니다.
```

---

## 빠른 참조 표

### 무엇을 커스터마이징해야 하나?

| 컴포넌트 | 기술 요구사항 | 커스터마이징 | 확인 질문 |
|-----------|------------------|--------------|-------------|
| **skill-developer** | 없음 | ✅ 없음 | 그대로 복사 |
| **backend-dev-guidelines** | Express/Prisma/Node | ⚠️ 경로 + 스택 확인 | "Express/Prisma 사용?" "백엔드 위치?" |
| **frontend-dev-guidelines** | Next.js (latest) / React | ⚠️⚠️ 경로 + 프레임워크 | "Next.js 사용?" "App/Pages Router?" "프론트 위치?" |
| **route-tester** | JWT 쿠키 인증 | ⚠️ 인증 + 경로 | "JWT 쿠키 인증?" |
| **error-tracking** | Sentry | ⚠️ 경로 | "Sentry 사용?" "백엔드 위치?" |
| **skill-activation-prompt** | 없음 | ✅ 거의 없음 | 그대로 복사 |
| **post-tool-use-tracker** | 없음 | ✅ 거의 없음 | 그대로 복사 |
| **tsc-check** | ⚠️⚠️⚠️ 고난도 | 큼 | "모노레포/단일 서비스?" |
| **모든 에이전트** | 낮음 | 최소 | 경로만 점검 |
| **모든 명령어** | 경로 의존 | ⚠️ 있음 | "Dev Docs 저장 위치?" |

### 스킵 권장 시점

| 컴포넌트 | 스킵 조건 |
|-----------|-----------|
| **tsc-check 계열 훅** | 단일 서비스이거나 빌드 구조가 다를 때 |
| **route-tester** | JWT 쿠키 인증을 쓰지 않을 때 |
| **frontend-dev-guidelines** | Next.js를 쓰지 않을 때 |
| **auth 계열 에이전트** | JWT 쿠키 인증을 쓰지 않을 때 |

---

## Gemini를 위한 최종 팁

**사용자가 "전부 추가해줘"라고 하면:**
- 필수부터 시작: 스킬 활성화 훅 + 관련 스킬 1~2개
- 처음부터 스킬 5개 + 에이전트 10개를 한 번에 넣지 말기
- 실제 필요 항목을 먼저 확인하기

**문제가 생기면:**
- 검증 체크리스트 실행
- 경로가 실제 구조와 일치하는지 점검
- 훅 수동 실행 테스트
- JSON 문법 오류 확인

**사용자가 확신이 없으면:**
- 스킬 활성화 훅만 먼저 권장
- 백엔드 또는 프론트엔드 스킬 중 하나만 추가
- 나머지는 이후 단계적으로 확장

**항상 설명할 것:**
- 어떤 명령을 실행하는지
- 왜 질문이 필요한지
- 완료 후 사용자 다음 행동

---

**기억:** 이 저장소는 동작 앱이 아니라 레퍼런스 라이브러리입니다. 목적은 "통째 복사"가 아니라 "사용자 프로젝트 구조에 맞춘 선별 적용"입니다.
