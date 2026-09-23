# CA 리뷰 — 2026-09-23 — profile 슬라이스: 기본 프로필 생성(saga) · `GET /profiles/me`

**범위**: apps/api · `profile` 슬라이스 + `app.module.ts` + `profile.schema.ts` · 파일 17개 (`git diff HEAD`, 수정 7 · 신규 10)
**기계검증**: boundary 23/25 — FAIL 2건(`#auth/*`·`#profile/*` `package.json imports`)은 3차에서 확인한 **스크립트 구 규칙** 오탐 · lint ❌ (전부 `drizzle/meta/*.json` — 변경 파일 19개 단독 검사는 0건) · typecheck ❌ (2건, 기존 `test/health.e2e-spec.ts`) · test — (미실행: 변경에 spec 없음)
**한 줄 총평**: 🔴 0. 레이어 방향·어댑터 예외 변환·saga·`fromDomain`은 전부 규칙대로다. 대신 **재시도 루프가 마지막 실패를 조용히 삼킨다** — 만들어 둔 `_duplicateHandle`이 한 번도 불리지 않는 게 그 증거다.

## 먼저 볼 것

### 1. 🟡 handle 충돌 3회 후 execute가 "성공"으로 끝난다
- 위치: `apps/api/src/profile/application/use-cases/create-default-profile/create-default-profile.handler.ts:24-31`, `:35` `const _duplicateHandle`
- 규칙: nestjs.md › 안티패턴 › "예외를 `catch` 후 삼키기(빈 catch) — 실패가 200으로 둔갑한다" · nestjs.md › 관용구 › 예외는 레이어 소유 › "application은 애플리케이션 예외(+분류 코드)를 던지고"
- 왜: 포트 수준 `DuplicateHandleError`는 use case가 애플리케이션 예외로 바꿔야 filter가 의미 있는 status로 매핑한다. 지금은 바꾸는 코드(`_duplicateHandle`)가 있는데 닿는 경로가 없다 — `_` 접두는 lint가 "안 쓰인다"고 알려준 걸 끈 것이다.
- 생각해볼 것: `MAX_ATTEMPTS = 3`일 때 `attempt`가 가질 수 있는 값을 모두 적어 보라. 그중 `attempt === this.MAX_ATTEMPTS`가 참인 값은? 세 번 다 `DuplicateHandleError`면 `GET /profiles/me`의 최종 응답 status와 `code`는 무엇이고, saga 경로에서는 누가 이 실패를 알게 되는가?
- ↻ 예외는 레이어 소유 2회째 (직전: 2026-09-21)

### 2. 🔵 `GET /profiles/me`가 매번 command를 먼저 쏜다
- 위치: `apps/api/src/profile/presentation/profile.controller.ts:16-20`
- 규칙 원문 없음 — 컨트롤러는 버스 디스패치만 하므로 enforceable 위반은 아니다. 판단의 문제라 🔵.
- 트레이드오프:

  | | 지금 (GET에서 lazy 생성) | saga만 생성, GET은 조회만 |
  | --- | --- | --- |
  | saga 이전 가입 계정 | 자동 backfill | 별도 backfill 필요 |
  | saga 실패 복구 | 다음 `/me`가 복구 | 복구 경로 없음 (UnhandledExceptionBus 로그뿐) |
  | GET 안전성 | GET이 쓰기를 한다 | GET = 읽기 |
  | 요청당 DB | findById 2회 (+ insert) | 1회 |
  | 레이스 | 가입 직후 saga ↔ `/me` 동시 실행 가능 | 없음 |

- 레이스에서 실제로 생기는 일: 둘 다 `findById` → `null`, 둘 다 `save`. 두 번째 insert는 `id` 충돌 → `onConflictDoUpdate`의 `set`에 `handle`이 없으므로 **handle은 첫 번째, name은 두 번째** 값으로 남는다(`drizzle-profile.repository.adapter.ts:32-37`).
- 생각해볼 것: 이 컨트롤러가 command를 부르는 이유가 "saga 이전 계정"인가 "saga 실패 대비"인가? 둘 다라면 — 가입 직후 모바일이 `/me`를 바로 부를 때, `save`가 "생성"인지 "갱신"인지를 누가 결정하고 있는가?

