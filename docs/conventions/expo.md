# Expo (Router + React Native) — 컨벤션 (행동 규칙)

> 빌드 실행 세션(execute.py)이 읽는 **행동 컨벤션**이다 — 관용구 · enforceable 규칙 ·
> 스택별 edge case · 안티패턴만 담는다. 디렉터리 구조 / 레이어 / 파일 위치 / alias는
> ARCHITECTURE.md가 소유하므로 여기서 중복하지 않는다.
>
> 대상은 **Expo Router + React Native** 위의 DDD + Clean Architecture + Ports & Adapters
> 수직 슬라이스다. (라우트 디렉터리 **구조**는 ARCHITECTURE 소유 — 플랫폼 분기·접미사 *사용법*은 행동이라 여기서 다룬다.)

## 관용구 (Idioms)

- **라우팅 셸은 named re-export만** — `src/app/**` 파일은 `default`·`unstable_settings`·
  `ErrorBoundary`·`generateStaticParams`·`GET`(등 `+api.ts` 메서드)을 도메인/shared
  presentation 실체에서 이름 지정 re-export한다(`export { default, ErrorBoundary } from '@…/presentation/…'`
  꼴). SDK 57에는 라우트 파일 정적 분석이 없어 특수 심볼이 모듈 네임스페이스에서
  읽히므로 re-export로 충분하다 — 화면·레이아웃·특수 export의 실체는
  `src/{domain}/presentation/`에 정의하고, 셸에는 import 문·`export *`·정의를 두지 않는다.
- **포트 = 인터페이스 하나, 어댑터는 `implements`, use case는 생성자 주입 클래스** — DI
  컨테이너·Symbol 토큰이 없다. `{name}.port.ts`는 인터페이스(와 보조 타입)만 export하는
  순수 TypeScript이고, `{VerbNoun}UseCase`는 생성자로 포트를 받아 `execute()` 하나를 갖는다.
  파일명을 PascalCase로 바꾸면 클래스명이 나오게 짓는다.
- **결선은 도메인 모듈 파일이 한다** — `{domain}.module.ts`가 어댑터·use case를 직접
  인스턴스화해 **named export**한다(포트 인스턴스는 `userRepository: UserRepositoryPort`처럼
  포트 타입으로 선언해 구현 타입을 숨긴다; use case는 `getUser` 같은 인스턴스). 객체
  하나로 묶어 export하지 않는다. 화면·레이아웃·API 핸들러는 이 파일에서 use case
  인스턴스를 import한다 — DI가 없어 허용되는 유일한 "바깥→안" 예외다.
- **화면은 use case를 소비하고 결과를 뷰모델로 매핑한다** — 화면 컴포넌트는 use case의
  `execute()`를 부르고, 도메인 객체는 `presentation/view-models/`의 `to{Name}View()`로
  직렬화 가능한 plain 객체로 바꿔 렌더한다. presentation에서 도메인 엔티티 타입을
  import하는 파일은 뷰모델 파일뿐이다. 목록이 필요하면 `list-*` use case를 만든다 —
  리포지토리를 직접 부르지 않는다.
- **예외는 레이어 소유, 매핑은 `shared/presentation/errors/`** — domain은 도메인 예외,
  application은 애플리케이션 예외를 던지고, 화면은 그것을 화면 상태(에러 메시지·빈
  상태)로, `+api.ts` 핸들러 실체는 Response 상태로 번역한다. 번역 헬퍼는
  `shared/presentation/errors/`에 모은다(자리는 확정, 헬퍼 자체는 미실측). 화면 안에서
  예외 타입별 분기를 흩뿌리지 않는다.
- **도메인 간 동기 조회는 ACL 포트로** — 소비 도메인이 필요한 만큼만(원시 타입·shared VO
  시그니처) 자기 `application/ports/`에 포트를 선언하고, 자기
  `infrastructure/adapters/{port-name}.adapter.ts`가 공급 도메인의 포트 **타입**만 type
  import해 구현한다. 포트 **인스턴스** 주입은 소비 도메인 모듈 파일이 공급 도메인 모듈
  파일에서 가져와 ACL 어댑터 생성자에 명시적으로 넘긴다 — 생성자 기본값에 크로스 결선을
  숨기지 않는다(관통 흔적이 모듈 파일에 남아야 한다). 타 도메인 심볼은 이 두 파일 밖에서
  만지지 않는다.
