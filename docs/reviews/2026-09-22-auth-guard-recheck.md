# CA 리뷰 — 2026-09-22 — auth 슬라이스 재검토 (3차): Guard → QueryBus · Throttler 결선 · swc 마이그레이션

**범위**: apps/api · `auth` + `shared/presentation/` + `post` 스텁 + `packages/schemas` + 툴체인(swc · 확장자 제거 · Biome) · 파일 80개 (`git diff HEAD`, 신규 26 · 수정 53 · 삭제 1). 같은 working tree의 3차 — [2차](2026-09-21-auth-guard.md) 정답 공개 이후 변경분에 집중. 툴체인 마이그레이션은 `apps/api/AGENTS.md`·ARCHITECTURE·ADR-002/004/005가 같이 갱신돼 새 규칙으로 판단했다.
**기계검증**: boundary 23/25 — FAIL 2건은 **스크립트가 구 규칙**(`.js` 확장자 필수 · `package.json` `imports` 필수)을 보는 오탐, 실 규칙 위반 0 · lint ❌ (7건, 전부 `drizzle/meta/*.json` — 소스 0건) · typecheck ❌ (2건, 기존 `test/health.e2e-spec.ts`) · test — (사용자 요청으로 제외)
**한 줄 총평**: 🔴 0. 2차의 🔴 1건·🟡 3건(§1·§3·예외)이 Guard 한 파일에서 동시에 풀렸고 Throttler·ConfigService·서비스 위치도 닫혔다. 남은 것은 **정답 스니펫 두 블록 중 한 블록**(`rotate`의 `await`)과, 세 번째로 나온 별칭 규칙 — 이건 이제 "코드를 고칠지 문서를 고칠지" 결정할 차례다.

## 먼저 볼 것

### 1. 🟡 `rotate()`의 catch는 아직 죽어 있다 — 정답의 두 블록 중 하나만 옮겨졌다
- 위치: `apps/api/src/auth/application/use-cases/refresh-session/refresh-session.handler.ts:32` `return this.sessions.rotate(current);`
- 규칙: nestjs.md › 관용구 › 예외는 레이어 소유 › "application은 애플리케이션 예외(+분류 코드)를 던지고, 전역 exception filter가 HTTP 상태로 매핑한다" — `RefreshTokenAlreadyRotatedError`는 포트 수준 `Error`라 catch를 못 타면 filter에서 500
- 왜: `verify()`(`jwt-access-token-signer.adapter.ts:24`)는 `return await`로 고쳤는데, 같은 정답 블록의 두 번째 스니펫인 이 줄은 그대로다. 회전 레이스(같은 refresh token을 동시에 두 번)에서 두 번째 요청이 401이 아니라 500이다.
- 생각해볼 것: 정답을 옮길 때 한 블록만 옮겨진 것을 tsc·Biome·boundary 중 무엇이 잡아주는가? 아무것도 아니라면 — 같은 refresh token으로 `curl … & curl … ; wait`를 한 번 돌려 보라. 두 번째 응답의 status와 `code`는 무엇인가?
- ↻ 3회째 (직전: 2026-09-22 — **정답 공개됨**, 해당 줄 코드 포함)

### 2. 🟡 자기 도메인 안 `#auth/` — 15개 파일, 이번 마이그레이션이 바꿀 기회였다
- 위치: `grep -rl '#auth/' apps/api/src/auth` → 15개 (`access-token.guard.ts:10`, `verify-session.handler.ts:6,10,11`, `session-issuer.service.ts:2-3`, 핸들러·커맨드 6개, 어댑터 3개, `auth.controller.ts:4-5`, `auth-session-response.dto.ts`, `refresh-token.repository.port.ts`)
- 규칙: apps/api/AGENTS.md › ESM 규칙 › "도메인 안에서는 상대경로, 컨텍스트 경계를 넘을 때(`health` → `shared`)만 `#shared/...` 별칭" — 마이그레이션으로 다시 쓴 AGENTS.md에도 이 문장은 그대로 남아 있다(92-93행)
- 왜: 경계 grep은 `#auth/` 접두를 "auth 밖에서 온 import" 후보로 본다. 이번 diff는 모든 import 줄을 만졌으면서(`.js` 제거) 별칭은 그대로 뒀다 — 세 번째 리뷰에서 같은 줄이 다시 나온다는 것은 규칙과 코드 중 하나가 거짓말하고 있다는 뜻이다.
- 생각해볼 것: 이 규칙을 지킬 생각인가, AGENTS.md 92행을 바꿀 생각인가? 셋째 선택지(둘 다 안 하기)의 비용은 리뷰마다 이 항목이 다시 나오는 것뿐이다. 문서를 바꾼다면 boundary-check의 "타 도메인 침범" grep은 무엇으로 `#auth/`의 안팎을 구분하게 되는가?
- ↻ 3회째 (직전: 2026-09-21)

