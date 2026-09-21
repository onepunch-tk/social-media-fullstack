# CA 리뷰 — 2026-09-21 — auth 슬라이스: AccessTokenGuard · @Public · @CurrentAccountId (2차)

**범위**: apps/api · `auth` 슬라이스 + `shared/presentation/` + `post` 스텁 + `packages/schemas` · 파일 39개 (`git diff HEAD`, 신규 24 · 수정 14 · 삭제 1). 같은 working tree의 2차 리뷰 — [1차](2026-09-21-auth-session.md) 이후 변경분(Guard·데코레이터·결선·1차 반영)에 집중.
**기계검증**: boundary 23/25 (FAIL 2건 모두 `access-token.guard.ts` — §먼저 볼 것 1) · lint ❌ (7건, 전부 `drizzle/meta/*.json` Biome 포맷 — 소스 0건) · typecheck ❌ (2건, 전부 기존 `test/health.e2e-spec.ts`; 1차의 `auth.controller.ts` 오류는 해결) · test — (미실행: 사용자 요청으로 테스트는 이번 리뷰 제외)
**한 줄 총평**: 1차 지적 10건 중 7건이 정확히 반영됐다. 이번에 배울 것은 하나 — **`try { return promise }`는 catch를 타지 않는다**. 1차에서 질문으로 남긴 `verify()`가 그대로인 채로, 같은 모양이 `RefreshSessionHandler`에 하나 더 생겼고, Guard가 그 `verify()`의 첫 소비자가 되면서 "만료된 access token → 500"이 실제 경로가 됐다.

> 사용자 메모: 테스트 코드는 고의로 미작성 — 리뷰 제외.

## 먼저 볼 것

### 1. 🔴 Guard가 use case의 일을 한다 — 리포지토리 포트 주입 + 도메인 VO 생성
- 위치: `apps/api/src/auth/presentation/guards/access-token.guard.ts:12` (`AccountId` import) · `:22` (`ACCOUNT_REPOSITORY` 주입) · `:40` (`new AccountId(claims?.sub)` + `findById`)
- 규칙: nestjs.md › enforceable › "컨트롤러에서 도메인 엔티티·애그리게잇을 import·반환하지 마라 … 도메인 엔티티 타입은 presentation에서 DTO 파일만 import한다" · nestjs.md › 관용구 › VO 생성 위치 › "presentation은 VO를 모른다" · ARCHITECTURE.md › apps/api › Layer Map › Presentation › "얇은 HTTP 표면 — 버스 디스패치 중심(웹훅 등 raw body 작업만 포트 직접 소비)"
- 왜: "use case를 우회한 두 번째 진입점이 생겨 규칙이 흩어진다" (nestjs.md › enforceable › 컨트롤러에 포트·리포지토리·핸들러를 직접 주입하지 마라). 포트와 VO가 필요해진 것은 원인이 아니라 **증상**이다 — Guard가 "계정 조회"라는 use case 크기의 일을 떠안았기 때문에 그 일에 필요한 도구가 따라 들어왔다.
- 참고: boundary FAIL 2건 중 `:20-21`(`Reflector`·`ACCESS_TOKEN_SIGNER`)은 1차 후속에서 합의한 예외다 — 토큰 검증은 횡단 관심사이고, 그 답도 "verify → null이면 401 → `request.accountId = claims.sub`"까지였다. 스크립트 규칙 문구가 "컨트롤러"라 Guard는 글자 그대로는 오탐이지만, `:22`와 `:12`는 그 합의 밖이다.
- 생각해볼 것: `request.accountId`에 담기는 값 — `account.id.value`와 `claims.sub` — 이 둘이 **다를 수 있는** 경우가 있는가? 없다면 DB 왕복은 무엇을 검증한 것인가? "삭제된 계정의 남은 15분"을 막는 것이 요구사항이라면, 그 규칙은 Guard·핸들러·도메인 중 어디에 있어야 spec이 지켜줄 수 있는가? 그 규칙이 정말 필요하다면 Guard는 리포지토리 대신 무엇을 통해 물어봐야 하는가(힌트: 컨트롤러가 핸들러 대신 무엇을 통하는가)?