- **루트 `_layout`은 Stack, 탭은 `(tabs)/` 그룹 하위** — 루트가 `expo-router/ui` Tabs면
  트리거로 선언되지 않은 도메인 라우트가 정적 export에서 index 탭 내용으로 조용히
  렌더된다.
- **플랫폼 분기 파일은 presentation 실체에** — `{name}-screen.web.tsx`처럼 실체 옆에 두고
  셸은 접미사 없는 경로를 re-export한다. Metro가 플랫폼별로 해석하고 Node 렌더 번들도
  `.web`을 집는다.
- **네비게이션은 expo-router API로** — `<Link>`/`useRouter().push`/`router.replace`. React Navigation을
  직접 호출하지 않는다. 라우트 파라미터는 `useLocalSearchParams`/`useGlobalSearchParams`로 읽는다.
- **저장소는 민감도로 가른다** — 토큰·자격증명은 `expo-secure-store`(Keychain/Keystore), 비밀이
  아닌 캐시는 AsyncStorage/MMKV. 모든 저장 접근은 비동기·실패 가능으로 다룬다.
- **권한은 요청 → 분기 → 사용** — `useCameraPermissions` 등 훅으로 요청하고, granted/denied/undetermined를
  분기한 뒤에만 native API를 호출한다.
- **플랫폼 차이는 파일 접미사/`Platform.select`로** — `.ios.tsx`/`.android.tsx`/`.web.tsx`로 분기하고,
  웹에 없는 native 모듈은 가드한다.
- **레이아웃은 safe area 인식** — `react-native-safe-area-context`의 `SafeAreaView`/`useSafeAreaInsets`로
  노치·홈 인디케이터를 피한다.
- **환경값은 `EXPO_PUBLIC_*` 또는 `expo-constants`(`app.config` `extra`)**로 주입한다 —
  `EXPO_PUBLIC_*`는 번들에 인라인되어 클라이언트에 노출됨을 전제로 한다.
- **리스트는 `FlatList`/`FlashList`로 가상화**하고 안정적인 `keyExtractor`를 준다.

## enforceable 행동 규칙

> 강제는 프로젝트 린터(ESLint·Biome 등)와 타입체커(`tsc`)가 하고 phase `acceptance`가 lint·typecheck를 돌리게 하라 — 특정 도구를 강제하지 않는다(커스텀 훅도 아니다). `[기계검증]` 표시는 그 자동 검증 후보다.
>
> 레이어·컨텍스트 경계는 **툴체인이 잡지 않는다** — tsc·Metro·eslint-config-expo 어느 것도
> 경계 위반을 에러로 만들지 않는다(도메인에 react-native import, application에 어댑터
> import, 타 컨텍스트 관통 전부 통과 실측). 아래 `[기계검증]` grep이 유일한 방어선이다.
> 명령의 `$G`는 `grep -rnE --include='*.ts' --include='*.tsx' --exclude-dir=__tests__ --exclude='*.test.ts' --exclude='*.test.tsx'`의
> 약어다(실행 전 그대로 치환한다 — 테스트 파일은 어댑터를 테스트 더블로 import해도 되므로
> 검사 대상이 아니다). `{domain}`·`{other}`는 실제 컨텍스트 이름으로 치환해 도메인마다
> 반복하고, 기대치는 모두 **0건**이다. 패턴이 줄 머리의 `import`/`export`/`}`에 앵커돼 있어
> 주석·문자열 리터럴 안의 `from '…'`는 세지 않는다 — 단 여러 줄 블록 주석으로 통째로 주석
> 처리한 import 블록은 잡히니 그런 잔재를 두지 마라.

