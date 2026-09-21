# CA 리뷰 — 2026-09-21 — auth 슬라이스: register / login / refresh 세션 발급

**범위**: apps/api · `auth` 슬라이스 + `packages/schemas` · 파일 30개 (`git diff HEAD`, 신규 16 · 수정 14)
**기계검증**: boundary 24/25 (FAIL 1건은 오탐 — §먼저 볼 것 2 참조) · lint ❌ (7건, 전부 `drizzle/meta/*.json` Biome 포맷 — 이번 변경 2건 `0006_snapshot.json`·`_journal.json`, 기존 5건) · typecheck ❌ (3건 — 이번 변경 1건 `auth.controller.ts:35` refresh 본문 없음, 기존 2건 `test/health.e2e-spec.ts`가 삭제된 `#health` 참조) · test — (미실행: diff에 spec 없음, api test는 실 DB 필요)
**한 줄 총평**: 레이어 방향은 정확하다. 이번에 배울 것은 "계약과 결선은 tsc가 안 잡는다" — Schema↔DTO 형태, Command→결과 타입, 배럴 등록, 데코레이터를 읽어줄 Guard. 네 군데 모두 코드는 있는데 연결이 비어 있다.

> 사용자 메모: 클라이언트는 의도적으로 미작업. refresh는 미완(핸들러 있음, 결선·컨트롤러 없음).

## 먼저 볼 것

### 1. 🟡 와이어 계약이 둘이 됐다 — Schema는 `confirmPassword`를 요구하고 API는 거부한다
- 위치: `packages/schemas/src/account.schema.ts:43` · `apps/api/src/auth/presentation/dtos/register-account.dto.ts:9`
- 규칙: packages/schemas/AGENTS.md › 역할 › "API와 모바일이 함께 소비하는 **zod 와이어 계약의 단일 소스**다" · 소비 규칙 › "API DTO는 여기의 추론 타입을 `implements`한다 … 필드 드리프트는 tsc가 잡는다"
- 왜: 형태의 진실이 한 곳이어야 모바일이 파싱한 payload를 API가 그대로 받는다. `StrictOmit`으로 필드를 빼는 순간 tsc의 드리프트 감지가 그 필드에 대해 꺼진다.
- 생각해볼 것: 모바일이 `RegisterAccountSchema`로 검증한 객체를 그대로 `POST /auth`에 보내면 어떤 응답이 오는가? 이 프로젝트의 `ValidationPipe`는 모르는 필드를 어떻게 다루는가(`validation.pipe.ts`를 열어 보라). "비밀번호 확인"은 와이어 계약의 일부인가, 화면(폼)의 관심사인가 — 그 답에 따라 `confirmPassword`는 어느 Schema에 있어야 하는가?

### 2. 🟡 컨트롤러가 결과 타입을 "선언"한다 — 메시지가 결과 타입을 "알아야" 한다
- 위치: `apps/api/src/auth/presentation/auth.controller.ts:18`, `:28` · `apps/api/src/auth/application/use-cases/register-account/register-account.command.ts:1` · `login-account.command.ts:1`
- 규칙: apps/api/AGENTS.md › 구조 › "`get-health.query.ts` # `GetHealthQuery extends Query<HealthReport>`" (템플릿) · nestjs.md › enforceable › "버스 제네릭 … 제네릭 없이 받아 `fromDomain`에 넘기면 DTO 파일의 시그니처가 타입을 회복한다"
- 왜: `execute<C, R>`의 `R`은 단언이지 추론이 아니다. 핸들러 반환 타입을 바꿔도 컨트롤러의 `R`은 그대로라 tsc가 침묵한다. 템플릿은 메시지 클래스가 결과 타입을 들고 있어 컨트롤러가 제네릭을 쓰지 않았다.
- 참고: boundary-check의 FAIL 1건이 이 줄이다. 규칙 원문은 "도메인 타입"인데 `AuthSession`은 application 소유 결과 타입이라 글자 그대로는 오탐이다(nestjs.md › 관용구 › 컨트롤러 › "use case가 application 소유 결과 타입을 반환하면 그대로 통과시켜도 된다"). 그런데 제네릭을 쓰게 된 **원인**이 이 항목이다.
- 생각해볼 것: `RegisterAccountHandler`가 `Promise<void>`로 돌아가면 컴파일 에러는 어디서 나는가 — 나기는 하는가? health 템플릿의 query 클래스가 무엇을 `extends` 했는지 보라. 그 덕에 컨트롤러는 무엇을 안 써도 됐는가?