### 2. 🟡 죽어 있는 catch 두 곳 — `try { return promise }`
- 위치: `apps/api/src/auth/infrastructure/adapters/jwt-access-token-signer.adapter.ts:24` (1차와 동일, 미수정) · `apps/api/src/auth/application/use-cases/refresh-session/refresh-session.handler.ts:32` (신규)
- 규칙: apps/api/AGENTS.md › 레이어 규칙 › infrastructure › "실패는 throw하지 말고 포트가 정의한 결과 타입으로 반환한다" (`verify`) · nestjs.md › 관용구 › 예외는 레이어 소유 › "application은 애플리케이션 예외(+분류 코드)를 던지고, 전역 exception filter가 HTTP 상태로 매핑한다" (핸들러 — `RefreshTokenAlreadyRotatedError`는 포트 수준 `Error`라 filter에 오면 500)
- 왜: 1차 후속에서 "`try` 안에서 `return`된 Promise는 언제 평가되는가?"를 물었다 — 답은 "try 블록을 빠져나간 뒤"다. 그래서 reject는 catch를 지나쳐 호출자에게 간다. 결과: ① 만료·위조 access token → `TokenExpiredError`/`JsonWebTokenError`가 Guard를 뚫고 filter로 → **500 INTERNAL_ERROR** ② refresh 회전 레이스 → `RefreshTokenAlreadyRotatedError` → **500**. 두 경로 모두 설계 의도는 401이다.
- 생각해볼 것: `return await`와 `return`의 차이가 **의미를 바꾸는** 유일한 자리가 어디인가? 어댑터의 `sign()`은 같은 모양인데 왜 거기서는 문제가 아닌가? 이 두 함수의 catch가 실행되는 것을 확인할 가장 짧은 방법은 무엇인가(테스트 제외라면 curl 한 줄이면 된다 — 어떤 토큰을 보내면 되는가)?
- ↻ 2회째 (직전: 2026-09-21 — `verify()` 동일 지적, 원리는 후속 Q&A에서 질문으로 제시됨)

### 3. 🟡 `claims?.sub` — 잘못된 토큰이 "존재하지 않는 사용자"로 둔갑한다
- 위치: `apps/api/src/auth/presentation/guards/access-token.guard.ts:39-42`
- 규칙: typescript.md › 안티패턴 › "깊은 옵셔널 체이닝으로 에러 삼키기 — `a?.b?.c ?? fallback`이 실제 버그(상류 null)를 가린다" · typescript.md › 관용구 › "상태는 discriminated union으로 모델링한다 … `switch (s.kind)`로 좁힌다"
- 왜: 포트 계약 `AccessTokenClaims | null`에서 `null`은 "토큰이 유효하지 않다"는 **결과**다. `?.`는 그 결과를 `undefined`로 바꿔 다음 줄로 넘기고, `UniqueId`의 `constructor(id?: string)`는 `undefined`를 받으면 `randomUUID()`를 만든다(`unique-id.vo.ts:9`). 즉 §2가 고쳐져 `verify`가 `null`을 돌려주는 순간, 무작위 UUID로 DB를 한 번 조회한 뒤 "존재하지 않는 사용자입니다"가 나간다 — 틀린 메시지 + 불필요한 쿼리, 그리고 `?.` 덕에 tsc는 침묵한다.
- 생각해볼 것: `verify`가 `null`을 돌려줬을 때 이 Guard가 해야 할 일은 무엇이고, 그 분기는 지금 코드의 몇 번째 줄에 있어야 하는가? `claims`를 `?.` 없이 쓰면 tsc가 무엇을 말해주는가 — 그 오류가 곧 빠진 분기 아닌가?

## 나머지

