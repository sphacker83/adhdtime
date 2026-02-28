# 비동기 패턴과 에러 처리

async/await 패턴과 커스텀 에러 처리를 위한 완전한 가이드입니다.

## 목차

- [Async/Await 모범 사례](#asyncawait-best-practices)
- [Promise 에러 처리](#promise-error-handling)
- [커스텀 에러 타입](#custom-error-types)
- [asyncErrorWrapper 유틸리티](#asyncerrorwrapper-utility)
- [에러 전파](#error-propagation)
- [흔한 비동기 함정](#common-async-pitfalls)

---

## Async/Await 모범 사례

### 항상 try-catch 사용

```typescript
// ❌ NEVER: Unhandled async errors
async function fetchData() {
    const data = await database.query(); // If throws, unhandled!
    return data;
}

// ✅ ALWAYS: Wrap in try-catch
async function fetchData() {
    try {
        const data = await database.query();
        return data;
    } catch (error) {
        Sentry.captureException(error);
        throw error;
    }
}
```

### .then() 체인 피하기

```typescript
// ❌ AVOID: Promise chains
function processData() {
    return fetchData()
        .then(data => transform(data))
        .then(transformed => save(transformed))
        .catch(error => {
            console.error(error);
        });
}

// ✅ PREFER: Async/await
async function processData() {
    try {
        const data = await fetchData();
        const transformed = await transform(data);
        return await save(transformed);
    } catch (error) {
        Sentry.captureException(error);
        throw error;
    }
}
```

---

## Promise 에러 처리

### 병렬 작업

```typescript
// ✅ Handle errors in Promise.all
try {
    const [users, profiles, settings] = await Promise.all([
        userService.getAll(),
        profileService.getAll(),
        settingsService.getAll(),
    ]);
} catch (error) {
    // One failure fails all
    Sentry.captureException(error);
    throw error;
}

// ✅ Handle errors individually with Promise.allSettled
const results = await Promise.allSettled([
    userService.getAll(),
    profileService.getAll(),
    settingsService.getAll(),
]);

results.forEach((result, index) => {
    if (result.status === 'rejected') {
        Sentry.captureException(result.reason, {
            tags: { operation: ['users', 'profiles', 'settings'][index] }
        });
    }
});
```

---

## 커스텀 에러 타입

### 커스텀 에러 정의

```typescript
// Base error class
export class AppError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number,
        public isOperational: boolean = true
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Specific error types
export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 'VALIDATION_ERROR', 400);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string) {
        super(message, 'NOT_FOUND', 404);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string) {
        super(message, 'FORBIDDEN', 403);
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 'CONFLICT', 409);
    }
}
```

### 사용법

```typescript
// Throw specific errors
if (!user) {
    throw new NotFoundError('User not found');
}

if (user.age < 18) {
    throw new ValidationError('User must be 18+');
}

// Error boundary handles them
function errorBoundary(error, req, res, next) {
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            error: {
                message: error.message,
                code: error.code
            }
        });
    }

    // Unknown error
    Sentry.captureException(error);
    res.status(500).json({ error: { message: 'Internal server error' } });
}
```

---

## asyncErrorWrapper 유틸리티

### 패턴

```typescript
export function asyncErrorWrapper(
    handler: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await handler(req, res, next);
        } catch (error) {
            next(error);
        }
    };
}
```

### 사용법

```typescript
// Without wrapper - error can be unhandled
router.get('/users', async (req, res) => {
    const users = await userService.getAll(); // If throws, unhandled!
    res.json(users);
});

// With wrapper - errors caught
router.get('/users', asyncErrorWrapper(async (req, res) => {
    const users = await userService.getAll();
    res.json(users);
}));
```

---

## 에러 전파

### 올바른 에러 체인

```typescript
// ✅ Propagate errors up the stack
async function repositoryMethod() {
    try {
        return await PrismaService.main.user.findMany();
    } catch (error) {
        Sentry.captureException(error, { tags: { layer: 'repository' } });
        throw error; // Propagate to service
    }
}

async function serviceMethod() {
    try {
        return await repositoryMethod();
    } catch (error) {
        Sentry.captureException(error, { tags: { layer: 'service' } });
        throw error; // Propagate to controller
    }
}

async function controllerMethod(req, res) {
    try {
        const result = await serviceMethod();
        res.json(result);
    } catch (error) {
        this.handleError(error, res, 'controllerMethod'); // Final handler
    }
}
```

---

## 흔한 비동기 함정

### Fire and Forget(나쁨)

```typescript
// ❌ NEVER: Fire and forget
async function processRequest(req, res) {
    sendEmail(user.email); // Fires async, errors unhandled!
    res.json({ success: true });
}

// ✅ ALWAYS: Await or handle
async function processRequest(req, res) {
    try {
        await sendEmail(user.email);
        res.json({ success: true });
    } catch (error) {
        Sentry.captureException(error);
        res.status(500).json({ error: 'Failed to send email' });
    }
}

// ✅ OR: Intentional background task
async function processRequest(req, res) {
    sendEmail(user.email).catch(error => {
        Sentry.captureException(error);
    });
    res.json({ success: true });
}
```

### 처리되지 않은 Rejection

```typescript
// ✅ Global handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    Sentry.captureException(reason, {
        tags: { type: 'unhandled_rejection' }
    });
    console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    Sentry.captureException(error, {
        tags: { type: 'uncaught_exception' }
    });
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
```

---

**관련 파일:**
- [SKILL.md](SKILL.md)
- [sentry-and-monitoring.md](sentry-and-monitoring.md)
- [complete-examples.md](complete-examples.md)
