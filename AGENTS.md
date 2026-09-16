# social-media-fullstack — Workspace Agent Doc

## 목적

소셜 미디어 풀스택 토이 프로젝트의 **스캐폴드**다. 제품 도메인은 아직 미정이라 제품 기능은 0이며,
비도메인 `health` 수직 슬라이스 하나(`GET /health` DB ping → 모바일 홈 화면 표시)로 "모노레포가
실제로 결선된다"를 증명하는 것이 현재 범위의 전부다. 도메인 이름을 가정한 코드·스키마를 만들지 마라.

## 빠른 시작 (클론 → 전체 파이프라인 통과)

전제: bun 1.3.14, Node 24, docker 컨테이너 `postgres`(PostgreSQL 16, localhost:5432, postgres/postgres).

```sh
bun install                                   # 전 워크스페이스 설치 (hoisted → 루트 node_modules)
cp apps/api/.env.example apps/api/.env        # api e2e·dev가 읽는 DATABASE_URL·PORT
bun run --filter @social/api db:ensure        # docker postgres 기동 + social_media DB 멱등 생성
bun run build && bun run lint && bun run typecheck && bun run test
```

`bun run test`는 세 러너를 모두 돌린다 — `packages/schemas`(bun test), `apps/api`(vitest 단위 **+ e2e, 실 DB**),
`apps/mobile`(jest-expo). 그래서 `.env`와 `db:ensure`가 선행돼야 한다. 모바일 앱을 API에 붙여 실행하는
절차는 [apps/mobile/AGENTS.md](apps/mobile/AGENTS.md) 환경 절을 보라.

## 디렉터리 배치

| 경로 | 패키지명 | 역할 | Agent doc |
| --- | --- | --- | --- |
| `apps/mobile` | `@social/mobile` | Expo SDK 57 + expo-router 모바일 앱 (jest-expo) | [apps/mobile/AGENTS.md](apps/mobile/AGENTS.md) |
| `apps/api` | `@social/api` | NestJS 12 ESM API (CQRS, drizzle, vitest) | [apps/api/AGENTS.md](apps/api/AGENTS.md) |
| `packages/schemas` | `@social/schemas` | zod 와이어 계약 + 추론 타입 (compiled ESM dist) | [packages/schemas/AGENTS.md](packages/schemas/AGENTS.md) |
| `packages/typescript-config` | `@social/typescript-config` | 공유 tsconfig `base.json` (strict 계열만) | 이 문서 |
| `packages/biome-config` | `@social/biome-config` | 공유 Biome 규칙 `base.json` (`./biome` 서브패스로 노출) | 이 문서 |

```
.
├── package.json        # workspaces apps/*·packages/*, packageManager bun@1.3.14, scripts = turbo run <task>
├── bunfig.toml         # [install] linker = "hoisted"
├── turbo.json          # build(^build → dist/**) · lint/typecheck/test(^build) · dev(persistent)
├── biome.json          # 저장소 전체 lint/format — dist/.expo/coverage/.turbo/expo-env.d.ts/apps/mobile/assets 제외
├── bun.lock            # 텍스트 lockfile (커밋)
├── AGENTS.md / CLAUDE.md
├── apps/{mobile,api}/
├── packages/{schemas,typescript-config,biome-config}/
└── docs/               # PRD.md · ARCHITECTURE.md · adr/ADR-001~012 · conventions/{typescript,nestjs,expo,react}.md · phases/
```

## 명령

```sh
bun install                              # 의존성 설치 (bun.lock 커밋, bun.lockb 금지)
bun run build | lint | typecheck | test  # turbo run <task> — 전 패키지, ^build 의존 순서 보장
bun run dev                              # turbo run dev — persistent, 캐시 없음
bun run check                            # biome check . — 루트에서 저장소 전체 검사
bun run format                           # biome check --write . — 자동 수정
bun run --filter <풀네임> <script>       # 예: bun run --filter @social/schemas build
```

패키지별 스크립트:

| 패키지 | build | typecheck | test | 기타 |
| --- | --- | --- | --- | --- |
| `@social/schemas` | `tsc -p tsconfig.build.json` | `tsc --noEmit` | `bun test` | `dev`(tsc --watch) |
| `@social/api` | `nest build` | `tsc --noEmit -p tsconfig.json` | `vitest run && vitest run --config ./vitest.config.e2e.ts` | `dev`, `test:e2e`, `db:ensure` |
| `@social/mobile` | — | `expo customize tsconfig.json && tsc --noEmit` | `jest --ci` | `start`/`dev`, `export:web` |

모든 패키지의 `lint`는 `biome check .`.

`--filter` 단일 실행은 의존 패키지를 자동 빌드하지 않는다 — 소비자를 돌리기 전에 `@social/schemas`를
먼저 build 하라. 클린 검증은 `rm -rf node_modules .turbo packages/schemas/dist apps/api/dist` 후
빠른 시작 절차를 다시 돌린다(`.turbo` 삭제 = turbo 로컬 캐시 삭제).

## 규칙

- **TypeScript `~6.0.3` 고정** — 전 패키지 devDependency로 선언한다. TS 7 설치 금지.
  `baseUrl`은 어디에도 쓰지 않는다(`paths`만). `module`/`moduleResolution`/`target`/`types`/`rootDir`/`outDir`는
  base가 아니라 각 패키지 tsconfig가 명시한다.
- **Biome 단일 lint/format** — eslint/prettier/oxlint 미도입. 루트 `biome.json` 하나가 전체를 검사하고,
  각 패키지 `lint` 스크립트는 `biome check .`. 하위 디렉터리에 `biome.json`을 두지 마라. 공유 규칙 파일명은
  `base.json`이다(`biome.json`으로 두면 중첩 설정으로 오인되어 에러).
- **내부 패키지는 compiled ESM** — `"type": "module"`, tsc → `dist/` + `.d.ts`, `exports`는 `types`를
  `default`보다 앞에. 소비자는 소스 경로가 아니라 dist를 쓴다(turbo `^build`가 보장).
- **생성물은 커밋 금지** — `dist/`, `.expo/`, `expo-env.d.ts`, `*.tsbuildinfo`, `.turbo/`, `node_modules/`는
  루트·`apps/mobile` `.gitignore`가 제외한다. `.env`도 커밋 금지 — `.env.example`만 커밋한다.
- **루트 `test`는 `turbo run test`** — `bun test`로 바꾸지 마라(jest-expo/vitest 파일을 bun 러너가 잡는다).
  api e2e는 `@social/api`의 `test` 스크립트 안에 포함돼 있으므로 turbo task를 따로 두지 않는다.
- **`trustedDependencies`를 루트 package.json에 두지 마라** — 명시하면 bun 기본 신뢰 목록을 대체한다.
  2026-09-16 클린 설치 기준 `bun pm untrusted` 결과는 차단된 lifecycle 스크립트 0건이다.
- **각 App/Package의 `AGENTS.md`를 먼저 읽어라** — 루트·`apps/mobile`·`apps/api`·`packages/schemas`에
  `AGENTS.md`(실체) + `CLAUDE.md`(한 줄 포인터)가 있다. 설정 전용 패키지는 이 문서가 설명한다.

## 도메인 용어

| 용어 | 정의 |
| --- | --- |
| Workspace | bun workspaces + Turborepo로 묶인 저장소 전체(`apps/*`, `packages/*`) |
| App | 실행 가능한 배포 단위(`apps/mobile`, `apps/api`) |
| Package | App이 소비하는 내부 라이브러리(`packages/schemas`, `packages/typescript-config`, `packages/biome-config`) |
| Schema | `packages/schemas`의 zod 와이어 계약 + 추론 타입. DB 테이블 정의가 아니다 |
| DTO | `apps/api` presentation 전용 class-validator 클래스. Schema 추론 타입을 `implements` |
| Health | DB ping을 포함한 API 상태 응답 `{ status, timestamp, checks[] }` |
| Vertical slice | 한 관심사를 CA 4레이어(domain/application/infrastructure/presentation)로 접은 디렉터리 — 미래 바운디드 컨텍스트의 템플릿 |
| Routing shell | `apps/mobile/src/app/` — named re-export만 두는 expo-router 라우트 파일 |