- 🟡 **presentation이 application의 예외를 던진다** — `access-token.guard.ts:34-37`, `:42` `new ApplicationException('UNAUTHORIZED', …)`. 규칙: nestjs.md › 관용구 › 예외는 레이어 소유 › "application은 애플리케이션 예외(+분류 코드)를 던지고 … `HttpException` 서브클래스는 presentation 전용이다". 왜: 예외 클래스는 그 레이어의 어휘다 — 바깥 레이어가 안쪽 어휘로 말하면 filter의 분기가 "어느 레이어에서 왔는가"를 잃는다. 1차 후속 답도 "`UnauthorizedException`(presentation이라 `HttpException` 허용)"이었다. 생각해볼 것: `api-exception.filter.ts:57`의 `HTTP_STATUS_TO_CODE[401]`은 무엇인가 — `UnauthorizedException(message)`를 던지면 응답 body가 지금과 무엇이 달라지는가? 참고로 boundary FAIL의 `:13` 줄이 이 항목이다.
- 🟡 **`@Throttle`은 여전히 읽어줄 Guard가 없다** — `auth.controller.ts:25`. `grep -rn Throttler apps/api/src` 결과 0건 — `ThrottlerModule.forRoot`도 `ThrottlerGuard`도 없다. 규칙: nestjs.md › edge case › "전역 pipe/filter/guard 등록 — … DI가 필요하면 `APP_PIPE` provider로 등록하라". 왜: 데코레이터는 메타데이터를 붙일 뿐이다 — `AccessTokenGuard`를 `APP_GUARD`로 등록한 것과 **같은 손놀림**이 하나 더 필요하다. 생각해볼 것: 이번에 `@Public()`이 동작하게 만든 세 조각(메타데이터 키·데코레이터·읽는 Guard·등록)을 `@Throttle`에 대응시키면 무엇이 비는가? ↻ 2회째 (직전: 2026-09-21)
- 🟡 **자기 도메인 안에서 별칭** — `access-token.guard.ts:4-12`(`#auth/…` 3개), `session-issuer.service.ts:2-3`, `login-account.handler.ts:3-11`, `refresh-session.handler.ts:3-11`, `auth.controller.ts:4-5`는 `#auth/`, `:7`은 `../` — 같은 파일 안에서 두 방식이 섞였다. 규칙: apps/api/AGENTS.md › ESM 규칙 › "도메인 안에서는 상대경로, 컨텍스트 경계를 넘을 때(`health` → `shared`)만 별칭". 왜: 경계 grep은 `#auth/` 접두를 "auth 밖에서 온 import" 후보로 본다. 생각해볼 것: `auth.controller.ts:5`와 `:7`은 같은 디렉터리의 형제 파일을 가리킨다 — 둘 중 어느 쪽이 "이 파일은 auth 안에 있다"를 말해주는가? ↻ 2회째 (직전: 2026-09-21)
- 🟡 **`session-issuer.service.ts`의 자리** — `apps/api/src/auth/application/session-issuer.service.ts`. 1차 정답에서 `application/services/`로 옮기고 ARCHITECTURE 트리에 `services/`를 추가하라고 했는데 파일명만 바뀌고 자리는 application 루트 그대로다. 규칙: ARCHITECTURE.md › apps/api › Directory Tree › `application/{ports,use-cases/{verb-noun},queries/handlers,events,sagas}/`. ↻ 2회째 (직전: 2026-09-21 — **정답 공개됨**)
- 🟡 **`ConfigService`가 한쪽만 타입을 얻었다** — `jwt-access-token-signer.adapter.ts:14` `ConfigService`(제네릭 없음) vs `crypto-refresh-token-issuer.adapter.ts:12` `ConfigService<Env, true>`(수정됨). 규칙: apps/api/AGENTS.md › 환경 › "`ConfigService<Env, true>` 경유". 생각해볼 것: jwt 어댑터에도 제네릭을 붙이면 `:19` `expiresIn`에서 컴파일 에러가 날 것이다 — `JwtSignOptions.expiresIn`의 타입은 `StringValue | number`이고 `Env['JWT_ACCESS_EXPIRES_IN']`은 `string`이다. 그 에러는 어댑터의 문제인가, `env.schema.ts:17`이 "`15m` 형식"이라는 사실을 타입에 담지 못한 문제인가? 지금 제네릭을 뺀 것은 그 에러를 `any`로 지운 것과 같다(typescript.md › enforceable › "`any`를 쓰지 마라"). ↻ 2회째 (직전: 2026-09-21)
- 🟡 **주입 멤버에 `private` 누락** — `session-issuer.service.ts:26-28` 세 포트 전부, `register-account.handler.ts:21` `sessions`. 규칙: nestjs.md › 관용구 › "주입은 항상 토큰 + 포트 타입 — `@Inject(TOKEN) private readonly x: XxxPort`". `SessionIssuer.issuer` 같은 공개 필드는 핸들러가 서비스를 우회해 포트를 직접 부를 수 있는 문을 연다.
- 🔵 **`shared/presentation/`은 문서에 없는 자리** — `shared/presentation/decorators/{public,current-account-id}.decorator.ts` · `reqest.type.ts`. ARCHITECTURE 트리·Layer Map의 `shared/`는 `domain/`·`infrastructure/`뿐이고, 1차 후속 답은 `shared/infrastructure/http/`였다. 양쪽: `presentation`이라는 이름은 "HTTP 표면의 계약"이라는 뜻에 더 정확하고 filter가 `shared/infrastructure/filters/`에 있는 것과도 대칭이다(filter=인프라 결선, decorator=표면 계약) / 반대로 문서 트리에 없는 디렉터리는 다음 사람에게 "여기 둬도 되는가"를 매번 묻게 한다. 어느 쪽이든 ARCHITECTURE의 `shared/` 트리에 한 줄이 필요하다. 사소: 파일명 `reqest` 오타 · `AuthenticatedRequest.accountId: string`은 `@Public()` 라우트에서는 거짓이다(`CurrentAccountId`가 `undefined`를 `string`으로 돌려준다).
- 🔵 **`isPublic`의 타입** — `access-token.guard.ts:25` `getAllAndOverride(IS_PUBLIC, …)`의 결과 타입을 에디터에서 확인해 보라. NestJS 10+의 `Reflector.createDecorator<boolean>()`은 키·데코레이터·읽기 타입을 한 번에 묶는 대안이다 — 지금 방식(Symbol 키 + `SetMetadata`)도 동작하므로 취향.
- 🔵 **`post` 스텁** — `post/presentation/post.controller.ts:7` `authGuardTest`가 문자열을 반환하고 `post.module.ts`는 providers 0, `#post/*` 별칭은 두 곳 다 없다(app.module이 상대경로라 동작은 한다 — apps/api/AGENTS.md › 새 슬라이스 추가 절차 3). Guard 확인용이면 커밋 전에 지우거나, 그 확인을 e2e로 옮기는 것이 이 스텁의 수명이다.
- 🔵 **`.env.example`** — `:4` `/* … */`는 dotenv 주석이 아니다(`#`). `JWT_ACCESS_SECRET=`가 비어 있으면 `cp .env.example .env` 직후 `min(32)`로 부팅이 죽는다 — 루트 AGENTS.md 빠른 시작 절차와 충돌하니 절차에 "secret 생성" 한 줄을 넣거나 예시값을 두거나. ↻ (1차 사소)
- 🔵 **`86_400_400`** — `crypto-refresh-token-issuer.adapter.ts:15` 그대로. 하루 = 86,400,000ms. ↻ (1차 사소)
- 🔵 **사소** — `access-token.guard.ts:36` 토큰 자체가 없는데 "로그인이 만료되었습니다"(만료와 부재는 다른 상태) · `:50` `type === 'Bearer'` — RFC 6750은 scheme을 대소문자 무관으로 본다 · `session-issuer.service.ts:31-43` `issue()`가 `toSession()`을 안 쓰고 같은 조립을 반복 · `login-account.handler.ts:27-29` 계정 부재 시 `compare`를 건너뛰어 응답 시간이 갈린다(계정 존재 여부의 timing 노출 — 규칙 문서 밖) · `api-exception.filter.ts:58` 주석 `pipline`.

