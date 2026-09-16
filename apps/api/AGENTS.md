# @social/api — App Agent Doc

## 역할

NestJS 12 **ESM + Vitest** API. ddd-hexagonal + `@nestjs/cqrs` 수직 슬라이스 구조이며, 지금은 비도메인
`health` 슬라이스(`GET /health` → DB `select 1` ping) 하나만 있다. 이 슬라이스가 이후 바운디드 컨텍스트가
복제할 템플릿이다. 도메인 이름을 가정한 코드·테이블을 만들지 마라. 런타임은 Node 24, bun은 패키지
매니저 전용이다.

## 구조

```
apps/api/
├── package.json            # type:module · imports #shared/* · #health/* → ./dist/…
├── tsconfig.json           # extends @social/typescript-config/base.json · nodenext · paths #shared/* · #health/* → ./src/…
├── tsconfig.build.json     # rootDir src → dist, spec/test 제외
├── vitest.config.ts / vitest.config.e2e.ts   # vite-tsconfig-paths로 별칭 해석
├── drizzle.config.ts       # 설정만 — generate/migrate는 이번 phase 범위 밖
├── .env.example            # DATABASE_URL, PORT (.env는 커밋 금지)
├── scripts/ensure-db.sh    # docker exec postgres psql — social_media DB 멱등 생성
├── src/
│   ├── main.ts             # bootstrap 전용: ValidationPipe, enableShutdownHooks, listen
│   ├── app.module.ts       # 전역 1회 등록(ConfigModule·CqrsModule.forRoot·DrizzleModule) + 슬라이스 조립
│   ├── shared/
│   │   ├── domain/                                  # 자리 표시
│   │   └── infrastructure/
│   │       ├── config/env.schema.ts                 # EnvSchema · Env · validateEnv (zod)
│   │       ├── database/drizzle/drizzle.module.ts   # @Global DrizzleModule · DRIZZLE 토큰 · DrizzleService(풀 종료)
│   │       ├── database/drizzle/schema/index.ts     # 영속성 스키마 집결점(현재 테이블 0)
│   │       └── filters/                             # 전역 예외 필터 자리
│   └── health/
│       ├── application/ports/database-ping.port.ts        # DATABASE_PING + DatabasePingPort
│       ├── application/queries/get-health.query.ts        # GetHealthQuery extends Query<HealthReport>
│       ├── application/queries/handlers/                  # GetHealthHandler (+ spec) · index.ts = QueryHandlers 배열
│       ├── infrastructure/adapters/drizzle-database-ping.adapter.ts
│       ├── presentation/dtos/health-response.dto.ts       # implements @social/schemas HealthResponse/HealthCheck
│       ├── presentation/health.controller.ts              # QueryBus 디스패치만, degraded → 503
│       └── health.module.ts                               # 포트 바인딩 + 핸들러 스프레드 + 컨트롤러
└── test/health.e2e-spec.ts # 실 DB e2e (+ DATABASE_PING override로 503 경로)
```

레이어 규칙(요약 — 상세는 [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md),
[docs/conventions/nestjs.md](../../docs/conventions/nestjs.md)):

- **application**: 포트(Symbol 토큰 + `Port` 인터페이스, 데코레이터 0)와 query/handler. 핸들러만
  `@QueryHandler`/`@Inject` 허용. `HttpException`·HTTP 데코레이터·드라이버 타입 금지.
- **infrastructure**: 포트 구현 어댑터. 실패는 throw하지 말고 포트가 정의한 결과 타입으로 반환한다.
- **presentation**: 컨트롤러는 `QueryBus.execute`만 하고 포트·핸들러를 직접 주입하지 않는다. 응답은 DTO의
  `static fromReport(...)`로 매핑한다. 상태 코드 매핑(503)은 이 층의 몫이다.
- **모듈**: `{slice}.module.ts`가 `{ provide: TOKEN, useClass: Adapter }` + `...QueryHandlers`를 결선한다.
  `CqrsModule.forRoot()`·`ConfigModule.forRoot()`·`DrizzleModule`은 `app.module.ts`에서만 등록한다.

## 새 슬라이스 추가 절차

1. `src/{domain}/`을 `src/health/` 모양으로 만든다(도메인이면 `domain/`까지 4레이어 + `{domain}.module.ts`).
2. `src/app.module.ts`의 `imports`에 `{Domain}Module`을 추가한다.
3. `#{domain}/*` 별칭을 **두 곳**에 추가한다: `tsconfig.json` `paths` → `./src/{domain}/*`,
   `package.json` `imports` → `./dist/{domain}/*`. 한쪽만 두면 typecheck는 통과하고 런타임이 깨진다.
