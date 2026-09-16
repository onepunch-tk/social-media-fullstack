# @social/mobile — App Agent Doc

## 역할

Expo SDK 57 + expo-router 모바일 앱. domain-first ddd-hexagonal 구조이며, 지금은 도메인 슬라이스가 0개고
`shared/`만으로 홈 화면에서 API `GET /health`를 TanStack Query로 조회해 `checks[]`를 FlashList로 보여준다.
도메인 이름을 가정한 코드를 만들지 마라. 웹은 비목표다 — `export:web`은 Metro 해석 검증 게이트로만 쓴다.

## 구조

```
apps/mobile/
├── app.json                 # name social-media · scheme socialmedia · web.output "single" · typedRoutes · reactCompiler
├── package.json             # scripts start/dev · typecheck · lint · test · export:web · jest 설정(preset jest-expo)
├── tsconfig.json            # extends expo/tsconfig.base · types ["jest"] · paths @shared/* · @/assets/*
├── jest.setup.js            # EXPO_PUBLIC_API_URL 기본값 + theme 모듈 등록(defineThemes)
├── .env.example             # EXPO_PUBLIC_API_URL (.env는 커밋 금지)
├── assets/                  # 정적 자산 — @/assets/* 로만 접근, Biome 검사 제외
└── src/
    ├── app/                 # Routing shell — named re-export만, import 문·정의 0
    │   ├── _layout.tsx      # default ← @shared/presentation/layouts/root-layout
    │   ├── index.tsx        # default ← @shared/presentation/screens/home-screen
    │   └── +not-found.tsx   # default ← @shared/presentation/screens/not-found-screen
    └── shared/
        ├── domain/                              # 자리 표시
        ├── infrastructure/
        │   ├── http/api-client.ts               # fetchHealth(signal?) — EXPO_PUBLIC_API_URL + /health, HealthResponseSchema.parse
        │   └── query/query-client.ts            # queryClient (retry: 1)
        └── presentation/
            ├── theme/theme.ts                   # AppTheme · StyloTheme 증강 · defineThemes 1회 → { handles, store }
            ├── layouts/root-layout.tsx          # QueryClientProvider > ThemeProvider(store) > Stack · Appearance 동기화(useEffect)
            ├── screens/home-screen.tsx          # useQuery(['health']) → pending/error(재시도)/success(FlashList)
            ├── screens/not-found-screen.tsx     # 404 + <Link href="/">
            ├── screens/__tests__/               # 화면 테스트(fetch mock) — 라우트 루트 밖
            ├── components/health-check-row.tsx  # memo — HealthCheck 하나(name·status·latency)
            └── errors/                          # 자리 표시
```

도메인 슬라이스는 `src/{domain}/{domain,application,infrastructure,presentation}/` + `{domain}.module.ts`로 추가하고,
셸 `src/app/{route}.tsx`가 그 presentation 실체를 named re-export한다. 상세는
[docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md), [docs/conventions/expo.md](../../docs/conventions/expo.md).

## 명령

```sh
bun run --filter @social/schemas build       # 선행 — @social/schemas dist를 소비한다
bun run --filter @social/mobile start        # expo start (dev도 같다)
bun run --filter @social/mobile typecheck    # expo customize tsconfig.json && tsc --noEmit
bun run --filter @social/mobile lint         # biome check .
bun run --filter @social/mobile test         # jest --ci (--watchAll 금지)
bun run --filter @social/mobile export:web   # expo export --platform web --output-dir dist (SPA)
```

API 없이 typecheck/lint/test/export:web이 전부 통과해야 한다 — 테스트는 `fetch`를 mock한다.

## 규칙

- **셸은 named re-export만** — `src/app/**`에 import 문·`export *`·함수/클래스/상수 정의를 두지 마라.
  테스트 파일도 `src/app/` 아래에 두지 마라(라우트로 취급). 실체 옆 `__tests__/`에 둔다.
- **별칭은 `@shared/*`·`@/assets/*`만** — 스캐폴드 `@/*`는 제거했다. `shared/` 안에서는 상대경로,
  셸·도메인에서 `shared`로 건너갈 때만 `@shared/*`. 도메인이 생기면 `@{domain}/*`를 `paths`에 추가한다.
- **`zod`를 직접 import하지 마라** — 파싱은 `@social/schemas`가 노출한 Schema로만(`api-client.ts`가 유일한 소비 지점).
  Metro가 zod를 두 벌 번들하면 instanceof 검사가 깨진다. `@social/schemas`는 dist를 소비하므로 먼저 build.
- **`typecheck`는 `expo customize tsconfig.json` 선행** — typed routes(`.expo/types/router.d.ts`)와
  `expo-env.d.ts`(`process.env` 타입)를 그것이 생성한다. 순서를 바꾸면 타입 부재로 실패. 생성물은 커밋하지 않는다.
- **`@testing-library/react-native`는 13.x 고정** — 14.x는 expo-router 57의 testing-library를 깨뜨린다.
  `test-renderer`를 추가하지 마라. `jest`는 ~29.7(`jest-expo` 57과 짝).
- **`@shopify/flash-list/jestSetup`을 require하지 마라** — 2.0.2의 jestSetup은 존재하지 않는 `RecyclerView`
  export로 `FlashList`를 `undefined`로 덮는다. v2는 mock 없이 jest에서 항목·`ListEmptyComponent`를 렌더한다.
  `FlashList`에 `estimatedItemSize`를 넣지 마라(v2에서 죽은 prop).
- **환경값은 `process.env.EXPO_PUBLIC_API_URL` 점 표기만** — 브래킷·구조분해는 번들 타임에 인라인되지 않는다.
  `EXPO_PUBLIC_*`는 클라이언트 번들에 노출되므로 비밀을 넣지 마라. 기본값은 `http://localhost:3000`.
- **`GET /health`는 503도 body를 파싱한다** — 200(ok)·503(degraded) 모두 `HealthResponse` 형태. 상태 코드로
  분기하지 말고 `status`·`checks[].status`로 판단한다. 네트워크·parse 실패는 TanStack Query 에러 상태로 흐른다.
- 이 디렉터리에 `biome.json`을 두지 마라 — 루트 `biome.json`이 전체를 검사한다(`apps/mobile/assets`는 제외).

## 테마 (stylo-native)

- `defineThemes`는 `src/shared/presentation/theme/theme.ts`에서 **한 번만** 호출한다. `StyloTheme` 모듈 증강도 그 파일.
- `ThemeProvider store={store}`는 루트 레이아웃 한 곳 — 도메인 레이아웃은 Provider를 다시 두지 않는다.
- `store.set`은 `useEffect`·이벤트 핸들러에서만 — render 중·모듈 최상위 호출 금지.
- 테마 sheet는 `createStyleSheet((t) => ({...}))` + `useStyles(styles)`로만 읽는다(직접 프로퍼티 접근은 컴파일 에러).
  리스트 row는 자기 안에서 `useStyles`를 호출하고 `memo`로 감싼다.
- **테스트에서 화면을 단독 렌더할 때 Provider는 필요 없지만 `defineThemes`는 실행돼 있어야 한다** — 앱에서는 루트가
  `store`를 import해 보장하고, jest에서는 `jest.setup.js`가 theme 모듈을 require한다.

## 환경

- `.env.example`(`EXPO_PUBLIC_API_URL=http://localhost:3000`)만 커밋한다. 코드 기본값이 같아 `.env` 없이도 동작한다.
- 실제 API 연동: `bun run --filter @social/schemas build && bun run --filter @social/api db:ensure &&
  bun run --filter @social/api dev` 후 이 앱을 `start`.
