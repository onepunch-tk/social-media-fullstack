# Step 2: api-app

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- [docs/PRD.md](/docs/PRD.md)
- [docs/ARCHITECTURE.md](/docs/ARCHITECTURE.md)
- [docs/adr/ADR-003.md](/docs/adr/ADR-003.md)
- [docs/adr/ADR-004.md](/docs/adr/ADR-004.md)
- [docs/adr/ADR-005.md](/docs/adr/ADR-005.md)
- [docs/adr/ADR-006.md](/docs/adr/ADR-006.md)
- [docs/adr/ADR-011.md](/docs/adr/ADR-011.md)
- [packages/schemas/src/health.schema.ts](/packages/schemas/src/health.schema.ts)
- [packages/schemas/package.json](/packages/schemas/package.json)
- [turbo.json](/turbo.json)
- [biome.json](/biome.json)
- [AGENTS.md](/AGENTS.md)
- [docs/conventions/nestjs.md](/docs/conventions/nestjs.md)
- [docs/conventions/typescript.md](/docs/conventions/typescript.md)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`apps/api`에 NestJS 12 **ESM + Vitest** 앱 `@social/api`를 만들고 ddd-hexagonal 구조로 `health` 수직 슬라이스(`GET /health`, DB ping)를 구현한다. 먼저 step1이 만든 `packages/schemas/src/health.schema.ts`와 루트 `turbo.json`·`biome.json`·`AGENTS.md`를 읽어라. 런타임은 Node 24(bun은 패키지 매니저 전용). 로컬 PostgreSQL 16은 docker 컨테이너 `postgres`(localhost:5432, user `postgres`, password `postgres`, 로컬 `psql` 없음 → `docker exec postgres psql ...`로 접근).

## 1. 앱 생성
루트에서 `bunx --package @nestjs/cli@12 nest new api --directory apps/api --package-manager bun --skip-git --skip-install --no-observe --strict`. 비대화(non-TTY) 세션에서는 ESM + Vitest 템플릿(`"type": "module"`, `vitest.config.ts`, `vitest.config.e2e.ts`, `vite-tsconfig-paths`, `.js` 확장자 import, tsconfig `types: ["vitest/globals", "node"]`)이 생성된다 — 그것이 의도한 결과다. 만약 CJS+Jest(`jest` devDependency, `test/jest-e2e.json`)가 생성되면 ESM 템플릿으로 다시 만든다. CLI가 Node engines(^24.15) 때문에 실패하면 템플릿 파일(package.json/tsconfig.json/tsconfig.build.json/nest-cli.json/vitest.config.ts/vitest.config.e2e.ts/src/main.ts/src/app.module.ts/test/app.e2e-spec.ts)을 위 사양대로 손으로 재현한다.
생성 후 정리: `name`을 `@social/api`로, `oxlint`/`oxlint-tsgolint`/`prettier`/`@nestjs/mau` devDependency와 `.oxlintrc.json`/`.prettierrc`/`README.md`/`deploy` 스크립트 제거, 스크립트 `lint: "biome check ."`, `typecheck: "tsc --noEmit -p tsconfig.json"`, `dev: "nest start --watch"` 추가, `format` 제거. `app.controller.ts`/`app.service.ts`와 그 spec은 삭제(health 슬라이스로 대체). `tsconfig.json`은 템플릿 값을 유지하되 `extends: "@social/typescript-config/base.json"`을 추가하고 `paths: {"#shared/*": ["./src/shared/*"], "#health/*": ["./src/health/*"]}`를 둔다(`baseUrl` 금지). `package.json`에 `imports: {"#shared/*": "./dist/shared/*", "#health/*": "./dist/health/*"}`를 두어 `node dist/...` 런타임에서도 별칭이 해석되게 한다. 도메인 안에서는 상대경로(`.js` 확장자), 컨텍스트 경계(`health` → `shared`)를 넘을 때만 `#shared/...` 별칭을 쓴다.
의존성: `@nestjs/cqrs ^12`, `@nestjs/config ^12`, `drizzle-orm ~0.45.2`, `postgres ^3.4.9`, `class-validator ^0.15.1`, `class-transformer ^0.5.1`(ValidationPipe가 둘 다 동적 import — 하나라도 없으면 부팅 시 `process.exit(1)`), `zod ^4.6.5`, `@social/schemas: workspace:*`; dev: `drizzle-kit ~0.31.10`, `typescript ~6.0.3`, `@social/typescript-config: workspace:*`, `@types/node ^24`.

