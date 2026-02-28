# 데이터베이스 패턴 - Prisma & NestJS 모범 사례

NestJS 환경에서 Prisma 기반 데이터베이스 접근 패턴의 완전한 가이드입니다.

## 목차

- [PrismaService 의존성 주입](#prismaservice-di)
- [리포지토리 패턴](#repository-pattern)
- [트랜잭션 패턴](#transaction-patterns)
- [쿼리 최적화](#query-optimization)
- [N+1 쿼리 방지](#n1-query-prevention)
- [에러 처리 (PrismaExceptionFilter)](#error-handling)

---

## PrismaService 의존성 주입

### 기본 패턴

NestJS에서는 정적(Static) 전역 접근을 사용하지 않고 생성자 파라미터로 주입받아 모의 객체 주입(Mocking) 이점을 활용합니다.

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}

// 서비스에서 사용하기
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany(); // this.prisma 로 접근
  }
}
```

### 생명주기 관리

모듈 종료 시 연결을 정상 해제해야 합니다. (app.close 시 트리거 가능)
```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

---

## 리포지토리 패턴

### 리포지토리를 사용하는 이유

✅ **다음일 때 리포지토리 사용:**
- Complex queries with joins/includes
- Query used in multiple places
- Need caching layer
- Want to mock for testing

❌ **다음일 때는 리포지토리 생략 가능:**
- Simple one-off queries
- Prototyping (can refactor later)

### 리포지토리 템플릿

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UserRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
            include: { profile: true },
        });
    }

    async findActive(): Promise<User[]> {
        return this.prisma.user.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async create(data: Prisma.UserCreateInput): Promise<User> {
        return this.prisma.user.create({ data });
    }
}
```

---

## 트랜잭션 패턴

### 단순 트랜잭션

```typescript
// users.service.ts
async createUserWithProfile(userData: UserData, profileData: ProfileData) {
  return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: userData });
      const profile = await tx.userProfile.create({ data: { userId: user.id, ...profileData } });
      return { user, profile };
  });
}
```

### 인터랙티브 트랜잭션

의존성 주입된 인스턴스를 활용합니다.

```typescript
const result = await this.prisma.$transaction(
    async (tx) => {
        const user = await tx.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        return await tx.user.update({
            where: { id },
            data: { lastLogin: new Date() },
        });
    },
    {
        maxWait: 5000,
        timeout: 10000,
    }
);
```

---

## 쿼리 최적화

### select로 필드 제한

```typescript
// ❌ Fetches all fields
const users = await this.prisma.user.findMany();

// ✅ Only fetch needed fields
const users = await this.prisma.user.findMany({
    select: {
        id: true,
        email: true,
        profile: { select: { firstName: true, lastName: true } },
    },
});
```

### include는 신중하게 사용

```typescript
// ❌ Excessive includes
const user = await this.prisma.user.findUnique({
    where: { id },
    include: {
        profile: true,
        posts: { include: { comments: true } },
        workflows: { include: { steps: { include: { actions: true } } } },
    },
});

// ✅ Only include what you need
const user = await this.prisma.user.findUnique({
    where: { id },
    include: { profile: true },
});
```

---

## N+1 쿼리 방지

### 문제: N+1 쿼리

```typescript
// ❌ N+1 Query Problem
const users = await this.prisma.user.findMany(); // 1 query

for (const user of users) {
    // N queries (one per user)
    const profile = await this.prisma.userProfile.findUnique({
        where: { userId: user.id },
    });
}
```

### 해결: include 또는 배치 처리(Batching)

```typescript
// ✅ Single query with include
const users = await this.prisma.user.findMany({
    include: { profile: true },
});

// ✅ Or batch query
const userIds = users.map(u => u.id);
const profiles = await this.prisma.userProfile.findMany({
    where: { userId: { in: userIds } },
});
```

---

## 에러 처리

NestJS에선 서비스 안에서 직접 try-catch하지 않고 Filter를 이용하는 것을 권장합니다.

### PrismaClient 에러 핸들링 (Exception Filter 방식 활용)

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    // Unique constraint violation
    if (exception.code === 'P2002') {
      const status = 409;
      response.status(status).json({
        statusCode: status,
        message: 'Conflict: Unique constraint failed',
      });
      return;
    }

    // Record not found
    if (exception.code === 'P2025') {
       const status = 404;
       response.status(status).json({
         statusCode: status,
         message: 'Record not found',
       });
       return;
    }

    // Fallback
    response.status(500).json({ statusCode: 500, message: 'Internal Server Error' });
  }
}
```

---

**관련 파일:**
- [SKILL.md](SKILL.md)
- [services-and-repositories.md](services-and-repositories.md)
- [async-and-errors.md](async-and-errors.md)
