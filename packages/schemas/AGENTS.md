# @social/schemas — Package Agent Doc

## 역할

API(`apps/api`)와 모바일(`apps/mobile`)이 함께 소비하는 **zod 와이어 계약의 단일 소스**다.
`GET /health` 응답 같은 HTTP 경계의 형태를 zod 스키마로 정의하고 추론 타입을 함께 노출한다.
**DB 스키마가 아니다** — drizzle 테이블 정의는 `apps/api`가 소유한다. 도메인이 미정이므로
도메인 이름을 가정한 스키마를 만들지 마라.

## 구조

```
packages/schemas/
├── package.json          # type:module, exports { ".": { types, default } } → dist
├── tsconfig.json         # typecheck·테스트용 — types ["bun"], noEmit
├── tsconfig.build.json   # build용 — rootDir src → outDir dist, types [], *.test.ts 제외
└── src/
    ├── index.ts              # 배럴 — 모든 Schema를 여기서 re-export
    ├── health.schema.ts      # HealthCheckSchema · HealthResponseSchema + 추론 타입
    └── health.schema.test.ts # bun:test
```

## 명령

```sh
bun run --filter @social/schemas build      # tsc -p tsconfig.build.json → dist/, 이어서 tsc-alias가 .js 확장자 부여
bun run --filter @social/schemas typecheck  # tsc --noEmit (테스트 파일 포함)
bun run --filter @social/schemas test       # bun test
bun run --filter @social/schemas lint       # biome check .
bun run --filter @social/schemas dev        # tsc --watch & tsc-alias --watch (둘 다 켜져야 dist가 Node에서 로드됨)
```

## 새 Schema 추가 절차

1. `src/{name}.schema.ts`에 `import * as z from 'zod'`로 스키마를 정의하고 `z.infer` 추론 타입을 함께 export한다.
2. `src/index.ts`에 `export * from './{name}.schema'`를 추가한다 — 확장자는 붙이지 않는다. tsconfig는
   `moduleResolution: bundler`이고, `build`의 `tsc-alias --resolve-full-paths`가 emit된 `.js`·`.d.ts`에 `.js`를 붙인다.
3. `src/{name}.schema.test.ts`(`bun:test`)에 유효 payload 성공 + 잘못된 payload 실패 케이스를 쓴다.
4. `build`로 dist를 갱신한다 — 소비자는 dist만 본다.

## 소비 규칙

- **빌드 전에는 소비할 수 없다.** `exports`가 `dist/`를 가리키므로 dist가 없으면
  `Cannot find module '@social/schemas'`가 난다. turbo 파이프라인은 `^build` 의존으로 보장하지만,
  `bun run --filter <소비자> <script>`처럼 단일 패키지를 직접 돌릴 땐 먼저 이 패키지를 build 하라.
- **모바일은 `zod`를 직접 import하지 않는다.** 파싱은 이 패키지가 노출한 Schema로만 한다 —
  Metro가 zod를 두 벌 번들하면 instanceof 기반 검사가 깨진다.
- **API DTO는 여기의 추론 타입을 `implements`한다.** class-validator 데코레이터는 `apps/api`
  presentation에만 두고, 필드 드리프트는 tsc가 잡는다.
- **런타임 의존은 `zod`뿐이다.** 모바일 번들과 API에 그대로 실리므로 다른 의존을 추가하지 마라.

## 규칙

- 출력은 **compiled ESM 단일 포맷** — `type: module`, tsc → `dist/*.js` + `.d.ts`. CJS를 만들거나
  `exports`를 `src/`로 돌리지 마라(Node 타입 스트리핑은 `node_modules` 하위 `.ts`를 거부한다).
- `types: ["bun"]`은 `tsconfig.json`에만 둔다 — TS 6는 `types` 기본이 `[]`라 이게 없으면
  `bun:test` import가 타입 실패한다. `tsconfig.build.json`은 `types: []`로 되돌려 dist 타입에
  bun 전역이 새지 않게 한다.
- 테스트 파일은 `tsconfig.build.json`의 `exclude`로 dist에서 제외된다 — 파일명은 반드시 `*.test.ts`.
- `dist/`는 gitignore 대상이다. 커밋하지 마라.
- 이 디렉터리에 `biome.json`을 두지 마라 — 루트 `biome.json`이 전체를 검사한다.
