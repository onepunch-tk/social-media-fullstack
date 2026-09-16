# Step 0: monorepo-root

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- [docs/PRD.md](/docs/PRD.md)
- [docs/ARCHITECTURE.md](/docs/ARCHITECTURE.md)
- [docs/adr/ADR-001.md](/docs/adr/ADR-001.md)
- [docs/adr/ADR-002.md](/docs/adr/ADR-002.md)
- [docs/adr/ADR-009.md](/docs/adr/ADR-009.md)
- [docs/adr/ADR-010.md](/docs/adr/ADR-010.md)
- [docs/adr/ADR-012.md](/docs/adr/ADR-012.md)
- [docs/conventions/typescript.md](/docs/conventions/typescript.md)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

저장소 루트(`/Users/tkstart/Desktop/development/fullstack/social-media-fullstack`)에 bun workspaces + Turborepo 2 모노레포 골격과 공유 설정 패키지를 만든다. 아직 apps/*는 없다(다음 step들이 만든다). 로컬 툴체인: bun 1.3.14, Node 24.12, TypeScript는 전 패키지 `~6.0.3` 고정(TS 7 금지).

## 만들 것
1. git 저장소는 이미 초기화되어 있다(`git init` 불필요, 브랜치는 러너가 관리). 기존 `.gitignore`(harness 규칙 포함)는 유지하고 아래 항목을 **추가**: `node_modules/`, `dist/`, `coverage/`, `.turbo/`, `.expo/`, `expo-env.d.ts`, `.env`, `.env.*`, `!.env.example`, `.DS_Store`. 이 step 끝에 초기 커밋을 만들지 않아도 된다(러너가 커밋).
2. `mkdir -p apps packages` (workspace glob이 스캔할 디렉터리).
3. 루트 `package.json`: `name: "social-media-fullstack"`, `private: true`, `workspaces: ["apps/*", "packages/*"]`, `packageManager: "bun@1.3.14"`(정확히 이 문자열 — turbo가 요구), `scripts`: `build: "turbo run build"`, `lint: "turbo run lint"`, `typecheck: "turbo run typecheck"`, `test: "turbo run test"`(절대 `bun test`가 아님), `dev: "turbo run dev"`, `check: "biome check ."`, `format: "biome check --write ."`. `devDependencies`: `turbo ^2.10.13`, `@biomejs/biome 2.5.13`(정확 버전), `@social/biome-config: workspace:*`. `trustedDependencies` 필드는 **두지 않는다**(명시하면 bun 기본 신뢰 목록을 대체해 esbuild 등의 postinstall이 꺼진다).
4. 루트 `bunfig.toml`: `[install]\nlinker = "hoisted"` (bun 1.3.2+는 새 워크스페이스를 isolated 링커로 설치하는데 RN/Metro/jest-expo의 검증된 경로는 hoisted).
5. `turbo.json`: `$schema: "https://turborepo.dev/schema.json"`, `tasks`: `build {dependsOn: ["^build"], outputs: ["dist/**"], inputs: ["$TURBO_DEFAULT$", ".env*"]}`, `lint {dependsOn: ["^build"]}`, `typecheck {dependsOn: ["^build"], outputs: []}`, `test {dependsOn: ["^build"], inputs: ["$TURBO_DEFAULT$", ".env*"]}`, `dev {cache: false, persistent: true}`; `globalEnv: ["EXPO_PUBLIC_API_URL", "DATABASE_URL", "PORT", "NODE_ENV"]`.
6. `packages/typescript-config/`: `package.json` (`name: "@social/typescript-config"`, `private: true`, `files: ["*.json"]`) + `base.json` — TS 6 기준 공통 옵션: `strict: true`, `skipLibCheck: true`, `esModuleInterop: true`, `isolatedModules: true`, `forceConsistentCasingInFileNames: true`, `resolveJsonModule: true`, `noUncheckedIndexedAccess: true`. `module`/`moduleResolution`/`target`/`types`/`rootDir`/`outDir`는 base에 두지 말고 각 패키지가 명시한다(Expo는 `expo/tsconfig.base`, Nest는 nodenext, schemas는 nodenext). `baseUrl`은 어디에도 쓰지 않는다(TS 6 deprecated).
7. `packages/biome-config/`: `package.json` (`name: "@social/biome-config"`, `private: true`, `type: "module"`, `exports: {"./biome": "./base.json"}`) + **`base.json`** (파일명이 `biome.json`/`biome.jsonc`이면 Biome이 중첩 설정으로 오인해 루트 검사에서 에러). 내용: `$schema: "https://biomejs.dev/schemas/2.5.13/schema.json"`, `formatter: {enabled: true, indentStyle: "space", indentWidth: 2, lineWidth: 100}`, `javascript: {formatter: {quoteStyle: "single", semicolons: "always", trailingCommas: "all"}, parser: {unsafeParameterDecoratorsEnabled: true}}`, `linter: {enabled: true, rules: {preset: "recommended"}}`(`rules.recommended`는 2.5에서 deprecated), `assist: {actions: {source: {organizeImports: "on"}}}`. 이 파일에 `root`를 넣지 않는다.
8. 루트 `biome.json`: `$schema` 동일, `extends: ["@social/biome-config/biome"]`(확장자 없는 서브패스 — `.json`으로 끝나면 상대경로로 오인), `vcs: {enabled: true, clientKind: "git", useIgnoreFile: true}`, `files: {includes: ["**", "!!**/dist", "!!**/.expo", "!!**/coverage", "!!**/expo-env.d.ts", "!!**/.turbo"]}`, `overrides: [{includes: ["apps/api/**"], linter: {rules: {style: {useImportType: "off"}}}}]`(useImportType 자동수정이 Nest의 `design:paramtypes` 메타데이터를 파괴).
9. 루트 `AGENTS.md`: 이 Workspace의 목적(도메인 미정 스캐폴드), 디렉터리 배치(apps/mobile, apps/api, packages/schemas, packages/typescript-config, packages/biome-config — 아직 없는 것은 '예정'으로 표기), 명령(`bun install`, `bun run build|lint|typecheck|test|dev`, `bun run check`, `bun run --filter <풀네임> <script>`), 규칙(TS ~6.0 고정, Biome 단일 lint/format, 내부 패키지는 compiled ESM, `.env`는 커밋 금지·`.env.example`만, 각 App/Package의 AGENTS.md를 먼저 읽을 것), 도메인 용어 요약(Workspace/App/Package/Schema/DTO/Health/Vertical slice/Routing shell). 루트 `CLAUDE.md`: 정확히 한 줄 — `AGENTS.md를 읽고 그대로 따른다.` 같은 포인터.

## 마무리
`bun install` 후 `bunx biome check --write .`로 손으로 쓴 JSON/MD를 Biome 포맷에 맞춘 뒤 AC를 실행한다. `bun.lock`(텍스트)은 커밋 대상이다(`bun.lockb` 금지).

## 반드시 처리할 엣지

아래 엣지/실패 모드를 구현에서 반드시 다루고, Acceptance Criteria가 이를 검증하도록 작성하라:

- `bunx biome`가 로컬 미설치 상태에서 엉뚱한 `biome@0.3.3`을 설치하는 문제 — devDependencies 설치 후에만 실행
- 공유 config 파일명이 `biome.json`이면 중첩 config 오인 에러 — `base.json` 사용
- `trustedDependencies` 명시 시 bun 기본 신뢰 목록 대체 — 필드 자체를 두지 않음
- 생성물(dist/.expo/expo-env.d.ts/coverage)이 lint 대상에 섞여 이후 step의 `biome check`가 실패 — `files.includes` 강제 제외(`!!`) + `vcs.useIgnoreFile`
- 손으로 쓴 JSON이 Biome 기본 포맷(tab)과 달라 AC 실패 — `indentStyle: space` 설정 + `biome check --write` 선행
- `turbo run build --dry-run`이 build 스크립트 없는 상태에서도 종료코드 0 — 정상(경고만 출력)

## Acceptance Criteria

```bash
bun install && bun run check && bun run build --dry-run
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 결과에 따라 `index.json`의 이 step status를 직접 갱신한다:
   - AC 통과 → `"status": "completed"`, `"summary"`에 다음 step이 이어받는 데 필요한 산출물 요약(생성·수정한 핵심 파일/모듈, 노출한 주요 인터페이스·시그니처, 다음 step이 따라야 할 설계 결정·제약). 과정 서술은 빼고 산출물 중심으로 간결하게
   - 3회 수정 시도 후에도 실패 → `"status": "error"`, `"error_message"`에 구체적 에러
   - 사용자 개입 필요 (API 키, 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason"` 기록 후 즉시 중단

주의: status/summary/error_message/blocked_reason은 작업 세션이 기록한다. 타임스탬프(started_at/completed_at/failed_at/blocked_at)는 runner가 기록하므로 직접 넣지 마라.

## 금지사항

- `bunx biome`를 `@biomejs/biome`가 루트 devDependencies에 설치되기 전에 실행하지 마라. 이유: bunx가 로컬에 없으면 npm의 무관한 `biome@0.3.3`(env 관리 도구)을 자동 설치해 엉뚱한 바이너리가 실행된다.
- 공유 Biome 설정 파일을 `biome.json`/`biome.jsonc`로 이름 짓지 마라. 이유: Biome 스캐너가 워크스페이스 내부의 그 파일을 중첩 설정으로 발견하고 `root: false`가 없으면 에러를 낸다 — `base.json` + exports 서브패스로만 노출한다.
- `trustedDependencies`를 package.json에 명시하지 마라. 이유: 명시하는 순간 bun의 기본 신뢰 목록(esbuild, sharp 등)을 대체해 필요한 postinstall이 조용히 꺼진다.
- 루트 `test` 스크립트를 `bun test`로 두지 마라. 이유: bun 러너가 jest-expo/vitest 테스트 파일까지 직접 실행하려 들어 실패한다 — 루트는 `turbo run test`만.
- TypeScript 7.x를 설치하지 마라. 이유: Nest CLI 12·Expo 57 템플릿이 `~6.0`을 고정하고 있어 툴체인 호환이 검증되지 않았다.
- `tsconfig`에 `baseUrl`을 쓰지 마라. 이유: TS 6에서 deprecated라 `ignoreDeprecations` 없이는 에러다 — `paths`만 쓴다.
- 기존 테스트를 깨뜨리지 마라
