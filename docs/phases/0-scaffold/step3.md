# Step 3: mobile-app

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- [docs/PRD.md](/docs/PRD.md)
- [docs/ARCHITECTURE.md](/docs/ARCHITECTURE.md)
- [docs/adr/ADR-002.md](/docs/adr/ADR-002.md)
- [docs/adr/ADR-007.md](/docs/adr/ADR-007.md)
- [docs/adr/ADR-008.md](/docs/adr/ADR-008.md)
- [docs/adr/ADR-011.md](/docs/adr/ADR-011.md)
- [packages/schemas/src/health.schema.ts](/packages/schemas/src/health.schema.ts)
- [apps/api/src/health/presentation/health.controller.ts](/apps/api/src/health/presentation/health.controller.ts)
- [apps/api/src/health/presentation/dtos/health-response.dto.ts](/apps/api/src/health/presentation/dtos/health-response.dto.ts)
- [turbo.json](/turbo.json)
- [biome.json](/biome.json)
- [AGENTS.md](/AGENTS.md)
- [docs/conventions/expo.md](/docs/conventions/expo.md)
- [docs/conventions/react.md](/docs/conventions/react.md)
- [docs/conventions/typescript.md](/docs/conventions/typescript.md)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`apps/mobile`에 Expo SDK 57 앱 `@social/mobile`을 만들고 domain-first 구조(`src/app/` 라우팅 셸 + `src/shared/` 실체)로 정리한 뒤, 홈 화면이 API `GET /health`를 TanStack Query로 조회해 `checks[]`를 FlashList로 보여주게 한다. 먼저 step1의 `packages/schemas/src/health.schema.ts`, step2의 `apps/api/src/health/presentation/health.controller.ts`·`dtos/health-response.dto.ts`(응답 형태·503 정책), 루트 `turbo.json`·`biome.json`·`AGENTS.md`를 읽어라. 이 step의 AC는 **API 서버 없이** 통과해야 한다(테스트는 fetch mock, export는 서버 불필요).

## 1. 앱 생성
루트에서 `bun create expo-app apps/mobile --template default --no-install --no-agents-md`(`--no-agents-md`가 없으면 AGENTS.md/CLAUDE.md/.claude/settings.json이 자동 생성되어 이 프로젝트 규칙과 충돌). 생성 후: `package.json` `name`을 `@social/mobile`로, `private: true`. SDK 57 기본 템플릿은 이미 `src/app/`, `experiments.typedRoutes: true`, `reactCompiler: true`, `main: "expo-router/entry"`, `tsconfig extends expo/tsconfig.base`를 갖는다. `app.json`의 `web.output`을 `"single"`로 바꾼다(정적 SSG의 Node 프리렌더 위험 제거; 웹은 비목표). `name`/`slug`/`scheme`은 `social-media`, `socialmedia`로.
템플릿 잔여물 삭제: `src/components/`, `src/hooks/`, `src/constants/`, `src/global.css`, `src/app/explore.tsx`, `scripts/reset-project.js`(+ `reset-project` 스크립트), 템플릿 `.gitignore`는 루트 `.gitignore`와 중복되면 삭제해도 됨. `tsconfig.json` `paths`에서 `@/*` 제거, `@shared/*: ["./src/shared/*"]` 추가, `@/assets/*` 유지; `compilerOptions.types: ["jest"]`(TS 6 `types` 기본 `[]`); `include`에 `.expo/types/**/*.ts`, `expo-env.d.ts` 유지.
의존성(SDK 호환 버전은 `bunx expo install`로): `bunx expo install @shopify/flash-list react-native-web react-dom` ; `bun add @tanstack/react-query@^5.102.8 stylo-native@1.0.0 @social/schemas@workspace:*` ; dev: `bun add -d jest@~29.7.0 @types/jest@29.5.14 jest-expo@~57.0.5 @react-native/jest-preset@^0.86.3 @testing-library/react-native@~13.3.3 typescript@~6.0.3 @social/typescript-config@workspace:*`(RNTL 14는 expo-router testing-library를 깨뜨림 — 13.x 고정, `test-renderer` 추가 금지). `zod`는 이 앱에 직접 추가하지 않는다.
스크립트: `start: "expo start"`, `android/ios/web` 유지, `typecheck: "expo customize tsconfig.json && tsc --noEmit"`(customize가 `expo-env.d.ts`·`.expo/types`를 비대화로 생성 — 순서 필수), `lint: "biome check ."`(템플릿 `expo lint`는 ESLint를 부트스트랩하려 함 — 교체), `test: "jest --ci"`(`--watchAll` 금지), `export:web: "expo export --platform web --output-dir dist"`, `dev: "expo start"`.
jest 설정(`package.json` `jest` 키): `preset: "jest-expo"`, `transformIgnorePatterns: ["node_modules/(?!(.bun|(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@shopify/flash-list))"]`, `setupFiles: ["<rootDir>/jest.setup.js"]`(`process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000'` 설정 + `require('@shopify/flash-list/jestSetup')`이 존재하면 require).