## 잘한 점

- 🟢 `auth.module.ts:45-48` — `APP_GUARD`를 `AuthModule`에 등록. 등록 모듈 컨텍스트에서 DI가 해석되므로 `ACCESS_TOKEN_SIGNER`를 export하지 않고도 주입된다. (nestjs.md › edge case › 전역 guard는 provider로 등록 — 1차 후속 결론 그대로)
- 🟢 `public.decorator.ts` — 메타데이터 키 `IS_PUBLIC` Symbol + `Public()` 팩토리를 한 파일에. 포트 파일의 "토큰 + 인터페이스 쌍"과 같은 구조라 읽는 쪽(`getAllAndOverride(IS_PUBLIC, …)`)이 키를 어디서 가져올지 명확하다. 기본 인증 + `@Public()` 예외 구조는 Guard 누락 실수를 구조적으로 없앤다.
- 🟢 `current-account-id.decorator.ts` — `createParamDecorator`로 request 접근을 한 곳에 가둬 컨트롤러가 `@Req()`를 만지지 않는다. `post.controller.ts:7`이 그 소비 예다.
- 🟢 `Command<AuthSession>` ×3 + `ICommandHandler<C>` 제네릭 하나 + 컨트롤러 `execute` 제네릭 0 — 1차 §2 정확히 반영. 컨트롤러의 `AuthSession` 값 import도 사라졌다.
- 🟢 `AccountDto implements Account` — register/login이 한 Schema를 공유, `confirmPassword`는 폼 계약으로 분리. 1차 §1 해결. (packages/schemas/AGENTS.md › 소비 규칙)
- 🟢 `use-cases/index.ts` 핸들러 3개 배열 상수 + `POST /auth/refresh` 디스패치. 1차 §3 절반 해결.
- 🟢 `SessionIssuer` `@Injectable()` + `issue`/`rotate` 분리 — 핸들러 생성자가 6→3개. 1차 정답 반영.
- 🟢 `refresh-token.entity.ts:14` `extends Entity` — `_id`·`equals` 재발명 제거. 1차 🔵 해결.
- 🟢 `drizzle-refresh-token.repository.adapter.ts:46` `toPersistence(): $inferInsert`. 1차 🟡 해결. (nestjs.md › 관용구 › 매핑)
- 🟢 `auth.module.ts:20` `JwtModule.register({})`만 남기고 providers의 중복 `JwtService` 제거. 1차 🔵 해결.
- 🟢 `account.schema.ts:9-24` 상수 4개 전부 `as const`. 1차 🟡 해결 — 기존 `AccountFieldsMessage`까지 같이 맞췄다.
- 🟢 `crypto-refresh-token-issuer.adapter.ts:12` `ConfigService<Env, true>` — 한쪽은 고쳤다. jwt 어댑터가 안 된 이유는 위 🟡 참조.