### 3. 🟡 결선이 비어 있는 코드 두 곳 — 핸들러는 배럴에 없고, `@Throttle`은 읽어줄 Guard가 없다
- 위치: `apps/api/src/auth/application/use-cases/index.ts:4` (`RefreshSessionHandler` 누락) · `apps/api/src/auth/presentation/auth.controller.ts:24` (`@Throttle`) · `apps/api/src/app.module.ts` (Throttler 등록 0건 — `grep -rn Throttler apps/api/src` 결과 컨트롤러 1줄뿐)
- 규칙: ARCHITECTURE.md › apps/api › 모듈 등록 › "핸들러는 배럴 `index.ts`의 **배열 상수**를 providers에 스프레드" · nestjs.md › edge case › "전역 pipe/filter/guard 등록 — … DI가 필요하면 `APP_PIPE` provider로 등록하라"
- 왜: 배열 상수와 데코레이터 메타데이터는 둘 다 런타임 결선이다. typecheck는 통과하고, 첫 요청에서야 `CommandHandlerNotFoundException`이 나거나 rate limit이 조용히 없다.
- 생각해볼 것: command 클래스 · 핸들러 클래스 · 배럴 등록 셋 중 빠져도 tsc가 통과하는 것은 무엇이고, 그걸 잡는 테스트는 어디 있는가? `@Throttle`이 붙인 메타데이터는 누가 읽는가 — 그 "누구"는 지금 어느 모듈에 등록돼 있는가? `@nestjs/throttler`를 의존성에 넣은 뒤 무엇을 더 해야 했는가?

## 나머지

