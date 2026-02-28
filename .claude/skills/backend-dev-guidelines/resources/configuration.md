# 설정 관리 - UnifiedConfig 패턴

백엔드 마이크로서비스에서 설정(configuration)을 관리하는 완전한 가이드입니다.

## 목차

- [UnifiedConfig 개요](#unifiedconfig-overview)
- [process.env 직접 사용 금지](#never-use-processenv-directly)
- [설정 구조](#configuration-structure)
- [환경별 설정](#environment-specific-configs)
- [시크릿(Secrets) 관리](#secrets-management)
- [마이그레이션 가이드](#migration-guide)

---

## UnifiedConfig 개요

### 왜 UnifiedConfig인가?

**process.env의 문제점:**
- ❌ No type safety
- ❌ No validation
- ❌ Hard to test
- ❌ Scattered throughout code
- ❌ No default values
- ❌ Runtime errors for typos

**unifiedConfig의 장점:**
- ✅ Type-safe configuration
- ✅ Single source of truth
- ✅ Validated at startup
- ✅ Easy to test with mocks
- ✅ Clear structure
- ✅ Fallback to environment variables

---

## process.env 직접 사용 금지

### 규칙

```typescript
// ❌ NEVER DO THIS
const timeout = parseInt(process.env.TIMEOUT_MS || '5000');
const dbHost = process.env.DB_HOST || 'localhost';

// ✅ ALWAYS DO THIS
import { config } from './config/unifiedConfig';
const timeout = config.timeouts.default;
const dbHost = config.database.host;
```

### 왜 중요한가

**문제가 되는 예시:**
```typescript
// Typo in environment variable name
const host = process.env.DB_HSOT; // undefined! No error!

// Type safety
const port = process.env.PORT; // string! Need parseInt
const timeout = parseInt(process.env.TIMEOUT); // NaN if not set!
```

**unifiedConfig를 사용하면:**
```typescript
const port = config.server.port; // number, guaranteed
const timeout = config.timeouts.default; // number, with fallback
```

---

## 설정 구조

### UnifiedConfig 인터페이스

```typescript
export interface UnifiedConfig {
    database: {
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
    };
    server: {
        port: number;
        sessionSecret: string;
    };
    tokens: {
        jwt: string;
        inactivity: string;
        internal: string;
    };
    keycloak: {
        realm: string;
        client: string;
        baseUrl: string;
        secret: string;
    };
    aws: {
        region: string;
        emailQueueUrl: string;
        accessKeyId: string;
        secretAccessKey: string;
    };
    sentry: {
        dsn: string;
        environment: string;
        tracesSampleRate: number;
    };
    // ... more sections
}
```

### 구현 패턴

**파일:** `/blog-api/src/config/unifiedConfig.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as ini from 'ini';

const configPath = path.join(__dirname, '../../config.ini');
const iniConfig = ini.parse(fs.readFileSync(configPath, 'utf-8'));

export const config: UnifiedConfig = {
    database: {
        host: iniConfig.database?.host || process.env.DB_HOST || 'localhost',
        port: parseInt(iniConfig.database?.port || process.env.DB_PORT || '3306'),
        username: iniConfig.database?.username || process.env.DB_USER || 'root',
        password: iniConfig.database?.password || process.env.DB_PASSWORD || '',
        database: iniConfig.database?.database || process.env.DB_NAME || 'blog_dev',
    },
    server: {
        port: parseInt(iniConfig.server?.port || process.env.PORT || '3002'),
        sessionSecret: iniConfig.server?.sessionSecret || process.env.SESSION_SECRET || 'dev-secret',
    },
    // ... more configuration
};

// 핵심 설정 검증
if (!config.tokens.jwt) {
    throw new Error('JWT secret not configured!');
}
```

**핵심 포인트:**
- config.ini를 우선 읽기
- process.env로 폴백
- 개발 환경 기본값 제공
- 시작 시점 검증
- 타입 안전한 접근

---

## 환경별 설정

### config.ini 구조

```ini
[database]
host = localhost
port = 3306
username = root
password = password1
database = blog_dev

[server]
port = 3002
sessionSecret = your-secret-here

[tokens]
jwt = your-jwt-secret
inactivity = 30m
internal = internal-api-token

[keycloak]
realm = myapp
client = myapp-client
baseUrl = http://localhost:8080
secret = keycloak-client-secret

[sentry]
dsn = https://your-sentry-dsn
environment = development
tracesSampleRate = 0.1
```

### 환경 오버라이드

```bash
# .env file (optional overrides)
DB_HOST=production-db.example.com
DB_PASSWORD=secure-password
PORT=80
```

**우선순위:**
1. config.ini(가장 높음)
2. process.env 변수
3. 하드코딩된 기본값(가장 낮음)

---

## 시크릿(Secrets) 관리

### 시크릿을 커밋하지 마세요

```gitignore
# .gitignore
config.ini
.env
sentry.ini
*.pem
*.key
```

### 프로덕션에서는 환경 변수를 사용

```typescript
// Development: config.ini
// Production: Environment variables

export const config: UnifiedConfig = {
    database: {
        password: process.env.DB_PASSWORD || iniConfig.database?.password || '',
    },
    tokens: {
        jwt: process.env.JWT_SECRET || iniConfig.tokens?.jwt || '',
    },
};
```

---

## 마이그레이션 가이드

### process.env 사용처 찾기

```bash
grep -r "process.env" blog-api/src/ --include="*.ts" | wc -l
```

### 마이그레이션 예시

**이전:**
```typescript
// Scattered throughout code
const timeout = parseInt(process.env.OPENID_HTTP_TIMEOUT_MS || '15000');
const keycloakUrl = process.env.KEYCLOAK_BASE_URL;
const jwtSecret = process.env.JWT_SECRET;
```

**이후:**
```typescript
import { config } from './config/unifiedConfig';

const timeout = config.keycloak.timeout;
const keycloakUrl = config.keycloak.baseUrl;
const jwtSecret = config.tokens.jwt;
```

**장점:**
- 타입 안전
- 중앙화
- 테스트 용이
- 시작 시점 검증

---

**관련 파일:**
- [SKILL.md](SKILL.md)
- [testing-guide.md](testing-guide.md)