## 2. 구조 (ARCHITECTURE.md 기준)
- `src/app/_layout.tsx`: `export { default } from '@shared/presentation/layouts/root-layout';` — import 문·정의 없이 named re-export만. `src/app/index.tsx`: `export { default } from '@shared/presentation/screens/home-screen';`. `src/app/+not-found.tsx`: `export { default } from '@shared/presentation/screens/not-found-screen';`. `src/app/**`에 다른 파일 없음.
- `src/shared/presentation/theme/theme.ts`: `import { defineThemes } from 'stylo-native'`; `export interface AppTheme { colors: { bg: string; fg: string; muted: string; ok: string; fail: string }; space: { sm: number; md: number; lg: number } }`; `declare module 'stylo-native' { interface StyloTheme extends AppTheme {} }`; `light`/`dark` 객체(`satisfies AppTheme`, 같은 shape); `export const { handles, store } = defineThemes({ light, dark }, 'light')`. `defineThemes`는 앱 전체에서 이 파일 한 번만.
- `src/shared/infrastructure/query/query-client.ts`: `export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })`.
- `src/shared/infrastructure/http/api-client.ts`: `const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'`(점 표기만 — 브래킷 접근은 인라인되지 않음); `export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse>` — `fetch(\`${API_URL}/health\`, { signal })` 후 상태코드와 무관하게 JSON을 `HealthResponseSchema.parse`(503도 같은 body). 네트워크 실패·parse 실패는 예외 그대로 전파. `@social/schemas`만 import(`zod` 직접 import 금지).
- `src/shared/presentation/layouts/root-layout.tsx`: `export default function RootLayout()` — `<QueryClientProvider client={queryClient}><ThemeProvider store={store}><Stack screenOptions={{ headerShown: true }} /></ThemeProvider></QueryClientProvider>`; `useEffect`에서 `store.set(Appearance.getColorScheme() === 'dark' ? 'dark' : 'light')`와 `Appearance.addChangeListener` 구독(+cleanup) — render 중 `store.set` 금지.
- `src/shared/presentation/screens/home-screen.tsx`: `export default function HomeScreen()` — `useQuery({ queryKey: ['health'], queryFn: ({ signal }) => fetchHealth(signal) })`; 상태별 렌더: pending → '확인 중…', error → 에러 메시지 + 재시도(`refetch`), success → 상단에 `status`·`timestamp`, `FlashList` (`data={data.checks}`, `keyExtractor={(c) => c.name}`, `renderItem`은 `React.memo`된 `HealthCheckRow`, `ListEmptyComponent`로 '검사 항목 없음'). 스타일은 `createStyleSheet((t) => ({...}))` + `useStyles`(테마 sheet는 직접 프로퍼티 접근 불가). 텍스트는 한국어.
- `src/shared/presentation/screens/not-found-screen.tsx`: 간단한 404 + `<Link href="/">`.
- `src/shared/presentation/components/health-check-row.tsx`: `HealthCheck` 하나를 받아 이름·상태·latency 표시(`status`에 따라 `t.colors.ok`/`fail`).
- `src/shared/presentation/errors/`, `src/shared/domain/`: 자리 표시(README 한 줄).
- 테스트 `src/shared/presentation/screens/__tests__/home-screen.test.tsx`(라우트 루트 밖): `global.fetch`를 `jest.fn`으로 mock — (a) ok 응답 → `checks[0].name` 텍스트 표시, (b) 네트워크 reject → 에러 상태 텍스트, (c) Schema 불일치 body → 에러 상태 텍스트. 렌더는 `QueryClientProvider`(테스트용 새 QueryClient, `retry: false`)로 감싼다; stylo는 provider 없이도 초기 테마로 동작. `@testing-library/react-native` 13.x의 동기 `render`/`findByText` 사용.
- `.env.example`: `EXPO_PUBLIC_API_URL=http://localhost:3000`(실제 `.env`는 만들지 않아도 됨 — 코드 기본값이 같음). `.gitignore`(루트)에 `.env`/`!.env.example`이 있는지 확인.

## 3. 문서
`apps/mobile/AGENTS.md`: 구조(`src/app/`은 named re-export만, 실체는 `src/shared/presentation/`, 도메인 슬라이스는 `src/{domain}/`에 추가 — 상세는 docs/ARCHITECTURE.md·docs/conventions/expo.md), 명령(`bun run --filter @social/mobile start|typecheck|lint|test|export:web`), 규칙(`@/*` 별칭 없음·`@shared/*`만, `zod` 직접 import 금지, RNTL 13.x 고정, `typecheck`는 `expo customize` 선행, 테스트는 `__tests__/`에), 환경(`EXPO_PUBLIC_API_URL`, 비밀 금지), 테마(`theme.ts` 단일 `defineThemes`). `CLAUDE.md` 한 줄 포인터.