- **domain 레이어에서 `react-native`·`expo*`·서드파티 라이브러리를 import하지 말고, 자기
  컨텍스트의 `application/`·`infrastructure/`·`presentation/`로도 올라가지 마라.** 이유:
  프레임워크 결합으로 웹/네이티브/Node 어디서든 평가 가능해야 할 순수 규칙이 플랫폼에
  묶이고, 안쪽 레이어가 바깥을 알면 의존 방향이 뒤집힌다 — 툴체인이 잡지 않아 grep이 유일한
  방어선이다. 도메인은 상대경로와 `@shared/domain/*`만 import한다. [기계검증]
  (① 순수성 — 정적 import·`export … from`·부수효과 import·동적 `import()`·`require()` 전부:
  `$G "^\s*(import\b|export\b|[}])[^'\"]*\bfrom\s*['\"]|^\s*import\s*['\"]|\b(import|require)\(\s*['\"]" src/{domain}/domain src/shared/domain | grep -vE "['\"](\.\.?/|@shared/domain/)"`
  ② 레이어 방향 — 상대경로·별칭·배럴(`…/infrastructure'`) 전부:
  `$G "^\s*(import\b|export\b|[}])[^'\"]*\bfrom\s*['\"]([^'\"]*/)?(application|infrastructure|presentation)(/|['\"])|\b(import|require)\(\s*['\"]([^'\"]*/)?(application|infrastructure|presentation)(/|['\"])" src/{domain}/domain`)
- **application에서 `infrastructure/`·`presentation/`·프레임워크를 import하지 마라.** 이유:
  의존 역전이 깨져 포트가 장식이 된다 — use case가 어댑터를 기본값으로 품으면 tsc는
  통과하지만 결선이 두 곳이 된다. use case는 포트 타입으로만 의존하고 결선은 모듈 파일이
  한다. [기계검증]
  (① 레이어 방향 — 별칭·상대·배럴·동적 import 전부:
  `$G "^\s*(import\b|export\b|[}])[^'\"]*\bfrom\s*['\"]([^'\"]*/)?(infrastructure|presentation)(/|['\"])|\b(import|require)\(\s*['\"]([^'\"]*/)?(infrastructure|presentation)(/|['\"])" src/{domain}/application`
  ② 프레임워크 패키지(`import type` 포함):
  `$G "^\s*(import\b|export\b|[}])[^'\"]*\bfrom\s*['\"](react(-native|-dom)?|expo(-[a-z-]+)?|@expo|@react-native[a-z-]*)(/|['\"])|^\s*import\s*['\"](react(-native|-dom)?|expo(-[a-z-]+)?|@expo|@react-native[a-z-]*)(/|['\"])|\b(import|require)\(\s*['\"](react(-native|-dom)?|expo(-[a-z-]+)?|@expo|@react-native[a-z-]*)(/|['\"])" src/{domain}/application`)
- **타 컨텍스트의 내부(entities·use-cases·구현 클래스·화면)를 직접 import하지 마라.** 이유:
  바운디드 컨텍스트 경계가 무너져 도메인이 서로의 세부에 결합된다. 허용되는 관통은
  둘뿐 — ACL 어댑터(공급 도메인의 포트 *타입*)와 소비 도메인 모듈 파일(공급 도메인 모듈
  파일의 포트 *인스턴스* 결선). 별칭 접두(`@{other}/`)만 검색하면 스캐폴드 `@/*` 별칭
  (`@/{other}/…`)과 얕은 상대경로(`../{other}/…`)가 우회한다(실측) — 경로 세그먼트로
  검색한다. 자기 도메인 안에 타 도메인 이름의 하위 디렉터리를 두지 마라 — grep이 관통으로
  본다(`browser/`·`end-user/` 같은 부분 문자열은 안전하다). [기계검증]
  (① 어댑터·모듈 파일 밖 — `@{other}/`·`@/{other}/`·`../{other}/`·`'{other}/'`·부수효과·동적 import 전부:
  `$G --exclude-dir=adapters --exclude='{domain}.module.ts' "^\s*(import\b|export\b|[}])[^'\"]*\bfrom\s*['\"]([^'\"]*[^A-Za-z0-9_'\"-])?{other}/|^\s*import\s*['\"]([^'\"]*[^A-Za-z0-9_'\"-])?{other}/|\b(import|require)\(\s*['\"]([^'\"]*[^A-Za-z0-9_'\"-])?{other}/" src/{domain}`
  ② 어댑터 안에서는 공급 도메인 포트의 `import type`만:
  `$G "^\s*(import\b|export\b|[}])[^'\"]*\bfrom\s*['\"]([^'\"]*[^A-Za-z0-9_'\"-])?{other}/|^\s*import\s*['\"]([^'\"]*[^A-Za-z0-9_'\"-])?{other}/|\b(import|require)\(\s*['\"]([^'\"]*[^A-Za-z0-9_'\"-])?{other}/" src/{domain}/infrastructure/adapters | grep -vE "^[^:]*:[0-9]+:\s*import\s+type\b[^'\"]*['\"]@{other}/application/ports/"`
  ③ 모듈 파일 안에서는 공급 도메인 모듈 파일만:
  `grep -nE "^\s*(import\b|export\b|[}])[^'\"]*\bfrom\s*['\"]([^'\"]*[^A-Za-z0-9_'\"-])?{other}/|^\s*import\s*['\"]([^'\"]*[^A-Za-z0-9_'\"-])?{other}/|\b(import|require)\(\s*['\"]([^'\"]*[^A-Za-z0-9_'\"-])?{other}/" src/{domain}/{domain}.module.ts | grep -vE "['\"]@{other}/{other}\.module['\"]"`)