### 3. 🟡 429는 `code: 'INTERNAL_ERROR'`로 나간다 — 와이어 계약에 rate-limit 코드가 없다
- 위치: `apps/api/src/shared/infrastructure/filters/api-exception.filter.ts:55-61` `HTTP_STATUS_TO_CODE`(429 없음 → `?? 'INTERNAL_ERROR'`) · `packages/schemas/src/api-error.schema.ts:3-10` `ApiErrorCodeSchema`
- 규칙: packages/schemas/AGENTS.md › 역할 › "API와 모바일이 함께 소비하는 **zod 와이어 계약의 단일 소스**" · nestjs.md › 관용구 › 예외는 레이어 소유 › "전역 exception filter가 HTTP 상태로 매핑한다"
- 왜: `ThrottlerGuard`를 켠 순간 `ThrottlerException`(429)이 실제로 나가기 시작했다. status는 429인데 body의 `code`는 "미분류 500"이라 모바일이 재시도 정책을 status와 code 중 무엇으로 판단하든 한쪽이 틀린다. Throttle 정답의 gotcha 두 번째 줄이 이 항목이었다.
- 생각해볼 것: `ApiErrorCodeSchema` enum에 값을 하나 추가하면 tsc가 어디까지 따라오는가 — `HTTP_STATUS_TO_CODE`는 `Partial<Record<…>>`라 누락을 잡는가? login에 6번 연속 요청했을 때 지금 body는 정확히 무엇인가?

## 나머지

- 🟡 **주입 멤버 `private` 누락** — `access-token.guard.ts:18` `readonly queryBus`, `verify-session.handler.ts:18` `readonly accountRepository`, `session-issuer.service.ts:24-26` 세 포트, `register-account.handler.ts:21` `sessions`. 규칙: nestjs.md › 관용구 › "`@Inject(TOKEN) private readonly x: XxxPort`". 새로 쓴 파일 두 개에서도 반복됐다 — 손이 기억하는 형태가 `readonly`뿐인 것 같다. ↻ 2회째 (직전: 2026-09-21)
- 🟡 **타입을 값으로 import** — `verify-session.handler.ts:2` `IQueryHandler`(같은 줄 `QueryHandler`는 값이 맞다), `:12` `VerifiedSession`, `jwt-access-token-signer.adapter.ts:8` `import { Env }`(마이그레이션 전엔 `import type`이었다). 규칙: ARCHITECTURE.md › apps/api › ESM 규칙 › "타입만 쓰는 참조(포트 인터페이스, DTO 타입)는 `import type`" · typescript.md › 관용구 › "타입 전용 import는 `import type`". 왜: 이번 마이그레이션이 Biome `useImportType`을 **전역 off**로 바꿨다 — 이 규칙은 이제 기계가 안 잡는다. 생각해볼 것: 마이그레이션 전 Biome은 이 세 줄 중 몇 개를 잡았을까? 지금 남은 방어선은 무엇인가?
- 🟡 **`verify()`의 `getOrThrow`에 `{ infer: true }` 없음** — `jwt-access-token-signer.adapter.ts:25`. `sign()`(`:19-20`)은 붙였다. 제네릭이 있어도 `infer` 없이는 반환이 `any`다(typescript.md › enforceable › `any`). 규칙: apps/api/AGENTS.md › 환경 › `ConfigService<Env, true>` 경유. ↻ 3회째 (직전: 2026-09-22 — 정답 공개됨)
- 🔵 **boundary-check 스크립트가 구 규칙** — `.claude/skills/ca-review/scripts/boundary-check.sh`의 "상대 import `.js` 확장자" 검사와 "`package.json` `imports` 양쪽" 검사는 새 AGENTS.md와 반대다. 이 스킬은 `docs/reviews/`만 쓰므로 여기서 고치지 않았다 — 요청하면 갱신한다. 갱신 전까지 이 두 FAIL은 무시.
- 🔵 **ARCHITECTURE api 절 미갱신** — 툴체인 부분은 갱신됐지만 `application/services/`, `application/queries/index.ts`(템플릿은 `queries/handlers/index.ts`), `shared/presentation/`은 api 트리·Layer Map·File Location Summary에 없다(grep 결과는 전부 mobile 절). 1차·2차에서 "문서에 한 줄"로 미뤄둔 것들.
- 🔵 **전역 guard 순서** — `ThrottlerGuard`(AppModule)와 `AccessTokenGuard`(AuthModule). Nest는 모듈 스캔 순서(루트 → imports)로 `APP_GUARD`를 모으므로 Throttler가 먼저일 것이다 — login 6회에서 429가 401보다 먼저 오는지로 확인.
- 🔵 **존재 확인을 (b)로 결정** — `VerifySessionHandler`가 매 인증 요청마다 `findById` 1회. 2차 정답의 트레이드오프 표에서 오른쪽 열을 고른 것 — 설계로 성립한다. 비용이 보이기 시작하면(요청당 DB 1회) 그때 (a)로 내리는 길이 Guard 한 줄이라는 것만 기억.
- 🔵 **사소 (↻)** — `.env.example:4` `/* */`(dotenv 주석은 `#`, 3회째) · `JWT_ACCESS_SECRET=` 비어 있어 `cp` 직후 부팅 실패 · `crypto-refresh-token-issuer.adapter.ts:16` `86_400_400`(3회째 — 7일이 7일+2.8초) · `reqest.type.ts` 오타 · `AuthenticatedRequest.accountId: string`은 `@Public()` 라우트에서 거짓 · `post.controller.ts` 스텁·`#post/*` 별칭 없음 · `auth.module.ts:9,11` 배럴 import 표기 혼용(`'./application/queries'` vs `'./application/use-cases/index'`).

