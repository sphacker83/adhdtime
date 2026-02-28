# 검증(Validation) 패턴 - Zod로 입력 검증

타입 안전한 검증을 위해 Zod 스키마를 사용하여 입력을 검증하는 완전한 가이드입니다.

## 목차

- [왜 Zod인가?](#why-zod)
- [기본 Zod 패턴](#basic-zod-patterns)
- [코드베이스의 스키마 예시](#schema-examples-from-codebase)
- [라우트 레벨 검증](#route-level-validation)
- [컨트롤러 검증](#controller-validation)
- [DTO 패턴](#dto-pattern)
- [에러 처리](#error-handling)
- [고급 패턴](#advanced-patterns)

---

## 왜 Zod인가?

### Joi/기타 라이브러리 대비 장점

**타입 안정성(Type Safety):**
- ✅ 완전한 TypeScript 타입 추론
- ✅ 런타임 + 컴파일 타임 검증
- ✅ 자동 타입 생성

**개발자 경험(Developer Experience):**
- ✅ 직관적인 API
- ✅ 조합 가능한(Composable) 스키마
- ✅ 훌륭한 에러 메시지

**성능(Performance):**
- ✅ 빠른 검증
- ✅ 작은 번들 크기
- ✅ 트리 셰이킹(tree-shaking) 가능

### Joi에서 마이그레이션

현대적인 검증은 Joi 대신 Zod를 사용합니다:

```typescript
// ❌ OLD - Joi (being phased out)
const schema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(3).required(),
});

// ✅ NEW - Zod (preferred)
const schema = z.object({
    email: z.string().email(),
    name: z.string().min(3),
});
```

---

## 기본 Zod 패턴

### 기본 타입(Primitive Types)

```typescript
import { z } from 'zod';

// Strings
const nameSchema = z.string();
const emailSchema = z.string().email();
const urlSchema = z.string().url();
const uuidSchema = z.string().uuid();
const minLengthSchema = z.string().min(3);
const maxLengthSchema = z.string().max(100);

// Numbers
const ageSchema = z.number().int().positive();
const priceSchema = z.number().positive();
const rangeSchema = z.number().min(0).max(100);

// Booleans
const activeSchema = z.boolean();

// Dates
const dateSchema = z.string().datetime(); // ISO 8601 string
const nativeDateSchema = z.date(); // Native Date object

// Enums
const roleSchema = z.enum(['admin', 'operations', 'user']);
const statusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
```

### 객체(Objects)

```typescript
// Simple object
const userSchema = z.object({
    email: z.string().email(),
    name: z.string(),
    age: z.number().int().positive(),
});

// Nested objects
const addressSchema = z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string().regex(/^\d{5}$/),
});

const userWithAddressSchema = z.object({
    name: z.string(),
    address: addressSchema,
});

// Optional fields
const userSchema = z.object({
    name: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
});

// Nullable fields
const userSchema = z.object({
    name: z.string(),
    middleName: z.string().nullable(),
});
```

### 배열(Arrays)

```typescript
// Array of primitives
const rolesSchema = z.array(z.string());
const numbersSchema = z.array(z.number());

// Array of objects
const usersSchema = z.array(
    z.object({
        id: z.string(),
        name: z.string(),
    })
);

// Array with constraints
const tagsSchema = z.array(z.string()).min(1).max(10);
const nonEmptyArray = z.array(z.string()).nonempty();
```

---

## 코드베이스의 스키마 예시

### 폼 검증 스키마

**File:** `/form/src/helpers/zodSchemas.ts`

```typescript
import { z } from 'zod';

// Question types enum
export const questionTypeSchema = z.enum([
    'input',
    'textbox',
    'editor',
    'dropdown',
    'autocomplete',
    'checkbox',
    'radio',
    'upload',
]);

// Upload types
export const uploadTypeSchema = z.array(
    z.enum(['pdf', 'image', 'excel', 'video', 'powerpoint', 'word']).nullable()
);

// Input types
export const inputTypeSchema = z
    .enum(['date', 'number', 'input', 'currency'])
    .nullable();

// Question option
export const questionOptionSchema = z.object({
    id: z.number().int().positive().optional(),
    controlTag: z.string().max(150).nullable().optional(),
    label: z.string().max(100).nullable().optional(),
    order: z.number().int().min(0).default(0),
});

// Question schema
export const questionSchema = z.object({
    id: z.number().int().positive().optional(),
    formID: z.number().int().positive(),
    sectionID: z.number().int().positive().optional(),
    options: z.array(questionOptionSchema).optional(),
    label: z.string().max(500),
    description: z.string().max(5000).optional(),
    type: questionTypeSchema,
    uploadTypes: uploadTypeSchema.optional(),
    inputType: inputTypeSchema.optional(),
    tags: z.array(z.string().max(150)).optional(),
    required: z.boolean(),
    isStandard: z.boolean().optional(),
    deprecatedKey: z.string().nullable().optional(),
    maxLength: z.number().int().positive().nullable().optional(),
    isOptionsSorted: z.boolean().optional(),
});

// Form section schema
export const formSectionSchema = z.object({
    id: z.number().int().positive(),
    formID: z.number().int().positive(),
    questions: z.array(questionSchema).optional(),
    label: z.string().max(500),
    description: z.string().max(5000).optional(),
    isStandard: z.boolean(),
});

// Create form schema
export const createFormSchema = z.object({
    id: z.number().int().positive(),
    label: z.string().max(150),
    description: z.string().max(6000).nullable().optional(),
    isPhase: z.boolean().optional(),
    username: z.string(),
});

// Update order schema
export const updateOrderSchema = z.object({
    source: z.object({
        index: z.number().int().min(0),
        sectionID: z.number().int().min(0),
    }),
    destination: z.object({
        index: z.number().int().min(0),
        sectionID: z.number().int().min(0),
    }),
});

// Controller-specific validation schemas
export const createQuestionValidationSchema = z.object({
    formID: z.number().int().positive(),
    sectionID: z.number().int().positive(),
    question: questionSchema,
    index: z.number().int().min(0).nullable().optional(),
    username: z.string(),
});

export const updateQuestionValidationSchema = z.object({
    questionID: z.number().int().positive(),
    username: z.string(),
    question: questionSchema,
});
```

### 프록시 관계 스키마

```typescript
// Proxy relationship validation
const createProxySchema = z.object({
    originalUserID: z.string().min(1),
    proxyUserID: z.string().min(1),
    startsAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
});

// With custom validation
const createProxySchemaWithValidation = createProxySchema.refine(
    (data) => new Date(data.expiresAt) > new Date(data.startsAt),
    {
        message: 'expiresAt must be after startsAt',
        path: ['expiresAt'],
    }
);
```

### 워크플로 검증

```typescript
// Workflow start schema
const startWorkflowSchema = z.object({
    workflowCode: z.string().min(1),
    entityType: z.enum(['Post', 'User', 'Comment']),
    entityID: z.number().int().positive(),
    dryRun: z.boolean().optional().default(false),
});

// Workflow step completion schema
const completeStepSchema = z.object({
    stepInstanceID: z.number().int().positive(),
    answers: z.record(z.string(), z.any()),
    dryRun: z.boolean().optional().default(false),
});
```

---

## 라우트 레벨 검증

### 패턴 1: 인라인 검증

```typescript
// routes/proxyRoutes.ts
import { z } from 'zod';

const createProxySchema = z.object({
    originalUserID: z.string().min(1),
    proxyUserID: z.string().min(1),
    startsAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
});

router.post(
    '/',
    SSOMiddlewareClient.verifyLoginStatus,
    async (req, res) => {
        try {
            // Validate at route level
            const validated = createProxySchema.parse(req.body);

            // Delegate to service
            const proxy = await proxyService.createProxyRelationship(validated);

            res.status(201).json({ success: true, data: proxy });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Validation failed',
                        details: error.errors,
                    },
                });
            }
            handler.handleException(res, error);
        }
    }
);
```

**장점:**
- 빠르고 단순함
- 단순한 라우트에 적합

**단점:**
- 라우트에 검증 로직이 들어감
- 테스트가 더 어려움
- 재사용 불가

---

## 컨트롤러 검증

### 패턴 2: 컨트롤러 검증(권장)

```typescript
// validators/userSchemas.ts
import { z } from 'zod';

export const createUserSchema = z.object({
    email: z.string().email(),
    name: z.string().min(2).max(100),
    roles: z.array(z.enum(['admin', 'operations', 'user'])),
    isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
    email: z.string().email().optional(),
    name: z.string().min(2).max(100).optional(),
    roles: z.array(z.enum(['admin', 'operations', 'user'])).optional(),
    isActive: z.boolean().optional(),
});

export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
```

```typescript
// controllers/UserController.ts
import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { UserService } from '../services/userService';
import { createUserSchema, updateUserSchema } from '../validators/userSchemas';
import { z } from 'zod';

export class UserController extends BaseController {
    private userService: UserService;

    constructor() {
        super();
        this.userService = new UserService();
    }

    async createUser(req: Request, res: Response): Promise<void> {
        try {
            // Validate input
            const validated = createUserSchema.parse(req.body);

            // Call service
            const user = await this.userService.createUser(validated);

            this.handleSuccess(res, user, 'User created successfully', 201);
        } catch (error) {
            if (error instanceof z.ZodError) {
                // Handle validation errors with 400 status
                return this.handleError(error, res, 'createUser', 400);
            }
            this.handleError(error, res, 'createUser');
        }
    }

    async updateUser(req: Request, res: Response): Promise<void> {
        try {
            // Validate params and body
            const userId = req.params.id;
            const validated = updateUserSchema.parse(req.body);

            const user = await this.userService.updateUser(userId, validated);

            this.handleSuccess(res, user, 'User updated successfully');
        } catch (error) {
            if (error instanceof z.ZodError) {
                return this.handleError(error, res, 'updateUser', 400);
            }
            this.handleError(error, res, 'updateUser');
        }
    }
}
```

**장점:**
- 깔끔한 분리
- 재사용 가능한 스키마
- 테스트 용이
- 타입 안전한 DTO

**단점:**
- 관리해야 할 파일이 늘어남

---

## DTO 패턴

### 스키마에서 타입 추론

```typescript
import { z } from 'zod';

// Define schema
const createUserSchema = z.object({
    email: z.string().email(),
    name: z.string(),
    age: z.number().int().positive(),
});

// Infer TypeScript type from schema
type CreateUserDTO = z.infer<typeof createUserSchema>;

// Equivalent to:
// type CreateUserDTO = {
//     email: string;
//     name: string;
//     age: number;
// }

// Use in service
class UserService {
    async createUser(data: CreateUserDTO): Promise<User> {
        // data is fully typed!
        console.log(data.email); // ✅ TypeScript knows this exists
        console.log(data.invalid); // ❌ TypeScript error!
    }
}
```

### 입력 타입 vs 출력 타입

```typescript
// Input schema (what API receives)
const createUserInputSchema = z.object({
    email: z.string().email(),
    name: z.string(),
    password: z.string().min(8),
});

// Output schema (what API returns)
const userOutputSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    createdAt: z.string().datetime(),
    // password excluded!
});

type CreateUserInput = z.infer<typeof createUserInputSchema>;
type UserOutput = z.infer<typeof userOutputSchema>;
```

---

## 에러 처리

### Zod 에러 포맷

```typescript
try {
    const validated = schema.parse(data);
} catch (error) {
    if (error instanceof z.ZodError) {
        console.log(error.errors);
        // [
        //   {
        //     code: 'invalid_type',
        //     expected: 'string',
        //     received: 'number',
        //     path: ['email'],
        //     message: 'Expected string, received number'
        //   }
        // ]
    }
}
```

### 커스텀 에러 메시지

```typescript
const userSchema = z.object({
    email: z.string().email({ message: 'Please provide a valid email address' }),
    name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
    age: z.number().int().positive({ message: 'Age must be a positive number' }),
});
```

### 포맷된 에러 응답

```typescript
// Helper function to format Zod errors
function formatZodError(error: z.ZodError) {
    return {
        message: 'Validation failed',
        errors: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
        })),
    };
}

// In controller
catch (error) {
    if (error instanceof z.ZodError) {
        return res.status(400).json({
            success: false,
            error: formatZodError(error),
        });
    }
}

// Response example:
// {
//   "success": false,
//   "error": {
//     "message": "Validation failed",
//     "errors": [
//       {
//         "field": "email",
//         "message": "Invalid email",
//         "code": "invalid_string"
//       }
//     ]
//   }
// }
```

---

## 고급 패턴

### 조건부 검증

```typescript
// Validate based on other field values
const submissionSchema = z.object({
    type: z.enum(['NEW', 'UPDATE']),
    postId: z.number().optional(),
}).refine(
    (data) => {
        // If type is UPDATE, postId is required
        if (data.type === 'UPDATE') {
            return data.postId !== undefined;
        }
        return true;
    },
    {
        message: 'postId is required when type is UPDATE',
        path: ['postId'],
    }
);
```

### 데이터 변환(Transform)

```typescript
// Transform strings to numbers
const userSchema = z.object({
    name: z.string(),
    age: z.string().transform((val) => parseInt(val, 10)),
});

// Transform dates
const eventSchema = z.object({
    name: z.string(),
    date: z.string().transform((str) => new Date(str)),
});
```

### 데이터 전처리(Preprocess)

```typescript
// Trim strings before validation
const userSchema = z.object({
    email: z.preprocess(
        (val) => typeof val === 'string' ? val.trim().toLowerCase() : val,
        z.string().email()
    ),
    name: z.preprocess(
        (val) => typeof val === 'string' ? val.trim() : val,
        z.string().min(2)
    ),
});
```

### 유니온 타입(Union Types)

```typescript
// Multiple possible types
const idSchema = z.union([z.string(), z.number()]);

// Discriminated unions
const notificationSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('email'),
        recipient: z.string().email(),
        subject: z.string(),
    }),
    z.object({
        type: z.literal('sms'),
        phoneNumber: z.string(),
        message: z.string(),
    }),
]);
```

### 재귀 스키마(Recursive Schemas)

```typescript
// For nested structures like trees
type Category = {
    id: number;
    name: string;
    children?: Category[];
};

const categorySchema: z.ZodType<Category> = z.lazy(() =>
    z.object({
        id: z.number(),
        name: z.string(),
        children: z.array(categorySchema).optional(),
    })
);
```

### 스키마 합성(Composition)

```typescript
// Base schemas
const timestampsSchema = z.object({
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

const auditSchema = z.object({
    createdBy: z.string(),
    updatedBy: z.string(),
});

// Compose schemas
const userSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
}).merge(timestampsSchema).merge(auditSchema);

// Extend schemas
const adminUserSchema = userSchema.extend({
    adminLevel: z.number().int().min(1).max(5),
    permissions: z.array(z.string()),
});

// Pick specific fields
const publicUserSchema = userSchema.pick({
    id: true,
    name: true,
    // email excluded
});

// Omit fields
const userWithoutTimestamps = userSchema.omit({
    createdAt: true,
    updatedAt: true,
});
```

### 검증 미들웨어

```typescript
// Create reusable validation middleware
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function validateBody<T extends z.ZodType>(schema: T) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Validation failed',
                        details: error.errors,
                    },
                });
            }
            next(error);
        }
    };
}

// Usage
router.post('/users',
    validateBody(createUserSchema),
    async (req, res) => {
        // req.body is validated and typed!
        const user = await userService.createUser(req.body);
        res.json({ success: true, data: user });
    }
);
```

---

**관련 파일:**
- [SKILL.md](SKILL.md) - 메인 가이드
- [routing-and-controllers.md](routing-and-controllers.md) - 컨트롤러에서 검증 사용
- [services-and-repositories.md](services-and-repositories.md) - 서비스에서 DTO 사용
- [async-and-errors.md](async-and-errors.md) - 에러 처리 패턴