- **`shared/`에서 도메인을 import하지 마라.** 이유: shared는 어떤 도메인도 몰라야 단방향이
  유지된다 — 공용 UI·루트 레이아웃이 도메인 화면을 import하는 순간 shared가 두 번째
  컴포지션 루트가 된다. [기계검증] (각 도메인 이름을 `{other}`에 넣어 — 예외 없이 0건:
  `$G "^\s*(import\b|export\b|[}])[^'\"]*\bfrom\s*['\"]([^'\"]*[^A-Za-z0-9_'\"-])?{other}/|^\s*import\s*['\"]([^'\"]*[^A-Za-z0-9_'\"-])?{other}/|\b(import|require)\(\s*['\"]([^'\"]*[^A-Za-z0-9_'\"-])?{other}/" src/shared`)
- **타 컨텍스트 모듈 파일에서 use case 인스턴스를 import하지 마라.** 이유: 공급 도메인의
  커맨드를 타 컨텍스트가 직접 호출하게 되고, 포트 인스턴스와 같은 파일에서 나오므로
  grep이 정상 ACL과 구분하지 못한다(실측). 타 컨텍스트가 가져갈 수 있는 것은 포트 타입
  인스턴스뿐이다 — 코드 리뷰로 지킨다.
- **`src/app/**`에 import 문·`export *`·함수/클래스/상수 정의를 두지 마라.** 이유: 셸에
  화면이 살면 "이름만 domain-first"가 된다(스캐폴드 `index.tsx`·`explore.tsx`가 그 상태) —
  전 파일이 셸이며 예외 목록이 없다. 홈·404·루트 레이아웃도 `shared/presentation/` 실체를
  re-export한다. [기계검증]
  (① `grep -rlE --include='*.ts' --include='*.tsx' "^\s*import\b" src/app` 0건 — 셸은 import 문이 없다
  ② `grep -rnE --include='*.ts' --include='*.tsx' "^\s*export\s+\*" src/app` 0건
  ③ `grep -rnE --include='*.ts' --include='*.tsx' "^\s*(export\s+)?(default\s+)?(async\s+)?(function|class|const|let|var)\b|^\s*export\s+default\b" src/app` 0건 —
  export 없는 최상위 정의와 `export default Ident`까지 잡는다. expo 셸에는 상수 정의 예외가 없다)
- **화면·레이아웃에서 리포지토리 포트·인스턴스를 직접 소비하지 마라.** 이유: use case를
  우회한 두 번째 진입점이 생겨 규칙이 흩어진다(nestjs "컨트롤러에 포트 직접 주입 금지"의
  대응). 목록 화면이 `findAll`을 부르고 싶으면 `list-*` use case를 만든다. [기계검증]
  (import 문(여러 줄 포함)에서 `…Repository`/`…RepositoryPort` 심볼을 가져오는 줄만 센다 — 주석·JSX 텍스트의 "repository"는 세지 않는다:
  `$G "^\s*import\b[^'\"]*[Rr]epository[^'\"]*\bfrom\b|^\s*[A-Za-z]*[Rr]epository(Port)?\s*,?\s*$" src/*/presentation src/shared/presentation` — 기대 0건)