- 🟡 **`issue-session.ts`의 자리** — `apps/api/src/auth/application/issue-session.ts:16`. 규칙: ARCHITECTURE.md › apps/api › Directory Tree › `application/{ports,use-cases/{verb-noun},queries/handlers,events,sagas}/` (application 루트에 파일 없음). 왜: 레이어 안의 하위 디렉터리가 "이 파일이 무엇인가"를 말한다 — 루트 파일은 분류가 없다. `RefreshSessionHandler:40-46`은 이 함수를 못 쓰고 sign+조립을 다시 짰다 — 헬퍼의 모양이 세 번째 호출처에 안 맞는다는 신호. 생각해볼 것: 세 핸들러가 공유하는 "세션 발급"은 use case인가, 도메인 서비스인가, 포트인가? `Deps` 객체를 손으로 넘기는 대신 DI가 주입하려면 이것은 무엇이어야 하는가?
- 🟡 **자기 도메인 안에서 별칭** — `login-account.handler.ts:3-22`, `refresh-session.handler.ts`, `issue-session.ts`, `refresh-token.repository.port.ts:1`, 어댑터 3개, `auth.controller.ts:4-6`. `register-account.handler.ts`는 한 파일에 `#auth/…`(3-16행)와 `../../../domain/…`(18행)이 섞여 있다. 규칙: apps/api/AGENTS.md › ESM 규칙 › "도메인 안에서는 상대경로, 컨텍스트 경계를 넘을 때(`health` → `shared`)만 별칭". 왜: 경계 grep이 `#auth/` 접두를 "타 도메인 침범" 후보로 본다 — 자기 도메인이 자기 별칭을 쓰면 오탐·미탐이 생긴다. 생각해볼 것: `#auth/…` import를 보고 "이 파일은 auth 밖에 있다"고 판단하는 도구는 무엇인가?
- 🟡 **`ConfigService`가 타입 없이 주입됐다** — `crypto-refresh-token-issuer.adapter.ts:11`, `jwt-access-token-signer.adapter.ts:14`. 규칙: apps/api/AGENTS.md › 환경 › "`ConfigService<Env, true>` 경유". 왜: 제네릭이 없으면 `getOrThrow()`가 `any`를 돌려준다 — typescript.md의 "`any`를 쓰지 마라"가 grep에 안 걸리는 경로로 뚫린다(`main.ts`는 제네릭을 썼다). 생각해볼 것: `getOrThrow('REFRESH_TOKEN_TTL_DAYS')`의 반환 타입을 에디터에서 확인해 보라. 키 이름을 오타 내면 tsc가 잡는가?
- 🟡 **`verify()`의 catch는 실행되지 않는다** — `jwt-access-token-signer.adapter.ts:22-28`. 규칙: apps/api/AGENTS.md › 레이어 규칙 › infrastructure › "실패는 throw하지 말고 포트가 정의한 결과 타입으로 반환한다". 왜: 포트 계약은 `AccessTokenClaims | null`인데 지금은 reject가 밖으로 나간다. 생각해볼 것: 잘못된 토큰으로 `verify`를 부르는 spec을 쓰면 `null`이 오는가, reject가 오는가? `try` 안에서 `return`된 Promise는 언제 평가되는가?
- 🟡 **쓰기 매핑이 읽기 타입을 쓴다** — `drizzle-refresh-token.repository.adapter.ts:44` `toPersistence(): typeof refreshTokens.$inferSelect`. 규칙: nestjs.md › 관용구 › 매핑 › "row 타입은 스키마에서 파생하고 (읽기 `$inferSelect` · 쓰기 `$inferInsert`)". 같은 diff의 `drizzle-account.repository.adapter.ts:67`은 맞게 썼다. 생각해볼 것: `createdAt`에 `defaultNow()`가 있는데 insert 타입에서 필수가 되는 이유는?
- 🟡 **테스트 0건** — 핸들러 3개 spec 없음, `account.schema.test.ts` 없음, auth e2e 없음. 규칙: apps/api/AGENTS.md › 테스트 › "단위: 소스 옆 `*.spec.ts`, `Test.createTestingModule`로 포트를 `useValue` mock" · packages/schemas/AGENTS.md › 절차 3 › "유효 payload 성공 + 잘못된 payload 실패 케이스". 왜: 위 §3의 결선 누락과 `verify()` 버그는 spec 하나면 잡혔다. 생각해볼 것: `RefreshSessionHandler`에서 가장 먼저 깨질 분기는 무엇인가(만료? 회전 레이스? 없는 토큰?) — 그걸 DB 없이 어떻게 재현하는가?
- 🟡 **`as const` 누락** — `packages/schemas/src/account.schema.ts:18-24` `SessionFieldsLimits`·`SessionFieldsMessage`. 규칙: typescript.md › 관용구 › "리터럴 고정엔 `as const`". 바로 위 `AccountFieldsLimits`는 붙어 있다.
- 🔵 **`RefreshToken`은 무엇인가** — `refresh-token.entity.ts:14`. `shared/domain/entity.ts`(`id`·`equals` 제공)도 `aggregate-root.ts`도 상속하지 않고 `_id`·getter를 손으로 다시 썼다. 자기 리포지토리·자기 테이블·자기 생명주기를 가지니 애그리게잇 루트로 보이는데, 이벤트가 없어 `AggregateRoot`가 줄 것이 없다는 판단도 가능하다. 같은 파일에서 `tokenHash: string`은 원시값인데 옆의 `PasswordHash`는 VO다 — 둘의 기준이 다른 이유가 있는가? `expiresAt`은 인프라(config TTL)가 계산해 넘긴다 — "세션은 7일"이 비즈니스 규칙이면 도메인은 그것을 검증조차 못 한다. 양쪽 다 설계로 성립하므로 토론.
- 🔵 **`JwtModule.register({})` + providers의 `JwtService`** — `auth.module.ts:18-21`. `register()`가 이미 `JwtService`를 export하므로 providers의 `JwtService`는 두 번째 인스턴스다(옵션이 빈 객체라 동작은 같다). secret·expiresIn을 매 호출 옵션으로 넘기는 대신 `registerAsync`+`ConfigService`로 한 번 묶는 선택지도 있다 — 어댑터가 `getOrThrow`로 읽는 현재 방식도 nestjs.md 규칙("어댑터가 `getOrThrow`로 읽는다")에 맞으므로 취향 차이.
- 🔵 **숫자 오타** — `crypto-refresh-token-issuer.adapter.ts:15` `86_400_400`. 규칙 문서 대상은 아니고 단순 상수 오류 — 하루가 몇 ms인지 다시 계산해 보라.
- 🔵 **만료된 토큰 행은 남는다** — `refresh-session.handler.ts:33`은 만료 시 throw만 하고 행을 지우지 않는다. 회전된 토큰의 재사용(탈취 후 replay)도 "만료됨"과 같은 응답이다. 정리 정책·재사용 감지는 문서에 규칙이 없다 — 지금 범위 밖이면 TODO로만.
- 🔵 **사소** — `refresh-session.handler.ts:26` `readonly signer`에 `private` 없음 · `:23` `refreshTokeneRepository` 오타 · `auth.controller.ts:4` `AuthSession`은 타입만 쓰이는데 값 import(컨트롤러는 `useImportType` off라 Biome이 침묵 — typescript.md › "타입 전용 import는 `import type`") · `.env.example:4` dotenv 주석은 `#` · `AuthSessionSchema` ↔ `AuthSessionResponse` 이름 쌍이 다른 Schema(`XSchema` ↔ `X`)와 어긋남.

