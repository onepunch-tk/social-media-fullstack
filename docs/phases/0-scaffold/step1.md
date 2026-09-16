# Step 1: schemas-package

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- [docs/PRD.md](/docs/PRD.md)
- [docs/ARCHITECTURE.md](/docs/ARCHITECTURE.md)
- [docs/adr/ADR-002.md](/docs/adr/ADR-002.md)
- [docs/adr/ADR-003.md](/docs/adr/ADR-003.md)
- [docs/adr/ADR-010.md](/docs/adr/ADR-010.md)
- [docs/adr/ADR-011.md](/docs/adr/ADR-011.md)
- [packages/typescript-config/base.json](/packages/typescript-config/base.json)
- [turbo.json](/turbo.json)
- [AGENTS.md](/AGENTS.md)
- [docs/conventions/typescript.md](/docs/conventions/typescript.md)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`packages/schemas`에 zod 4 와이어 계약 패키지 `@social/schemas`를 만든다. API(Node ESM)·모바일(Metro, jest-expo)·Vitest가 모두 `dist/`를 소비하는 **compiled ESM 단일 포맷**이다. 먼저 step0이 만든 루트 `package.json`·`turbo.json`·`packages/typescript-config/base.json`·`packages/biome-config/base.json`을 읽어라.

## 파일
- `packages/schemas/package.json`: `name: "@social/schemas"`, `version: "0.0.0"`, `private: true`, `type: "module"`, `main: "./dist/index.js"`, `types: "./dist/index.d.ts"`, `exports: {".": {"types": "./dist/index.d.ts", "default": "./dist/index.js"}, "./package.json": "./package.json"}`(`types`를 `default`보다 먼저), `files: ["dist"]`, `scripts`: `build: "tsc -p tsconfig.build.json"`, `typecheck: "tsc --noEmit"`, `lint: "biome check ."`, `test: "bun test"`, `dev: "tsc -p tsconfig.build.json --watch"`. `dependencies`: `zod ^4.6.5`. `devDependencies`: `typescript ~6.0.3`, `@types/bun latest`, `@social/typescript-config: workspace:*`.
- `tsconfig.json`(타입체크·테스트용): `extends: "@social/typescript-config/base.json"`, `compilerOptions`: `module: "nodenext"`, `moduleResolution: "nodenext"`, `target: "ES2023"`, `types: ["bun"]`(TS 6는 `types` 기본이 `[]`라 `bun:test` 타입이 안 보임), `declaration: true`, `declarationMap: true`, `noEmit: true`; `include: ["src"]`.
- `tsconfig.build.json`: `extends: "./tsconfig.json"`, `compilerOptions`: `noEmit: false`, `rootDir: "./src"`, `outDir: "./dist"`, `types: []`; `include: ["src"]`, `exclude: ["src/**/*.test.ts"]`(테스트가 dist에 섞이지 않게).
- `src/health.schema.ts`: `import * as z from 'zod'`; `export const HealthCheckSchema = z.object({ name: z.string().min(1), status: z.enum(['ok', 'fail']), latencyMs: z.number().nonnegative().optional() })`; `export const HealthResponseSchema = z.object({ status: z.enum(['ok', 'degraded']), timestamp: z.iso.datetime(), checks: z.array(HealthCheckSchema) })`; `export type HealthCheck = z.infer<typeof HealthCheckSchema>`; `export type HealthResponse = z.infer<typeof HealthResponseSchema>`.
- `src/index.ts`: `export * from './health.schema.js'` (nodenext ESM이라 상대 import는 `.js` 확장자 필수).
- `src/health.schema.test.ts`(`bun:test`): 유효 payload parse 성공, `timestamp`가 ISO가 아닐 때 실패, `checks[].status`가 enum 밖일 때 실패, `latencyMs` 생략 허용 — 최소 4 케이스.
- `packages/schemas/AGENTS.md`: 패키지 역할(와이어 계약 단일 소스, DB 스키마 아님), 새 Schema 추가 절차(`src/{name}.schema.ts` + `index.ts` export + 테스트), 소비 규칙(모바일은 `zod`를 직접 import하지 않고 이 패키지만 import — Metro 이중 복사 방지; API DTO는 여기의 추론 타입을 `implements`), 명령(`bun run --filter @social/schemas build|test|typecheck`), 빌드 전 소비 불가(consumer는 turbo `^build`에 의존). `CLAUDE.md`: 한 줄 포인터.

## 마무리
`bun install`(루트) → `bunx biome check --write packages/schemas` → AC. `dist/`는 gitignore 대상이며 커밋하지 않는다.

## 반드시 처리할 엣지

아래 엣지/실패 모드를 구현에서 반드시 다루고, Acceptance Criteria가 이를 검증하도록 작성하라:

- 잘못된 payload(`timestamp` 비ISO, enum 밖 `status`) parse 실패가 테스트로 검증됨
- `@types/bun` 없으면 TS 6 `types:[]` 기본으로 `bun:test` import가 타입 실패 — `types: ["bun"]` 명시
- 테스트 파일이 dist에 섞이지 않음(`tsconfig.build.json` exclude)
- dist 미빌드 상태에서 소비자가 `Cannot find module '@social/schemas'` — 소비 step AC가 schemas build를 먼저 수행

## Acceptance Criteria

```bash
bun run --filter @social/schemas build && bun run --filter @social/schemas typecheck && bun run --filter @social/schemas test && test -f packages/schemas/dist/index.js && test -f packages/schemas/dist/index.d.ts && ! ls packages/schemas/dist | grep -q test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 결과에 따라 `index.json`의 이 step status를 직접 갱신한다:
   - AC 통과 → `"status": "completed"`, `"summary"`에 다음 step이 이어받는 데 필요한 산출물 요약(생성·수정한 핵심 파일/모듈, 노출한 주요 인터페이스·시그니처, 다음 step이 따라야 할 설계 결정·제약). 과정 서술은 빼고 산출물 중심으로 간결하게
   - 3회 수정 시도 후에도 실패 → `"status": "error"`, `"error_message"`에 구체적 에러
   - 사용자 개입 필요 (API 키, 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason"` 기록 후 즉시 중단

주의: status/summary/error_message/blocked_reason은 작업 세션이 기록한다. 타임스탬프(started_at/completed_at/failed_at/blocked_at)는 runner가 기록하므로 직접 넣지 마라.

## 금지사항

- `exports`가 `./src/index.ts`(TS 소스)를 가리키는 just-in-time 패키지로 만들지 마라. 이유: Nest는 번들러 없이 Node로 `dist/main.js`를 실행하고 Node 타입 스트리핑은 `node_modules` 하위 `.ts`를 거부한다.
- CJS 출력을 만들지 마라(`type: module` 제거·`module: commonjs`). 이유: API가 ESM(Nest 12 기본)이고 Metro·jest-expo·Vitest도 ESM dist를 소비할 수 있어 단일 포맷이 가장 단순하다.
- 상대 import에 `.js` 확장자를 빼지 마라. 이유: `moduleResolution: nodenext` ESM은 확장자 없는 상대 경로를 런타임에 해석하지 못한다.
- 이 패키지에 zod 외의 런타임 의존을 추가하지 마라. 이유: 모바일 번들과 API 양쪽에 그대로 실린다.
- 기존 테스트를 깨뜨리지 마라