### 3. 🟡 자기 도메인 안 `#profile/` — 이번엔 한 파일 안에서 두 방식이 섞였다
- 위치: `drizzle-profile.repository.adapter.ts:5-6`(`#profile/…`) vs `:12-17`(`../../…`) · `create-default-profile.handler.ts:3-9` · `get-profile.handler.ts:3-8` · `get-profile.query.ts:2` · `profile.controller.ts:3-4`
- 규칙: apps/api/AGENTS.md › ESM 규칙 › "도메인 안에서는 상대경로, 컨텍스트 경계를 넘을 때(`health` → `shared`)만 `#shared/...` 별칭"
- 왜: 경계 grep은 `#profile/` 접두를 "profile 밖에서 온 import" 후보로 본다. 같은 파일에서 `Handle`은 별칭, `ProfileId`는 상대경로면 규칙이 아니라 자동완성이 경로를 고르고 있다는 뜻이다.
- 생각해볼 것: 3차에서 "코드를 고칠지 문서를 고칠지" 결정하기로 했다. 어댑터 5-6행을 쓸 때 어느 쪽을 의도했는가? 의도가 없었다면 IDE import 설정(`importModuleSpecifier`)이 이 규칙을 대신 지켜줄 수 있는가?
- ↻ 4회째 (직전: 2026-09-22)

## 나머지

- 🟡 **retry 루프 핸들러에 spec 없음** — `create-default-profile.handler.ts`. 규칙: apps/api/AGENTS.md › 테스트 › "단위: 소스 옆 `*.spec.ts`, `Test.createTestingModule`로 포트를 `useValue` mock". 왜: §1은 `save`가 매번 `DuplicateHandleError`를 던지는 mock 하나로 드러난다. 생각해볼 것: 이 핸들러에서 가장 먼저 깨질 분기는 무엇이고, 그 분기를 재현하는 데 mock이 몇 줄 필요한가? ↻ 2회째 (직전: 2026-09-21)
- 🟡 **타입을 값으로 import** — `get-profile.query.ts:2` `Profile`(제네릭 인자로만 사용), `get-profile.handler.ts:2` `IQueryHandler` · `:7` `Profile`, `create-default-profile.handler.ts:2` `ICommandHandler`, `account-registered.saga.ts:2` `ICommand, IEvent` · `:3` `Observable`, `profile-response.dto.ts:1-2` 둘 다. 규칙: ARCHITECTURE.md › apps/api › ESM 규칙 › "타입만 쓰는 참조(포트 인터페이스, DTO 타입)는 `import type`". 왜: Biome `useImportType`이 전역 off라 사람만 지킨다. 반대로 `profile.repository.port.ts:1-2`와 `register-account.handler.ts:2`의 `type ICommandHandler`는 맞게 썼다 — 같은 날 쓴 파일끼리 기준이 다르다. 생각해볼 것: `Profile`이 **값**으로 쓰이는 파일(`Profile.createDefault`·`reconstitute`)과 **타입**으로만 쓰이는 파일을 나눠 보면 각각 몇 개인가? ↻ 2회째 (직전: 2026-09-22)
- 🟡 **`createDefault`가 이벤트를 apply하지 않고, TODO도 지워졌다** — `profile.entity.ts:69-81`, diff에서 `// TODO: Cqrs 이벤트 등록` 삭제. 규칙: nestjs.md › 관용구 › "신규 생성 팩토리(`register`, `place`, `initiate` …)는 도메인 이벤트를 `this.apply(event)`하고". 트레이드오프: 지금 `ProfileCreated`를 구독할 곳이 없다 — 넣으면 핸들러에 `EventPublisher`·`commit()`까지 따라온다. 생각해볼 것: TODO를 지운 것은 "안 하기로 결정"인가 "했다고 착각"인가? 결정이라면 그 근거는 어디에 남아 있는가?
- 🟡 **`ProfileId`를 핸들러와 팩토리가 각각 만든다** — `create-default-profile.handler.ts:22` `new ProfileId(command.accountId)` · `profile.entity.ts:74` `new ProfileId(accountId)`. 규칙: nestjs.md › 관용구 › VO 생성 위치 › "같은 값의 VO를 핸들러와 팩토리가 두 번 만들지 않는다". 생각해볼 것: 이 ID는 ①(신규 애그리게잇의 자기 ID)인가 ②(기존 애그리게잇을 지목하는 ID)인가 — Account의 ID를 빌려 쓰는 Profile은 어느 쪽에 더 가까운가?
- 🟡 **사소** — `drizzle-profile.repository.adapter.ts:55-57` `length === 0` 검사 뒤 `rows[0] ? … : null`을 또 검사(둘 중 하나만 남아도 같다, `.limit(1)`도 없음) · `profile.repository.port.ts:8` "존재는하는" · `profile-response.dto.ts:1` `ProfileRespose`.
- 🔵 **unique 제약 이름이 우연으로 연결돼 있다** — `profile.schema.ts:5` `PROFILES_HANDLE_UNIQUE`는 선언만 되고 `:11`은 `.unique()`(이름 없음). 지금은 Drizzle 기본 이름이 `profiles_handle_unique`라 우연히 맞는다. `account.schema.ts:8`은 `.unique(ACCOUNTS_EMAIL_UNIQUE)` — 템플릿과 갈라진 지점. 생각해볼 것: 컬럼 이름을 `username`으로 바꾸면 어댑터의 `constraint_name ===` 비교는 언제 틀렸다는 걸 알려주는가?
- 🔵 **`Handle.generate()`가 도메인 안에서 `node:crypto`** — 규칙상 금지된 건 `@nestjs/*`뿐이라 위반은 아니다. 대신 `Profile.createDefault`가 비결정적이 되어 spec에서 handle 값을 단언할 수 없다. 테스트가 handle 값을 단언할 필요가 있는지에 따라 판단.