## 잘한 점

- 🟢 `access-token-signer.port.ts` · `refresh-token-issuer.port.ts` · `refresh-token.repository.port.ts` — Symbol 토큰 + `Port` 인터페이스 + 보조 타입·포트 수준 예외 동봉, 데코레이터 0. (nestjs.md › 관용구 › 포트)
- 🟢 `drizzle-refresh-token.repository.adapter.ts:31-45` `replace()` — 트랜잭션 안에서 delete affected rows로 회전 레이스를 원자적으로 감지해 **포트 수준 예외**로만 변환하고, 정책(어떻게 응답할지)은 핸들러가 `UNAUTHORIZED`로 결정. (nestjs.md › 관용구 › "리포지토리 어댑터는 정책 없이 예외 변환만")
- 🟢 `refresh-token.entity.ts:56-64` `rotate()` — setter가 아니라 의도 메서드, 새 인스턴스 반환, `expiresAt` 유지 이유를 주석으로. `isExpired(now)`로 시계를 주입받아 spec에서 시간을 고정할 수 있다. (nestjs.md › 관용구 › 애그리게잇 › "상태 전이는 … 의도 메서드")
- 🟢 세 핸들러 모두 `ApplicationException('UNAUTHORIZED' | 'CONFLICT', …)` — 분류 코드 항상 명시. (nestjs.md › 관용구 › 예외는 레이어 소유 › "분류 코드는 던질 때 항상 명시한다")
- 🟢 `auth.controller.ts:22`, `:31` — `AuthSession`은 통과시켜도 되는 application 결과 타입인데도 `AuthSessionResponseDto.from`으로 한 번 더 매핑해 API 계약을 DTO가 소유. (nestjs.md › 관용구 › 컨트롤러)
- 🟢 command 3개 전부 `constructor(public readonly …)`만, 핸들러 3개 전부 `ICommandHandler<C, AuthSession>` 두 번째 제네릭 명시. (nestjs.md › 관용구 › command/query)
- 🟢 `refresh-token.schema.ts` — `shared/…/schema/`에 두고 `index.ts` re-export, FK `onDelete: cascade`, `token_hash` unique, 마이그레이션 `0006` 동반. (apps/api/AGENTS.md › 새 슬라이스 추가 절차 4)
- 🟢 `register-account.handler.ts:44-57` — `findByEmail` 선조회 + DB unique + 어댑터 변환(`DuplicateAccountError`) 삼중 — 레이스에 지지 않는다. (nestjs.md › 관용구 › 크로스 애그리게잇 불변식)

## 기존 문제 (이번 변경 밖 — 참고만)

- `test/health.e2e-spec.ts` — 직전 커밋에서 health 모듈을 삭제했는데 e2e가 `#health/…`를 참조 → typecheck 2건. auth e2e로 대체하거나 삭제.
- `apps/api/AGENTS.md` · `docs/ARCHITECTURE.md` — 여전히 `health` 슬라이스를 템플릿으로 서술. 템플릿 실체가 없으니 이제 `auth`가 템플릿이다 — 문서 갱신 필요.
- `drizzle/meta/000{0-4}_snapshot.json` — Biome 포맷 오류 5건(생성 파일). `biome.json`에서 `drizzle/` 제외를 검토.
- 영속성 스키마 파일명 — ARCHITECTURE는 `{domain-복수형}.schema.ts`인데 기존 `account`·`post`·`profile`이 단수. 이번 `refresh-token`은 기존 관례를 따랐으니 이번 변경 문제는 아님.
- `unique-id.vo.ts:12` — UUID 패턴 검사가 TODO로 비어 있음(잘못된 id로 VO가 생성된다).
- `AccountFieldsMessage` — `as const` 없음(기존).

## 다음 단계