4. 테이블이 생기면 `src/shared/infrastructure/database/drizzle/schema/{domain-복수형}.schema.ts`를 만들고
   `schema/index.ts`에서 re-export한다.

## 명령

```sh
bun run --filter @social/schemas build       # 선행 — @social/api는 dist를 소비한다
bun run --filter @social/api db:ensure       # docker postgres에 social_media DB 멱등 생성 (dev·e2e 전)
bun run --filter @social/api build           # nest build → dist/
bun run --filter @social/api dev             # nest start --watch
bun run --filter @social/api typecheck       # tsc --noEmit -p tsconfig.json (src + test + 설정 파일)
bun run --filter @social/api lint            # biome check .
bun run --filter @social/api test            # vitest 단위(소스 옆 *.spec.ts) + 이어서 e2e — 실 DB 필요
bun run --filter @social/api test:e2e        # vitest --config vitest.config.e2e.ts — test/*.e2e-spec.ts, 실 DB
node dist/main.js                            # 빌드 산출물 직접 기동 (cwd apps/api, .env 필요)
```

## 환경

- `.env.example`만 커밋한다. `.env`는 루트 `.gitignore`가 제외한다 — 로컬에서 `cp .env.example .env`.
- `DATABASE_URL`(`z.url()`)·`PORT`(기본 3000)는 `validateEnv`가 부팅 시 검증한다. 누락·형식 오류면
  `ZodError`로 즉시 종료(exit 1)한다. `ConfigModule.forRoot`는 `process.cwd()`의 `.env`를 읽으므로 명령은
  `apps/api`에서 실행한다(`bun run --filter`는 자동으로 그렇게 한다).
- 로컬 PostgreSQL 16은 docker 컨테이너 `postgres`(localhost:5432, postgres/postgres). 로컬 `psql`이 없어
  `scripts/ensure-db.sh`가 `docker exec postgres psql`로 접근한다.
- 코드에서 `process.env`를 직접 읽지 마라 — `ConfigService<Env, true>` 경유(예외: `drizzle.config.ts`).

## ESM 규칙

- 상대 import는 소스가 `.ts`여도 **`.js` 확장자**를 붙인다. 도메인 안에서는 상대경로, 컨텍스트 경계를
  넘을 때(`health` → `shared`)만 `#shared/...` 별칭.
- 데코레이터 시그니처에 등장하는 인터페이스·타입(`DatabasePingPort`, `PostgresJsDatabase`, `Env`,
  express `Response`)은 **`import type`** — `isolatedModules` + `emitDecoratorMetadata`에서 값 import는
  TS1272. 반대로 DI 토큰으로 쓰이는 클래스(`QueryBus`, `ConfigService`)는 값 import여야 한다.
- 별칭은 tsc(`paths`)·vitest(`vite-tsconfig-paths`)·Node 런타임(`package.json` `imports`) 세 곳에서 해석된다.
  `nest build`는 emit 시 별칭을 상대경로로 재작성하지만 plain `tsc`는 그대로 두므로 `imports`를 지우지 마라.
- 패키지 서브패스는 확장자까지 써야 한다(예: `supertest/types`는 ESM에서 해석 실패).

## 503 정책

`GET /health`는 항상 같은 body(`{ status, timestamp, checks[] }`)를 반환하고, 하나라도 `checks[].status`가
`fail`이면 `status: 'degraded'` + **HTTP 503**, 아니면 200이다. 어댑터는 DB 예외를 잡아 `{ ok: false, reason }`
로 반환하므로 DB가 죽어도 프로세스는 계속 동작한다. 503 매핑은 컨트롤러가 `@Res({ passthrough: true })`로
하며 `HttpException`을 던지지 않는다.

## 테스트

- 단위: 소스 옆 `*.spec.ts`, `Test.createTestingModule`로 포트를 `useValue` mock.
- e2e: `test/*.e2e-spec.ts`, 실 `AppModule` 부팅. `createNestApplication()`은 `main.ts`의 파이프를 모르므로
  같은 `ValidationPipe`를 다시 건다. `afterAll`에서 `app.close()` — `DrizzleService.onModuleDestroy`가
  postgres 풀을 `end()`해야 Vitest가 hang 없이 끝난다.
- 이 디렉터리에 `biome.json`을 두지 마라 — 루트 `biome.json`이 전체를 검사한다(`apps/api/**`는
  `useImportType` off).