## 잘한 점

- 🟢 `drizzle-profile.repository.adapter.ts:39-49` — `DrizzleQueryError` → `PostgresError` → `23505` → 제약 이름까지 좁혀서 **handle 충돌만** 포트 예외로 바꾸고 나머지는 `throw e`. 드라이버 타입이 application에 0건. (nestjs.md › 관용구 › 리포지토리 어댑터는 정책 없이 예외 변환만)
- 🟢 `account-registered.saga.ts` — auth의 `AccountRegisteredEvent`를 원본 경로로 import, `ofType` → `map`으로 command 변환만. 모듈 import 없이 구독. (nestjs.md › 관용구 › 도메인 이벤트 클래스는 발행 도메인의 공개 계약 · ARCHITECTURE › 도메인 간 통신 › 비동기)
- 🟢 `profile.controller.ts` — 도메인 엔티티 import 0, 버스 제네릭 없이 받아 `ProfileResponseDto.fromDomain`에 넘김. 타입은 DTO 시그니처가 회복한다. (nestjs.md › enforceable › 컨트롤러에서 도메인 엔티티 import·반환 금지)
- 🟢 `get-profile.handler.ts:21` `ApplicationException('NOT_FOUND', …)` — 분류 코드 명시, 부재 판단은 use case가. (nestjs.md › 관용구 › 예외는 레이어 소유)
- 🟢 새 파일 4개의 주입이 전부 `@Inject(TOKEN) private readonly x: XxxPort` / `private readonly commandBus`. 3차까지 2회 지적된 패턴이 이번엔 0건.
- 🟢 `get-profile.query.ts` `Query<Profile>` · `create-default-profile.command.ts` `Command<void>` · 배럴 배열 상수 3개(`CommandHandlers`·`QueryHandlers`·`Sagas`) 스프레드 · `toDomain`이 `$inferSelect` + `reconstitute`. 1차에서 짚은 네 규칙이 새 슬라이스에서 처음부터 맞게 나왔다.
- 🟢 `create-default-profile.handler.ts:22` 선조회로 멱등 · `:26` 재시도마다 `Profile.createDefault`를 새로 불러 handle을 다시 뽑는다 — 재시도 설계 자체는 맞다(§1은 루프를 빠져나가는 경로의 문제).
- 🟢 `Handle.generate()` — `user_` + 8 hex = 13자로 `PATTERN`(`{3,15}`)·DB `varchar(15)` 안에 들어간다. 생성 책임이 VO 안에 있다.

**🎓 졸업** — `schemas DTO implements` · `Query<R>/Command<R>` · 핸들러 배럴 배열 상수 · `$inferInsert/$inferSelect` · `as const`: 마지막 3회 리뷰에서 미출현. 특히 앞의 넷은 이번 새 슬라이스에서 **처음부터** 맞았다 — 규칙이 손에 붙었다는 뜻이다.

## 기존 문제 (이번 변경 밖 — 참고만)