고친 뒤 `/ca-review`로 재검토. 막히면 "N번 힌트 더" 또는 "N번 정답".
refresh 결선(§3)을 끝내고 typecheck를 먼저 통과시킨 뒤, §1(Schema/DTO 형태)과 §2(Command 결과 타입)를 보는 순서를 권한다.

---

## 후속 (2026-09-21) — 정답 공개됨: §2, issue-session · 질의응답: verify()

- §1: 사용자 판단 — `confirmPassword`는 폼 계약. `RegisterAccountSchema`/`LoginAccountSchema`를 `AccountSchema` 하나로 통합, DTO `implements Account`. 해결.
- §3: `CommandHandlers`에 `RefreshSessionHandler` 등록 + `POST /auth/refresh` 디스패치 작성. 해결(Throttler Guard 등록은 아직).

### §2 정답 — `Command<R>`

원리: `commandBus.execute<T, R>(cmd)`의 세 번째 오버로드는 `R = any`를 호출자가 **선언**하는 형태라 커맨드·핸들러와 아무 연결이 없다. `@nestjs/cqrs` 11+의 `Command<R>` 베이스는 결과 타입을 팬텀 심볼로 들고 있고, `ICommandHandler<C>`는 `C extends Command<infer R>`이면 `execute(): Promise<R>`을 강제하며, 버스의 첫 오버로드 `execute<R>(command: Command<R>): Promise<R>`이 그 R을 돌려준다. 결과 타입의 진실이 커맨드 한 곳이 되고, 핸들러 반환·컨트롤러 수신이 전부 tsc로 묶인다.

```ts
// register-account.command.ts
import { Command } from '@nestjs/cqrs';
import type { AuthSession } from '../../issue-session.js';

export class RegisterAccountCommand extends Command<AuthSession> {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {
    super();
  }
}

// register-account.handler.ts — 두 번째 제네릭 삭제, 반환 타입은 커맨드에서 온다
export class RegisterAccountHandler implements ICommandHandler<RegisterAccountCommand> {
  async execute(command: RegisterAccountCommand): Promise<AuthSession> { … }
}

// auth.controller.ts — 제네릭 0, session: AuthSession 추론
const session = await this.commandBus.execute(new RegisterAccountCommand(dto.email, dto.password));
return AuthSessionResponseDto.from(session);
```

`extends Command<R>`은 데코레이터도 로직도 아니므로 "순수 메시지" 규칙과 충돌하지 않는다(health 템플릿의 `GetHealthQuery extends Query<HealthReport>`와 같은 자리). 컨트롤러의 `import { AuthSession }`도 사라진다.

일반화: `execute<X, Y>`처럼 제네릭 두 개를 손으로 쓰는 순간 "이 타입은 추론이 아니라 단언"이다. 그 타입이 어디서 **와야** 하는지 찾아라 — 보통 메시지(command/query/event) 클래스가 그 자리다.

### issue-session 정답 — application service 클래스 `SessionIssuer`

원리: 세 핸들러가 공유하는 "세션 발급"은 포트 세 개(issuer·repository·signer)를 **조합**하는 일이다. 외부 시스템이 아니므로 포트/어댑터가 아니고, 영속화를 하므로 도메인 서비스도 아니다 — application 소유 오케스트레이션이다. 지금 모양의 문제는 둘: ① 자유 함수라 DI 밖에 있어 세 핸들러가 각자 포트 3개를 주입받아 `Deps`로 손으로 넘긴다(핸들러 생성자가 6개) ② `save`를 안에 품어 `replace`가 필요한 refresh는 재사용을 못 했다. 해법은 `@Injectable()` 클래스로 올려 DI가 주입하게 하고, 변하는 부분(신규 발급 vs 회전)을 메서드 둘로 나누며 공통 꼬리(sign + 조립)만 private로 묶는 것. 핸들러는 자기 use case 규칙(중복 검사·자격 검증·만료 검사)만 남기고 한 줄로 위임한다. 파일은 `application/services/session-issuer.service.ts` — ARCHITECTURE 트리에 `services/`가 없으니 문서에 한 줄 추가한다(health 시절 트리라 어차피 갱신 대상).