## 2. 구조 (ARCHITECTURE.md 기준)
- `src/shared/domain/` — 이번 step은 비워도 됨(`.gitkeep` 대신 짧은 `README.md` 한 줄로 자리 표시).
- `src/shared/infrastructure/config/env.schema.ts`: `import * as z from 'zod'`; `export const EnvSchema = z.object({ DATABASE_URL: z.url(), PORT: z.coerce.number().int().positive().default(3000) })`; `export type Env = z.infer<typeof EnvSchema>`; `export function validateEnv(config: Record<string, unknown>): Env` — `EnvSchema.parse(config)`(실패 시 throw → 부팅 중단).
- `src/shared/infrastructure/database/drizzle/schema/index.ts`: `export {}` placeholder(테이블 0; drizzle-kit `schema` 경로용). `drizzle.config.ts`(apps/api 루트): `defineConfig({ dialect: 'postgresql', schema: './src/shared/infrastructure/database/drizzle/schema/index.ts', out: './drizzle', dbCredentials: { url: process.env.DATABASE_URL ?? '' } })` — drizzle-kit 명령은 이번 phase AC에 넣지 않는다.
- `src/shared/infrastructure/database/drizzle/drizzle.module.ts`: `@Global() @Module` `DrizzleModule`. 토큰 `export const DRIZZLE = Symbol('DRIZZLE')`; `DrizzleService`(`@Injectable`, `OnModuleDestroy`)가 `postgres(databaseUrl, { max: 5 })` 클라이언트와 `drizzle(client)` 인스턴스를 생성자에서 만들고 `get db()`로 노출, `onModuleDestroy(): Promise<void>`에서 `await this.client.end({ timeout: 5 })`(안 닫으면 e2e 후 프로세스 hang). `DRIZZLE` provider는 `useFactory: (svc: DrizzleService) => svc.db`. `exports: [DRIZZLE, DrizzleService]`. `DATABASE_URL`은 `ConfigService<Env, true>`에서 읽는다.
- `src/shared/infrastructure/filters/` — 이번 step은 자리만(README 한 줄).
- `src/health/application/ports/database-ping.port.ts`: `export const DATABASE_PING = Symbol('DATABASE_PING')`; `export interface DatabasePingPort { ping(): Promise<{ ok: true; latencyMs: number } | { ok: false; latencyMs: number; reason: string }> }`.
- `src/health/application/queries/get-health.query.ts`: `export class GetHealthQuery extends Query<HealthReport> {}` — `HealthReport` 타입은 `{ status: 'ok' | 'degraded'; timestamp: string; checks: ReadonlyArray<{ name: string; status: 'ok' | 'fail'; latencyMs: number }> }`(`@social/schemas`의 `HealthResponse` 타입을 그대로 재사용해도 됨).
- `src/health/application/queries/handlers/get-health.handler.ts`: `@QueryHandler(GetHealthQuery) export class GetHealthHandler implements IQueryHandler<GetHealthQuery>`; 생성자 `@Inject(DATABASE_PING) private readonly databasePing: DatabasePingPort`(인터페이스는 `import type` — isolatedModules+emitDecoratorMetadata에서 TS1272 방지); `execute()`가 ping 결과를 `checks: [{ name: 'database', status, latencyMs }]`로 매핑, 하나라도 fail이면 `status: 'degraded'`, `timestamp: new Date().toISOString()`. `queries/handlers/index.ts`는 `export const QueryHandlers = [GetHealthHandler]` 배열 상수.
- `src/health/infrastructure/adapters/drizzle-database-ping.adapter.ts`: `@Injectable() export class DrizzleDatabasePingAdapter implements DatabasePingPort` — `@Inject(DRIZZLE) db`로 `await this.db.execute(sql\`select 1\`)`를 `performance.now()`로 감싸 latency 측정, 예외는 잡아서 `{ ok: false, reason }` 반환(throw 금지).
- `src/health/presentation/dtos/health-response.dto.ts`: `export class HealthCheckDto implements HealthCheck`(`@IsString() name`, `@IsIn(['ok','fail']) status`, `@IsOptional() @IsNumber() latencyMs?`), `export class HealthResponseDto implements HealthResponse`(`@IsIn(['ok','degraded']) status`, `@IsISO8601() timestamp`, `@ValidateNested({ each: true }) @Type(() => HealthCheckDto) checks`) + `static fromReport(report: HealthReport): HealthResponseDto`.
- `src/health/presentation/health.controller.ts`: `@Controller('health')`, `@Get()` — `queryBus.execute(new GetHealthQuery())` → `HealthResponseDto.fromReport()`; `status === 'degraded'`면 `@Res({ passthrough: true })` 또는 `HttpException`이 아닌 방식으로 **HTTP 503** + 같은 body 반환(ok면 200). 컨트롤러는 QueryBus만 주입(포트 직접 주입 금지).
- `src/health/health.module.ts`: providers `[...QueryHandlers, { provide: DATABASE_PING, useClass: DrizzleDatabasePingAdapter }]`, controllers `[HealthController]`. CqrsModule은 여기서 import하지 않는다(전역).
- `src/app.module.ts`: `imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), CqrsModule.forRoot(), DrizzleModule, HealthModule]` — 전역 1회 등록은 여기뿐.
- `src/main.ts`: `NestFactory.create(AppModule)` → `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))` → `app.enableShutdownHooks()` → `listen(config.get('PORT'))`. 비즈니스 로직 없음.