## 기존 문제 (이번 변경 밖 — 참고만)

- `test/health.e2e-spec.ts` — 삭제된 `#health/…` 참조로 typecheck 2건. 1차와 동일.
- `apps/api/AGENTS.md` · `docs/ARCHITECTURE.md` — 여전히 `health`를 템플릿으로 서술. `shared/presentation/`·`application/services/`가 생기면 함께 갱신 대상.
- `drizzle/meta/000{0-4}_snapshot.json` Biome 포맷 5건(생성 파일). `biome.json` `drizzle/` 제외 검토.
- `unique-id.vo.ts:12` UUID 패턴 검사 TODO — §3의 `new AccountId(undefined)`가 무작위 UUID로 통과하는 것도 여기서 막히지 않는다.

## 다음 단계

고친 뒤 `/ca-review`로 재검토. 막히면 "N번 힌트 더" 또는 "N번 정답".
권장 순서: §2(두 줄 수정으로 500→401) → §3(분기 하나) → §1(Guard의 책임 범위 결정 — §1 답에 따라 §3 코드가 달라진다) → 나머지 ↻ 항목.

---

## 후속 (2026-09-22) — 힌트: §1·§3 · 정답 공개됨: §1 + §3

- 힌트: §3의 `?.`는 §1의 `findById`가 만든 빚 — `null` 뒤에 먹일 것이 있으니 눌러서 통과시켰다. 1차 후속의 Guard 흐름(`verify → null이면 401 → request.accountId = claims.sub`)에는 `null` 뒤에 다음 줄이 없다.
- 사용자 질문: "DB에 실제로 존재하는 account인지 확인할 필요가 있지 않아?"