```ts
// application/services/session-issuer.service.ts
@Injectable()
export class SessionIssuer {
  constructor(
    @Inject(REFRESH_TOKEN_ISSUER) private readonly issuer: RefreshTokenIssuerPort,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly repository: RefreshTokenRepositoryPort,
    @Inject(ACCESS_TOKEN_SIGNER) private readonly signer: AccessTokenSignerPort,
  ) {}

  async issue(accountId: AccountId): Promise<AuthSession> {
    const issued = this.issuer.generate();
    await this.repository.save(RefreshToken.issue(accountId, issued.hash, issued.expiresAt));
    return this.toSession(accountId, issued.raw);
  }

  async rotate(current: RefreshToken): Promise<AuthSession> {
    const issued = this.issuer.generate();
    await this.repository.replace(current, current.rotate(issued.hash)); // RefreshTokenAlreadyRotatedError 전파
    return this.toSession(current.accountId, issued.raw);
  }

  private async toSession(accountId: AccountId, refreshToken: string): Promise<AuthSession> {
    const accessToken = await this.signer.sign({ sub: accountId.value });
    return { accountId: accountId.value, accessToken, refreshToken };
  }
}

// 핸들러 — 포트 3개 대신 서비스 1개
constructor(
  @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepositoryPort,
  @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasherPort,
  @Inject(SessionIssuer) private readonly sessions: SessionIssuer,
) {}
// … 검증 후
return this.sessions.issue(account.id);          // register · login
return this.sessions.rotate(current);            // refresh (catch → sessionExpired 는 핸들러에 남긴다)

// auth.module.ts providers: [SessionIssuer, ...CommandHandlers, …]
```

`AuthSession` 타입은 이 서비스 파일이 소유한다(`issue-session.ts` 삭제). 같은 레이어의 구체 클래스를 핸들러가 직접 주입하는 것은 규칙 위반이 아니다 — 포트는 **레이어를 넘는** 의존에만 필요하다. 핸들러 spec은 `SessionIssuer`를 `useValue`로 mock 하면 되고, `SessionIssuer` spec은 포트 3개를 mock 한다.

일반화: 여러 핸들러가 같은 포트 묶음을 주입받아 같은 순서로 호출한다면 그 묶음은 이름이 있는 application 개념이다. "N번째 호출처가 헬퍼를 못 쓴다"는 헬퍼가 **변하는 것과 변하지 않는 것**을 잘못 잘랐다는 신호 — 불변 부분만 남기고 변하는 부분을 메서드로 분리하라.

### verify()는 언제 쓰는가 — 답: Guard 도입 시점

맞다. `verify`의 유일한 소비자는 "이 요청의 주체가 누구인가"를 결정하는 Guard다. 흐름: 헤더 `Authorization: Bearer …` → Guard가 `signer.verify(token)` → `null`이면 `UnauthorizedException`(presentation이라 `HttpException` 허용) → 아니면 `request.accountId = claims.sub` → 컨트롤러가 `@CurrentAccountId()` 파라미터 데코레이터로 읽어 커맨드에 담는다. 자리는 `auth/presentation/guards/`(HTTP 접점) + `auth/presentation/decorators/`. 타 도메인(post 등)이 쓰려면 `AuthModule`이 `ACCESS_TOKEN_SIGNER` 토큰과 Guard를 export하고 소비 모듈이 `imports: [AuthModule]` — 또는 `APP_GUARD`로 전역 등록 + `@Public()` 데코레이터로 예외 라우트 표시(이 프로젝트는 인증 필요 라우트가 다수일 테니 후자가 유리). 첫 소비처가 생기기 전까지 `verify`는 dead code라 지금 spec을 먼저 써 두면 §나머지의 `await` 누락이 그 자리에서 드러난다.

### 후속 질의 — Guard는 auth/presentation인가 shared인가

결론: Guard 구현은 `auth/presentation/guards/` + `AuthModule`에서 `APP_GUARD` 등록. 다른 도메인이 만지는 계약(`@Public()`, `@CurrentAccountId()`, `AuthenticatedRequest` 타입)만 `shared/infrastructure/http/`. 근거: Guard는 `ACCESS_TOKEN_SIGNER`(auth 소유 포트)에 의존하므로 shared에 두면 shared → auth 역전, post에서 import하면 "타 도메인 내부 import" 위반. filter가 shared에 있는 것은 shared 예외 위계에만 의존하기 때문 — 같은 기준. `APP_GUARD`는 등록 모듈 컨텍스트에서 DI가 해석되므로 AuthModule에 등록해야 토큰 export 없이 주입 가능. 기본 인증 + `@Public()` 예외 구조로 Guard 누락 실수를 구조적으로 제거.