- **`presentation/api/**`(`+api.ts` 핸들러 실체)를 `+api.ts` 셸 외의 파일에서 import하지
  마라.** 이유: "비밀은 `+api.ts`에 두면 클라이언트 번들에 안 실린다"는 공식 보장이
  실체를 옮기는 순간 "클라이언트 코드가 그 모듈을 import하지 않는 한"으로 약화된다(실측 —
  셸 re-export 상태에서는 클라이언트 번들에 핸들러·비밀이 0건). 화면이 API 핸들러 모듈을
  import하면 서버 전용 코드와 비밀이 클라이언트 번들로 간다. [기계검증]
  (`api/{name}.api` 모듈을 가져오는 import 중 `src/app/**/*+api.ts` 셸 밖의 것 — 상대경로·별칭 모두:
  `$G "^\s*(import\b|export\b|[}])[^'\"]*\bfrom\s*['\"]([^'\"]*/)?api/[^'\"]*\.api['\"]|\b(import|require)\(\s*['\"]([^'\"]*/)?api/[^'\"]*\.api['\"]" src | grep -vE "^src/app/[^:]*\+api\.ts:"` — 기대 0건)
- **라우트 루트를 `src/app`에서 바꾸지 마라(플러그인 `root` 옵션).** 이유: 동작은 하지만
  공식 문서가 강하게 비권장하고 커스텀 루트 프로젝트의 버그 리포트를 받지 않는다.
  `src/app`은 `app`보다 우선하므로 둘을 같이 두지도 마라.
- **인프라 어댑터·도메인 모듈 파일의 모듈 최상위에서 네이티브 모듈·플랫폼 API에 접근하지
  마라.** 이유: `web.output: "static"` export는 presentation → 모듈 파일 → infrastructure 전체
  import 그래프를 Node에서 모듈 최상위까지 평가한다(`typeof window`가 `undefined`, 실측).
  접근은 함수 안으로 지연하거나 `Platform` 가드를 둔다.
- **스캐폴드의 `@/*`(`./src/*`) 별칭을 남겨두지 마라.** 이유: `@/{other}/…`가 두 번째
  크로스 컨텍스트 경로가 되어 별칭 접두 grep을 우회한다(실측 — tsc·export 전부 통과).
  비도메인 자산은 `@/assets/*`만 남긴다. `paths`만 쓴다(`baseUrl`은 TS 6에서 deprecated).
- **비밀(액세스 토큰, 비밀번호)을 AsyncStorage에 평문 저장하지 마라.** 이유: 암호화되지 않아
  기기에서 추출 가능하다 — `expo-secure-store`를 써라.
- **권한 확인·요청 없이 native API(카메라, 위치, 알림)를 호출하지 마라.** 이유: iOS는 크래시하거나
  조용히 거부한다. 요청하고 denied 경로를 처리하라.
- **`EXPO_PUBLIC_*`에 비밀을 넣지 마라.** 이유: 빌드 시 JS 번들에 그대로 인라인되어 노출된다.
  비밀은 서버/보안 저장소에만. [기계검증] (`EXPO_PUBLIC_*` 값에 key/secret/token grep)
- **웹/네이티브 전용 API를 플랫폼 가드 없이 쓰지 마라**(`localStorage`/DOM, 또는 웹에 없는 native
  모듈). 이유: 다른 플랫폼에서 런타임 크래시. `Platform.OS`나 접미사로 분기하라.
- **테스트 파일(`*.test.*`·`*.spec.*`·`__tests__/`)을 `src/app/` 아래 어디에도 두지 마라.** 이유:
  expo-router가 이를 라우트로 취급한다(무시 목록은 `+html`·`+native-intent`·`+api`·`+middleware`뿐).
  라우트 루트 밖 실체 옆 `__tests__/`에 둬라. [기계검증]
  (`find src/app \( -name '*.test.*' -o -name '*.spec.*' -o -name '__tests__' \)` — 기대 0건)