## 잘한 점

- 🟢 `access-token.guard.ts` — 주입은 `Reflector` + `QueryBus`뿐, 예외는 `UnauthorizedException`, `getAllAndOverride<boolean>`, `!session` 분기 명시. 2차 §1·§3·예외 소유 세 항목이 한 파일에서 동시에 풀렸고 presentation boundary FAIL 2건 → 0. (nestjs.md › enforceable › 컨트롤러(presentation)는 버스만 · 관용구 › 예외는 레이어 소유)
- 🟢 `verify-session.query.ts` `extends Query<VerifiedSession | null>` + `verify-session.handler.ts` `IQueryHandler<VerifySessionQuery>` — 결과 타입의 진실이 쿼리 한 곳, `null` 분기 두 개(`claims`·`account`)가 전부 명시적. 리포지토리·`AccountId`는 application 안. (apps/api/AGENTS.md › 구조 › `Query<R>`)
- 🟢 `queries/index.ts` 배열 상수 + `auth.module.ts:26` `...QueryHandlers` 스프레드. (ARCHITECTURE › 모듈 등록)
- 🟢 `app.module.ts:16,25` — `ThrottlerModule.forRoot` + `APP_GUARD: ThrottlerGuard`를 컴포지션 루트에. `@Throttle`이 처음으로 동작한다. (nestjs.md › 관용구 › 전역 1회 등록은 컴포지션 루트에서만)
- 🟢 `env.schema.ts:17` `JWT_ACCESS_TTL_SECONDS: z.coerce.number()` + `jwt-access-token-signer.adapter.ts:14,19-20` `ConfigService<Env, true>` + `{ infer: true }` — 에러를 어댑터가 아니라 env 계약에서 풀었다. (typescript.md › 관용구 › 경계에서 검증하고 안에서 신뢰)
- 🟢 `jwt-access-token-signer.adapter.ts:24` `return await` — `verify()`는 이제 `null`을 돌려준다.
- 🟢 `application/services/session-issuer.service.ts` — 1차 정답의 자리로 이동.
- 🟢 새 AGENTS.md 규칙대로 클래스 주입(`Reflector`·`QueryBus`·`JwtService`·`ConfigService`·`SessionIssuer`)에서 `@Inject` 제거, Symbol 포트만 `@Inject(TOKEN)`. (apps/api/AGENTS.md › ESM 규칙)
- 🟢 툴체인 마이그레이션이 **문서와 같은 diff에** 있다 — `apps/api/AGENTS.md` · ARCHITECTURE · ADR-002/004/005 · `packages/schemas/AGENTS.md`. 코드가 규칙을 바꿨으면 규칙 문서도 같이 바뀌어야 리뷰가 공정하다 — 이번이 그 예다.

## 기존 문제 (이번 변경 밖 — 참고만)

- `test/health.e2e-spec.ts` — `#health/…` 참조 typecheck 2건(마이그레이션에서 `.js`만 지워졌다).
- `drizzle/meta/*.json` Biome 포맷 7건 — `biome.json`에 `drizzle/` 제외 검토.
- `unique-id.vo.ts:12` UUID 검사 TODO — `new AccountId(claims.sub)`의 형식은 여기서도 안 막힌다.

## 다음 단계

§1은 한 단어. §2는 결정(코드 or 문서). §3은 enum 값 하나 + 표 한 줄. 고친 뒤 `/ca-review`로 재검토. 막히면 "N번 힌트 더" 또는 "N번 정답".