## 3. 환경·DB
- `apps/api/.env.example`: `DATABASE_URL=postgres://postgres:postgres@localhost:5432/social_media`, `PORT=3000`. `apps/api/.env`: 같은 내용으로 **실제 생성**(루트 `.gitignore`가 `.env`를 제외하는지 확인).
- DB preflight(멱등, step 본문에서 실행; 스크립트 `apps/api/scripts/ensure-db.sh`로 저장하고 `db:ensure` 스크립트로 노출): `docker start postgres >/dev/null 2>&1 || true; until docker exec postgres pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done; docker exec postgres psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='social_media'" | grep -q 1 || docker exec postgres psql -U postgres -c 'CREATE DATABASE social_media'`.

## 4. 테스트
- 단위 `src/health/application/queries/handlers/get-health.handler.spec.ts`: `Test.createTestingModule`로 `DATABASE_PING`을 mock(`ping` ok → status ok / ping fail → degraded + checks[0].status fail).
- e2e `test/health.e2e-spec.ts`: 실제 `AppModule` 부팅(실 DB), `main.ts`와 같은 `ValidationPipe` 재적용(`createNestApplication()`은 main.ts 파이프를 모름), `GET /health` → 200, body를 `HealthResponseSchema.parse`로 검증하고 `checks[0].name === 'database'`; `afterAll(async () => { await app.close() })`.

## 5. 문서
`apps/api/AGENTS.md`: 구조(슬라이스 레이아웃과 레이어 규칙 요약 — 상세는 docs/ARCHITECTURE.md·docs/conventions/nestjs.md 링크), 새 슬라이스 추가 절차(`src/{domain}/` 복제 + `app.module.ts` 등록 + `#{domain}/*` 별칭 2곳 추가), 명령(`bun run --filter @social/api build|dev|test|test:e2e|typecheck|lint`, `db:ensure`), 환경(`.env`는 커밋 금지), ESM 규칙(`.js` 확장자, `import type`), 503 정책. `CLAUDE.md` 한 줄 포인터.

## 마무리
루트 `bun install` → `bunx biome check --write apps/api` → `bun run --filter @social/api db:ensure` → AC.

## 반드시 처리할 엣지

아래 엣지/실패 모드를 구현에서 반드시 다루고, Acceptance Criteria가 이를 검증하도록 작성하라:

- DB ping 실패(컨테이너 중지·잘못된 URL) → HTTP 503 + `status:"degraded"`, `checks[database].status:"fail"`, 프로세스는 계속 동작
- `DATABASE_URL` 누락/형식 오류 → zod validate 예외로 부팅 즉시 실패
- DB `social_media`가 이미 존재해도 preflight가 멱등
- e2e 종료 시 postgres 풀 `end()`로 프로세스가 hang 없이 종료
- 인터페이스를 데코레이터 시그니처에 값 import로 쓰면 TS1272 — `import type`
- `#shared/*` 별칭이 tsc·vitest(vite-tsconfig-paths)·Node 런타임(package.json imports) 세 곳 모두에서 해석됨
- `nest new` 비대화 모드가 ESM+Vitest를 생성함(의도); Node 24.12가 schematics engines 미만이라 CLI가 거부하면 템플릿 수기 재현

## Acceptance Criteria

```bash
bun run --filter @social/schemas build && bun run --filter @social/api db:ensure && bun run --filter @social/api build && (cd apps/api && node --input-type=module -e "await import('./dist/app.module.js')") && bun run --filter @social/api typecheck && bun run --filter @social/api lint && bun run --filter @social/api test && bun run --filter @social/api test:e2e
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 결과에 따라 `index.json`의 이 step status를 직접 갱신한다:
   - AC 통과 → `"status": "completed"`, `"summary"`에 다음 step이 이어받는 데 필요한 산출물 요약(생성·수정한 핵심 파일/모듈, 노출한 주요 인터페이스·시그니처, 다음 step이 따라야 할 설계 결정·제약). 과정 서술은 빼고 산출물 중심으로 간결하게
   - 3회 수정 시도 후에도 실패 → `"status": "error"`, `"error_message"`에 구체적 에러
   - 사용자 개입 필요 (API 키, 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason"` 기록 후 즉시 중단

주의: status/summary/error_message/blocked_reason은 작업 세션이 기록한다. 타임스탬프(started_at/completed_at/failed_at/blocked_at)는 runner가 기록하므로 직접 넣지 마라.

## 금지사항

- CJS + Jest 템플릿으로 만들지 마라. 이유: ADR-004가 Nest 12 기본(ESM + Vitest)을 채택했고 `@social/schemas`도 ESM이다.
- 컨트롤러에 `DATABASE_PING` 포트를 직접 주입하지 마라. 이유: presentation은 QueryBus 디스패치만 하며 포트 소비는 application 핸들러의 몫이다(웹훅 raw body 예외 없음).
- `domain/`·`application/`에서 `HttpException`을 던지거나 `@nestjs/common`의 HTTP 데코레이터를 쓰지 마라. 이유: 안쪽 레이어가 HTTP를 알면 CQRS 핸들러를 다른 전송 계층에서 재사용할 수 없다 — 503 매핑은 컨트롤러가 한다.
- `CqrsModule.forRoot()`·`ConfigModule.forRoot()`·`DrizzleModule`을 도메인 모듈에서 재import하지 마라. 이유: 전역 1회 등록은 `app.module.ts` 전용이며 중복 등록은 잉여이거나 이중 인스턴스를 만든다.
- postgres.js 클라이언트를 `onModuleDestroy`에서 `end()`하지 않은 채 두지 마라. 이유: 풀이 열려 있으면 e2e 종료 후 Vitest 프로세스가 hang한다.
- 데코레이터 시그니처에 쓰는 인터페이스/타입을 값 import로 가져오지 마라. 이유: `isolatedModules` + `emitDecoratorMetadata`에서 TS1272 에러 — `import type`을 쓴다(반대로 `QueryBus`·`ConfigService` 같은 클래스 토큰은 값 import).
- `CREATE DATABASE`를 존재 검사 없이 실행하지 마라. 이유: 이미 존재하면 psql이 exit 1로 AC를 깨뜨린다.
- `drizzle-kit generate/migrate`를 AC나 빌드에 넣지 마라. 이유: 테이블이 0이라 산출물이 없고 마이그레이션은 Deferred다.
- tsconfig `paths` 별칭을 package.json `imports` 없이 두지 마라. 이유: tsc는 emit된 JS의 import 경로를 재작성하지 않아 `node dist/main.js`가 `Cannot find module '#shared/...'`로 죽는다 — AC의 dist import 스모크가 이를 검증한다.
- 기존 테스트를 깨뜨리지 마라