- `drizzle-profile.repository.adapter.ts:32-37` `onConflictDoUpdate.set`에 `createdAt`이 있고 `handle`이 없다 — 갱신 때 생성일이 덮이고 handle 변경은 영속되지 않는다(§2 레이스와 연결).
- `handle.vo.ts`·`name.vo.ts` 검증 TODO — `Handle.create('!!')`가 지금 통과한다. `toDomain`도 이 `create`를 쓴다.
- `findAll` 미구현 스텁이 포트에 남아 있다.
- `test/health.e2e-spec.ts` typecheck 2건 · `drizzle/meta/*.json` Biome 포맷 · boundary-check 구 규칙 2건 — 3차와 동일.

## 다음 단계

§1은 spec을 먼저 쓰면 빨간불부터 볼 수 있다. §2는 결정, §3도 결정(4회째). 고친 뒤 `/ca-review`로 재검토. 막히면 "N번 힌트 더" 또는 "N번 정답".

---

## 후속 — 2026-09-23

### §1 정답 공개됨
- 원리: `for`의 조건(`attempt < MAX_ATTEMPTS`)이 거짓이 되는 순간 body는 실행되지 않는다. 그래서 body 안에서 `attempt === MAX_ATTEMPTS`는 영원히 거짓이고, 3회 모두 실패하면 루프가 그냥 끝나서 `execute`가 `undefined`로 성공 처리된다. "재시도를 다 썼다"는 판단은 루프 **뒤**가 할 일이다.
- 수정: catch에서는 `DuplicateHandleError`가 아닌 에러만 다시 던진다 → 루프 뒤에서 `throw duplicateHandle()` (`_` 접두 제거).
- gotcha: handle은 서버가 만든 값이라 CONFLICT(409)가 나가도 클라이언트가 할 수 있는 게 없다. 분류는 사용자가 판단할 일.
- 일반화: 루프 안에서 루프 변수를 **종료 경계값**과 비교하는 코드가 보이면 루프가 끝난 뒤에 무엇이 실행되는지 확인한다.

### §2 토론 — DB 2회 접근 최소화 (Redis 없이)
- 선택지: (A) GET은 조회만 + create insert를 `ON CONFLICT (id) DO NOTHING`으로 바꾸고 handler의 선조회 제거 + 기존 계정은 1회성 backfill SQL, (B) command 하나가 "있으면 반환, 없으면 생성"을 맡음(happy path 1회, GET이 command), (C) 현재 구조 유지.
- 권장: (A). 남는 위험은 가입 직후 saga가 끝나기 전에 `/me`가 도착하는 창뿐이다.
- §2 (A) 코드 공개됨: 포트 `create()` 추가 · 어댑터 `onConflictDoNothing({ target: profiles.id })` · 핸들러 선조회 제거 · 컨트롤러는 `GetProfileQuery`만 · backfill은 `db:generate --custom` 마이그레이션. 소스 파일은 수정하지 않음.
- §2 후속 토론: "클라이언트 1회 재시도로 충분한가?" → 아니다. 재시도는 타이밍(느린 insert)만 덮고, saga 실패·프로세스 크래시(in-memory 이벤트 유실)는 못 덮는다. `@nestjs/cqrs` saga는 `mergeMap(defer(commandBus.execute))` + `catchError`로 로그만 남김(event-bus.js:196-202) 확인. 보장은 서버에 있어야 한다 → 선택지: read-repair(/me miss 시 생성) · 같은 트랜잭션 동기 생성 · outbox.
- §2 후속: 사용자 제안 "GetProfile → `Profile | null`, 컨트롤러가 null이면 CreateDefault 호출" 검토 — 동작은 하지만 ① 컨트롤러 비즈니스 분기(nestjs.md › 관용구 › 컨트롤러는 버스 디스패치 전용) ② 부재 판단이 presentation으로 이동 ③ miss 경로 dispatch 3회. 대안으로 "보장+반환" use case 하나를 질문으로 제시.
- §2 후속: 사용자 결론 "Command + 새 use case(조회 → 없으면 생성 → 반환)" — 방향 맞음. 네이밍은 ARCHITECTURE › Directory Tree › `use-cases/{verb-noun}` 기준으로 `my-profile`(명사, presentation 관점) 재고 질문. 남은 질문: 반환 객체 출처(DO NOTHING 패배 시) · CreateDefault와의 관계.
- §2 **정답 공개됨**: `ensure-profile` use case(`Command<Profile>`)로 통합 — saga·`/me` 모두 `EnsureProfileCommand`, `create-default-profile/`·`GetProfileQuery` 제거, `Profile.createDefault(profileId: ProfileId)`로 ID 이중 생성 해소, create 후 `findById` 재조회로 반환, spec 4케이스. 소스 파일은 수정하지 않음.