## 마무리
루트 `bun install` → `bunx biome check --write apps/mobile` → AC. `dist/`·`.expo/`·`expo-env.d.ts`는 커밋하지 않는다.

## 반드시 처리할 엣지

아래 엣지/실패 모드를 구현에서 반드시 다루고, Acceptance Criteria가 이를 검증하도록 작성하라:

- 네트워크 실패(fetch reject) → 에러 상태 + 재시도
- 응답이 Schema와 불일치 → parse 실패로 에러 상태
- 503 degraded 응답도 정상 파싱되어 fail check가 목록에 표시
- `checks`가 빈 배열 → `ListEmptyComponent`
- API 서버 없이 typecheck/lint/test/export:web 전부 통과
- RNTL 14 설치 시 expo-router 테스트 파괴 — 13.x 고정
- `expo-env.d.ts` 미생성 시 `process.env` 타입 실패 — customize 선행
- `create-expo-app`의 AGENTS/CLAUDE/.claude 자동 생성 차단(`--no-agents-md`)
- bun hoisted 링커에서도 jest `transformIgnorePatterns`에 `.bun`·`@shopify/flash-list` 포함

## Acceptance Criteria

```bash
bun run --filter @social/schemas build && bun run --filter @social/mobile typecheck && bun run --filter @social/mobile lint && bun run --filter @social/mobile test && bun run --filter @social/mobile export:web && test -z "$(grep -rlE '^[[:space:]]*import[[:space:]]' apps/mobile/src/app)" && test -z "$(find apps/mobile/src/app \( -name '*.test.*' -o -name '__tests__' \))"
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 결과에 따라 `index.json`의 이 step status를 직접 갱신한다:
   - AC 통과 → `"status": "completed"`, `"summary"`에 다음 step이 이어받는 데 필요한 산출물 요약(생성·수정한 핵심 파일/모듈, 노출한 주요 인터페이스·시그니처, 다음 step이 따라야 할 설계 결정·제약). 과정 서술은 빼고 산출물 중심으로 간결하게
   - 3회 수정 시도 후에도 실패 → `"status": "error"`, `"error_message"`에 구체적 에러
   - 사용자 개입 필요 (API 키, 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason"` 기록 후 즉시 중단

주의: status/summary/error_message/blocked_reason은 작업 세션이 기록한다. 타임스탬프(started_at/completed_at/failed_at/blocked_at)는 runner가 기록하므로 직접 넣지 마라.

## 금지사항

- `src/app/**`에 import 문·`export *`·함수/클래스/상수 정의를 두지 마라. 이유: 셸에 화면이 살면 '이름만 domain-first'가 된다 — 전 파일이 named re-export만 갖는다(AC의 grep이 검증).
- `@/*`(`./src/*`) 별칭을 남기지 마라. 이유: 두 번째 크로스 컨텍스트 경로가 되어 별칭 grep을 우회한다 — `@shared/*`와 `@/assets/*`만.
- 이 앱에서 `zod`를 직접 import하지 마라. 이유: Metro가 `@social/schemas` 경유 복사본과 별도 복사본을 로드해 instanceof 기반 검사가 깨진다 — `@social/schemas`만 import.
- `@testing-library/react-native` 14.x나 `test-renderer`를 설치하지 마라. 이유: expo-router 57의 testing-library는 RNTL 13.x 동기 API 전제라 14에서 깨진다.
- `tsc --noEmit`을 `expo customize tsconfig.json` 없이 돌리지 마라. 이유: typed routes 타입과 `expo-env.d.ts`(`process` 선언)는 customize/dev 서버만 생성해 순서를 바꾸면 타입 부재로 실패한다.
- `process.env['EXPO_PUBLIC_API_URL']`처럼 브래킷/구조분해로 읽지 마라. 이유: Expo는 정적 점 표기만 번들 타임에 인라인한다.
- `store.set`을 render 중이나 모듈 최상위에서 호출하지 마라. 이유: stylo-native가 render 중 set을 금지한다 — `useEffect` 안에서만.
- 테스트 파일을 `src/app/` 아래에 두지 마라. 이유: expo-router가 라우트로 취급한다 — 실체 옆 `__tests__/`.
- AC 통과를 위해 API 서버 기동을 요구하는 테스트를 만들지 마라. 이유: 격리 세션에는 서버가 없다 — fetch는 mock한다.
- `FlashList`에 `estimatedItemSize`를 넣지 마라. 이유: v2는 무시하는 죽은 prop이다.
- 기존 테스트를 깨뜨리지 마라