### §1 + §3 정답 — 존재 확인은 정책, Guard는 버스에 묻는다

원리: Guard의 횡단 관심사는 "토큰이 누구라고 말하는가"까지. `claims.sub`는 로그인 시 DB로 검증해 서명한 값이라 서명이 유효하면 값도 유효하고, 남는 위험은 "발급 후 15분 안에 계정 삭제"뿐이다. stateless(TTL까지 허용, refresh는 FK cascade로 즉시 차단, 쓰기 use case는 어차피 `findById`/FK에서 걸림) vs 매 요청 DB 1회 — 기본은 stateless. "탈퇴·정지 즉시 차단"이 요구사항이 되면 use case(query)로 만들어 Guard가 `QueryBus`로 디스패치한다 — 리포지토리·`AccountId`·`null` 분기는 핸들러에, Guard는 컨트롤러와 같은 규칙(버스만). `?.`는 두 경우 모두 사라진다: 포트의 `null`은 통과시킬 값이 아니라 401 분기다.

(a) stateless — Guard 주입은 `Reflector` + `ACCESS_TOKEN_SIGNER`뿐. `token` 없음 → `UnauthorizedException`, `verify` `null` → `UnauthorizedException`, 아니면 `request.accountId = claims.sub`. `ACCOUNT_REPOSITORY`·`AccountId`·`ApplicationException` import 삭제 → boundary FAIL 2건 해소. (§2 `return await` 별도 수정 필요)
(b) 존재 확인 필요 시 — `application/queries/verify-session.query.ts` `VerifySessionQuery extends Query<{ accountId: string } | null>` + 핸들러(signer.verify → null이면 null, `findById(new AccountId(claims.sub))` → 없으면 null). Guard는 `queryBus.execute(new VerifySessionQuery(token))` 결과 `null`이면 401.

일반화: Guard/Interceptor가 포트나 VO를 원하기 시작하면 use case가 숨어 있다 — 컨트롤러와 같은 규칙(버스만). `x?.y`가 포트의 `| null` 결과 바로 뒤에 붙어 있으면 그 `null`의 분기를 안 쓴 것이다.

참고: 이 시점에 `apps/api/AGENTS.md` ESM 규칙이 바뀜(확장자 없음 · 클래스 주입은 `@Inject` 없이 · `package.json` `imports` 제거) — 스니펫은 새 규칙 기준.

### 정답 공개됨 (2026-09-22) — §2 · Throttle · ConfigService · presentation 예외

- **§2 `try { return promise }`**: async 함수의 `return expr`는 평가만 하고 try를 빠져나가므로 reject가 catch를 지나친다. `return await`로 try 안에서 터뜨린다 — `verify()`·`RefreshSessionHandler` 두 곳. `sign()`은 catch가 없어 무관. 일반화: **try 안의 return은 await**.
- **Throttle**: `@Throttle`은 `SetMetadata`. 비어 있던 건 읽는 Guard와 설정 — `app.module.ts`에 `ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }])` + `{ provide: APP_GUARD, useClass: ThrottlerGuard }`. gotcha: 전역 guard 순서(Throttler가 AccessToken보다 먼저 — 429 확인) · `HTTP_STATUS_TO_CODE`에 429 없음 → `ApiErrorCode` 추가. 일반화: 데코레이터를 붙였으면 읽는 클래스 등록을 grep.
- **ConfigService**: `ConfigService<Env, true>` + `{ infer: true }`면 `expiresIn: StringValue | number` vs `string` 에러 — env 계약이 헐거운 것. `JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive()`로 숫자화(REFRESH_TOKEN_TTL_DAYS와 동형). 클래스 주입은 새 AGENTS.md대로 `@Inject` 없이. 일반화: 타입을 붙여 난 에러는 어느 계약이 거짓인지 가리킨다 — 제네릭 제거는 답을 지우는 것.
- **presentation 예외**: Guard는 `UnauthorizedException` — filter의 `HttpException` 분기가 401→`'UNAUTHORIZED'`, `message` 그대로라 body 동일. 일반화: presentation이 `#shared/domain/exceptions`를 import하면 방향 역전.