- **리스트(`FlatList`/`FlashList`) `renderItem`·렌더 핫패스에서 인라인 함수/객체를 매번 새로 만들지 마라.**
  이유: 불필요한 리렌더·GC 압박 — 특히 `FlashList` v2는 재렌더에 더 엄격해 row를 `React.memo`로 감싸고
  `renderItem`·전달 props를 메모이즈해야 한다(재활용 시 row가 다른 item으로 다시 렌더된다). `useCallback`/모듈
  상수로 안정화하되 적용 전후 성능을 측정하라.

## 스택별 흔한 Edge Case

- **typed routes 타입은 `expo export`가 생성하지 않는다** — `.expo/types/router.d.ts`·
  `expo-env.d.ts`는 `expo start` 또는 `expo customize tsconfig.json`이 만든다. AC·CI는
  `npx expo customize tsconfig.json` → `npx tsc --noEmit` 순서로 돌려라 — 순서를 바꾸면
  타입 부재로 tsc가 실패한다. customize는 기존 `tsconfig.json`을 바이트 단위로 보존하며
  멱등이다(커스텀 `paths` 유지). 생성물은 커밋하지 않는다.
- **정적 export는 Node에서 모듈 최상위를 평가한다** — `generateStaticParams`가 있든 없든
  모든 라우트가 Node에서 렌더되며 어댑터·모듈 파일의 최상위 부수효과(시드·네이티브
  초기화·`console` 마커)가 빌드 로그에 그대로 실행된다. `generateStaticParams`를
  클라이언트 번들에서 제거하는 변환도 없다 — 화면 파일의 그 함수와 import는 클라이언트
  번들에도 실리니 비밀·서버 전용 의존을 두지 마라.
- **라우트 `ErrorBoundary`는 클라이언트 런타임 전용** — dev SSR·정적 export HTML은 throw한
  라우트를 dev 에러 토스트로 내보내고 바운더리를 렌더하지 않는다(셸에 인라인 정의해도
  동일 — re-export 때문이 아니다). 에러 UI 검증은 jest-expo `renderRouter`로만 하고 SSR
  HTML을 근거로 쓰지 마라.
- **jest-expo `renderRouter`는 `@testing-library/react-native` 13.x가 필요하다** —
  `expo install --dev`가 뽑는 14.x는 render 결과에 쿼리(`findByText` 등)가 없어 실패한다.
  13.x로 고정하고 `react-test-renderer`는 `react`와 같은 버전으로 맞춰라. jest-expo는
  tsconfig `paths`를 `moduleNameMapper`로 자동 변환하므로 별칭 설정을 따로 두지 않는다.
- **컨텍스트 간 `href` 문자열 결합은 import grep에 보이지 않는다** — typed routes가 타
  컨텍스트 경로를 타입으로 허용한다. URL 문자열 결합은 ACL 대상이 아니며 허용하되,
  라우트 경로 상수는 해당 컨텍스트의 presentation에 두어 셸 rename 시 한 곳만 고치게
  하라(미실측 처방).
- **`@{domain}/*` 별칭은 동명 npm 스코프를 가린다** — Metro의 paths resolver가
  node_modules 해석보다 먼저 매칭되고 node_modules 출처 모듈에는 적용되지 않는다. 도메인
  이름이 실제 스코프 패키지(`@user/…` 등)와 겹치면 앱 코드에서 그 패키지에 닿을 수 없다.
- **`+api.ts`는 `web.output: "server"`에서만 산다** — `"static"`에서는 API 라우트가
  빌드되지 않는다. 파일명에 플랫폼 접미사를 붙일 수 없다.
- **dev SSR과 정적 export는 같은 결과를 낸다** — re-export 셸에 dev/build 차이·라우트
  검증 경고가 없다. 단 `CI=1`로 dev 서버를 띄우면 파일 감시가 꺼져(`reloads are disabled`)
  변경마다 재기동해야 한다.
- **경계 린트 승격** — eslint-config-expo에는 경계 규칙이 없다. `eslint-plugin-import`가
  의존성이므로 `import/no-restricted-paths`를 켜면 위 grep을 린트로 올릴 수 있다(미실측).
- **Fast Refresh와 re-export 셸** — 런타임 훅이 모듈 exports 객체에서 특수 심볼을 읽는
  구조라 re-export도 통과할 것으로 보이나 (미실측).
- **NativeTabs 루트** — `expo-router/ui` Tabs 루트의 오렌더는 실측했지만 NativeTabs
  네이티브 런타임은 (미실측). 루트를 Stack으로 두면 문제 자체가 없다.
- **권한 거부/제한** — granted 외에 denied·undetermined·`canAskAgain: false`(영구 거부)를 분기하고
  설정 안내로 폴백.
- **네트워크 실패/오프라인** — RN `fetch`는 기본 타임아웃이 없다. `AbortController`로 타임아웃을 걸고
  오프라인·재시도를 다뤄라.
- **저장소 실패** — AsyncStorage/SecureStore는 `null` 반환·예외가 가능하다. 첫 실행 미존재 키를 가정에 넣지 마라.
- **키보드/safe area** — `KeyboardAvoidingView`는 iOS/Android 동작이 다르다(`behavior` 분기). 입력 가림 방지.
- **딥링크·콜드 스타트** — 앱이 죽은 상태에서 링크로 진입하면 초기 파라미터가 비동기로 도착할 수 있다.
- **빈 리스트/대용량 리스트** — `ListEmptyComponent`로 빈 상태를, 가상화로 스크롤 성능을 보장.
- **플랫폼 부재 모듈** — Expo Go vs dev build, 웹에서 빠진 native 모듈을 옵셔널 체크로 가드.

## 안티패턴

- **셸에 화면 실체** — 스캐폴드 `src/app/index.tsx`·`explore.tsx`를 그대로 두거나 셸 파일에
  컴포넌트를 정의. 도메인 라우트만 re-export고 나머지는 화면이면 "이름만 domain-first"다.
  `shared/presentation/screens/`로 옮기고 re-export하라.
- **use case 우회** — 화면이 모듈 파일에서 리포지토리 인스턴스를 import해 `findAll()`을
  직접 호출. use case 진입점이 둘이 된다 — `list-*` use case를 만들어라.
- **ACL 없는 지름길** — 타 컨텍스트 모듈 파일에서 use case 인스턴스를 가져다 호출하거나,
  `@/{other}/…`·`../{other}/…`로 타 컨텍스트 내부에 도달. 어댑터 한 겹을 아끼려다 컨텍스트
  경계가 사라지고 grep에도 안 잡힌다.
- **크로스 결선을 생성자 기본값에 숨기기** — ACL 어댑터가 공급 도메인 포트 인스턴스를
  기본 인자로 import. 소비 도메인 모듈 파일에 관통 흔적이 남지 않는다 — 모듈 파일에서
  명시 주입하라.
- **컨테이너 객체 export** — 모듈 파일이 `{ userRepository, getUser }` 한 덩어리를 export.
  어느 심볼이 포트이고 어느 것이 use case인지 파일 표면에서 읽히지 않는다 — 하나씩
  named export하라.
- **루트 Tabs + 미선언 도메인 라우트** — 정적 export가 index 탭 내용을 조용히 내보낸다.
  루트는 Stack, 탭은 `(tabs)/` 그룹 하위.
- **어댑터 모듈 최상위 네이티브 접근** — 정적 export가 Node에서 평가하다 죽는다. 함수
  안으로 지연하라.
- **커스텀 라우트 루트** — 플러그인 `root` 옵션으로 `src/app`을 옮기기. 공식 비권장이며
  버그 리포트가 거부된다.
- **대용량 리스트를 `ScrollView`+`map`으로 렌더** — 전부 마운트되어 메모리·프레임 드랍. `FlatList`/`FlashList`로 가상화하라.
- **저장소를 동기 가정으로 접근** — 모든 read/write는 `await`하고 실패를 처리하라.
- **타입 없는 전역 navigation/params** — expo-router의 타입드 라우트·파라미터를 활용하라.
- **플랫폼 분기를 컴포넌트 전반에 산재** — `.ios`/`.android` 파일이나 한 곳의 `Platform.select`로 모아라.
- **프로덕션 핫패스의 `console.log`** — JS 브리지 비용을 유발한다.
