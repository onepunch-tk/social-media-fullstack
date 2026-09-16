# NestJS — 컨벤션 (행동 규칙)

> 빌드 실행 세션(execute.py)이 읽는 **행동 컨벤션**이다 — 관용구 · enforceable 규칙 ·
> 스택별 edge case · 안티패턴만 담는다. 디렉터리 구조 / 레이어 / 파일 위치 / alias는
> ARCHITECTURE.md가 소유하므로 여기서 중복하지 않는다.
>
> 대상은 **DDD + Clean Architecture + Ports & Adapters + `@nestjs/cqrs`** 를 쓰는 NestJS
> 백엔드다. (레이어 구성·디렉터리·파일 위치는 ARCHITECTURE 소유.)

## 관용구 (Idioms)

- **포트 = Symbol 토큰 + 인터페이스 쌍을 한 `*.port.ts` 파일에서 export한다** —
  `export const ORDER_PRICING = Symbol('ORDER_PRICING')` + `export interface OrderPricingPort`.
  토큰명 = Symbol 문자열 = 파일명의 SCREAMING_SNAKE이고, 인터페이스는 항상 `Port` 접미
  (repository는 `XxxRepositoryPort`)다. 포트가 쓰는 보조 타입도 같은 파일에 동봉한다.
  포트 파일은 데코레이터 0 — 도메인 타입만 import하는 순수 TypeScript다.
- **주입은 항상 토큰 + 포트 타입** — `@Inject(TOKEN) private readonly x: XxxPort`.
  바인딩은 모듈에서 `{ provide: TOKEN, useClass: Adapter }`, 구현을 런타임에 골라야 할
  때만 `useFactory`. 어댑터 클래스는 포트를 `implements`하고, 파일명을 PascalCase로
  바꾸면 클래스명이 나오게 짓는다.
- **컨트롤러는 버스 디스패치 전용** — `CommandBus.execute(new XxxCommand(...))` /
  `QueryBus.execute(new XxxQuery(...))`로 위임하는 얇은 HTTP 표면이다(유일한 예외는
  웹훅 — enforceable 규칙 참조). 입력은
  class-validator 요청 DTO로 검증하고(전역 `ValidationPipe` + `whitelist`), 응답은
  응답 DTO의 `static fromDomain(entity)`로 매핑해 도메인 객체를 그대로 노출하지 않는다.
  단 `fromDomain`은 버스가 도메인 객체를 반환하는 경로의 규칙이다 — use case가
  application 소유 결과 타입(외부 시스템 산출물 등 도메인 객체가 될 수 없는 값)을
  반환하면 그대로 통과시켜도 된다.
- **command/query는 순수 메시지 클래스** — `constructor(public readonly ...)`만 갖고
  데코레이터·로직이 없다. 핸들러가 `@CommandHandler(Xxx)` + `ICommandHandler<Xxx, R>`로
  받으며 반환 타입 `R`을 제네릭 2번째 인자로 명시한다(`void` 포함).
- **애그리게잇은 private 생성자 + 의도가 드러나는 정적 팩토리** — 신규 생성 팩토리
  (`register`, `place`, `initiate` …)는 도메인 이벤트를 `this.apply(event)`하고, DB
  재수화용 `reconstitute`는 이벤트 없이 생성한다. 상태 전이는 setter가 아니라 의도
  메서드(`confirm()`, `cancel()` …)로 표현하고 전이 규칙 위반 시 도메인 예외를 던진다.
- **이벤트 발행은 mergeObjectContext → save → commit() 순서** — 커맨드 핸들러가
  `EventPublisher.mergeObjectContext(aggregate)`로 감싸고, 영속화가 성공한 뒤
  `aggregate.commit()`으로 발행한다. `EventBus`를 직접 주입해 publish하지 않는다.
- **값 객체는 생성 시 검증·불변·`equals`** — 유효하지 않은 값으로는 아예 생성되지
  않게 하고, 동등성은 값으로 비교한다. 도입 기준: ① 식별자 없이 속성이 같으면 교체
  가능하고 ② 원시 타입 이상의 불변식·도메인 의미(검증 규칙·형식·단위)가 있을 때
  VO로 감싼다. 메서드 유무는 보조 신호일 뿐 기준이 아니다 — 검증+`equals`만 있는
  `Email`도 VO고, 메서드가 있어도 식별자가 필요하면 엔티티다.
- **VO 생성 위치 — 커맨드는 원시값, 조립은 안쪽에서** — command/query에는 VO를
  담지 않는다(원시값만; presentation은 VO를 모른다). 생성 주체는 VO 종류로 갈린다:
  ① 신규 애그리게잇의 자기 ID는 팩토리 내부에서 생성한다(핸들러가 만들지 않는다)
  ② 기존 애그리게잇을 지목하는 ID는 핸들러가 원시값을 ID VO로 래핑해 포트에
  넘긴다(리포지토리 포트 시그니처가 ID VO를 요구한다) ③ 상태 VO는 핸들러가
  만들지도 전달하지도 않는다 — 초기값은 팩토리, 전이는 의도 메서드, 재수화용
  변환은 어댑터 전용이다 ④ 값 VO는 판단 규칙으로: 핸들러가 포트 호출 때문에
  이미 만든 VO(중복 조회용 `Email` 등)와 단일 원시값으로 환원되지 않는
  구성체(항목 리스트·주소)는 핸들러가 조립해 팩토리에 전달하고, 나머지는
  원시값으로 넘겨 팩토리가 내부 생성한다 — 같은 값의 VO를 핸들러와 팩토리가
  두 번 만들지 않는다. 재수화(`reconstitute`) 경로의 VO 조립은 전부 어댑터 몫이다.
- **도메인 간 동기 조회는 ACL 포트로** — 소비 도메인이 필요한 만큼만(원시 타입·shared
  VO 시그니처) 자기 포트를 선언하고, 자기 어댑터가 공급 도메인 모듈이 export한 토큰을
  주입받아 구현한다. 타 도메인 심볼(토큰·포트 타입·ID VO)은 이 어댑터 안에서만 만진다.
- **도메인 이벤트 클래스는 발행 도메인의 공개 계약** — 구독측 `@EventsHandler`·saga의
  `ofType`은 발행 도메인의 이벤트 클래스를 직접 import한다(`instanceof` 매칭이라
  클래스를 복사·재선언하면 잡히지 않는다; 재export는 동일 클래스라 동작하지만 원본
  경로 import로 통일하라). saga는 이벤트 스트림을 커맨드로 변환만 한다.
- **크로스 애그리게잇 불변식은 use case가 검사한다** — 유일성처럼 애그리게잇
  하나가 알 수 없는 규칙은 핸들러가 리포지토리 포트의 `findBy{필드}` 선조회로
  검사하고, 존재하면 CONFLICT 분류의 애플리케이션 예외를 던진다(도메인 모델은
  컬렉션을 모르고, 어댑터에 넣으면 구현마다 중복된다). 타 컨텍스트 참조의
  존재성 검사도 같은 자리다 — ACL 포트로 조회해 부재면 NOT_FOUND. 선검사는
  동시 요청 레이스에 진다 — DB unique 제약이 최종 집행자이므로 선검사 필드에는
  반드시 제약을 함께 걸고, 위반은 어댑터가 포트 수준 예외로 변환한다(어댑터
  예외 변환 규칙 참조).
- **예외는 레이어 소유** — domain은 도메인 예외, application은 애플리케이션 예외
  (+분류 코드)를 던지고, 전역 exception filter가 HTTP 상태로 매핑한다.
  `HttpException` 서브클래스는 presentation 전용이다. 분류 코드는 던질 때 항상
  명시한다 — 생략하면 기본 분류(VALIDATION_ERROR)로 떨어져 부재가 400으로
  오매핑된다.
- **리포지토리 어댑터는 정책 없이 예외 변환만** — 부재는 던지지 말고 `null`을 반환한다
  (포트 시그니처 `Promise<X | null>`; 부재가 예외인지는 use case가 결정한다).
  비즈니스 의미가 있는 DB 에러(unique 위반, optimistic lock 충돌 …)만 드라이버
  예외를 포트 수준 예외로 변환해 다시 던지고 — use case가 반응해야 하는데 변환이
  없으면 드라이버 타입이 application으로 샌다 — 그 밖의 인프라 장애(커넥션 단절,
  타임아웃 …)는 잡지 않고 전파시켜 전역 filter가 500으로 처리하게 둔다.
- **도메인↔영속 모델 매핑은 리포지토리 어댑터가 소유한다** — 별도 mapper
  클래스·영속 모델 클래스를 만들지 말고, 어댑터의 private
  `toPersistence`/`toDomain`으로 변환한다. row 타입은 스키마에서 파생하고
  (Drizzle이면 읽기 `$inferSelect`·쓰기 `$inferInsert`), `toDomain`은 엔티티의
  `reconstitute`를 호출한다. 스키마·row 타입은 어댑터 밖(application·domain)으로
  새지 않는다 — 드라이버 예외를 application에 유출하지 않는 것과 같은 이유다.
- **설정은 `@nestjs/config` + `ConfigService`** — 어댑터가 `getOrThrow`로 읽는다.
- **전역 1회 등록은 컴포지션 루트에서만** — `CqrsModule.forRoot()` ·
  `ConfigModule.forRoot({ isGlobal: true })` · 전역 DB 모듈은 루트 모듈 전용이고,
  도메인 모듈은 재import하지 않는다(`@nestjs/cqrs` v11+ 전제 — `forRoot()`가 전역
  등록이라 plain `CqrsModule` 재import는 잉여다). 모듈 `exports`에는 타 도메인이 쓸
  포트 토큰만 올린다 — 구현 클래스를 export하지 않는다.

## enforceable 행동 규칙

> 강제는 프로젝트 린터(ESLint·Biome 등)와 타입체커(`tsc`)가 하고 phase `acceptance`가 lint·typecheck를 돌리게 하라 — 특정 도구를 강제하지 않는다(커스텀 훅도 아니다). `[기계검증]` 표시는 그 자동 검증 후보다.

- **domain 레이어에서 `@nestjs/*`를 import하지 마라.** 이유: 프레임워크 결합으로 단위
  테스트·이식성을 잃는다. 유일한 예외는 shared의 애그리게잇 베이스 shim 파일 하나 —
  프레임워크 유출을 단일점으로 수렴시키는 장치이므로, 엔티티는 `@nestjs/cqrs`를 직접
  import하지 말고 이 shim을 상속하라. [기계검증] (domain/ 내 `@nestjs` import grep —
  shim 파일 제외 0건)
- **application에서 infrastructure 구현을 import하지 마라.** 이유: 의존 역전이 깨져
  포트가 장식이 된다. 핸들러는 토큰+포트 타입으로만 의존하고 결선은 모듈이 한다.
  [기계검증] (application/ 내 `infrastructure/` 경로 import grep)
- **application에서 presentation을 import하지 마라.** 이유: 의존 방향이 바깥으로
  역전된다 — 핸들러가 요청 DTO를 커맨드 대신 받거나 응답 DTO를 조립하면 HTTP 표면
  변경이 use case를 흔든다. 입력은 command/query 메시지로 받고, 출력은 도메인 객체
  또는 application 소유 결과 타입으로 반환하라 — DTO 매핑(`fromDomain`)은
  presentation 소유다. [기계검증] (application/ 내 `presentation/` 경로 import grep,
  기대 0건)
- **컨트롤러에 포트·리포지토리·핸들러를 직접 주입하지 마라.** 이유: use case를 우회한
  두 번째 진입점이 생겨 규칙이 흩어진다. 버스로 디스패치하라. 예외는 raw body 서명
  검증이 필요한 웹훅 컨트롤러 하나뿐이고, 거기서도 검증·이벤트 해석까지만 하고 처리는
  커맨드로 디스패치하라. [기계검증] (controller `@Inject` grep — 웹훅 컨트롤러 제외 0건)
- **컨트롤러에서 도메인 엔티티·애그리게잇을 import·반환하지 마라.** 이유: 버스 결과를
  그대로 return하면 도메인 내부 필드가 그대로 API 계약이 되어, 엔티티 리팩토링이
  곧 breaking change가 된다. 노출 경로는 응답 DTO의 `static fromDomain` 하나뿐이고,
  도메인 엔티티 타입은 presentation에서 DTO 파일만 import한다. 버스 제네릭
  (`queryBus.execute<Q, Entity>`)에 도메인 타입을 쓰는 것도 같은 위반이다 — 제네릭
  없이 받아 `fromDomain`에 넘기면 DTO 파일의 시그니처가 타입을 회복한다. [기계검증]
  (presentation/ 내 도메인 엔티티·애그리게잇 import grep — `dtos/` 파일 제외, 기대 0건)
- **타 도메인의 내부(entities·use-cases·구현 클래스)를 직접 import하지 마라.** 이유:
  바운디드 컨텍스트 경계가 무너져 도메인이 서로의 세부에 결합된다. 허용되는 관통은
  둘뿐 — ACL 어댑터(공급 도메인이 export한 토큰 경유)와 이벤트 구독(발행 도메인의
  이벤트 클래스). 이벤트 핸들러가 타 도메인 능력이 필요하면 자기 포트를 거쳐라.
  [기계검증] (타 도메인 루트를 넘는 import grep — 별칭 표준이면 `@{타도메인}/` 접두
  검색; adapters 파일, `@EventsHandler`·saga 파일의 이벤트 클래스 import,
  `*.module.ts`의 공급 도메인 모듈 import(정상 결선)만 제외, 기대 0건)
- **`@Body()`/`@Query()`/`@Param()`을 검증 없이 신뢰하지 마라.** 이유: 미검증 외부
  입력이다. DTO + `ValidationPipe`(`whitelist`)로 모르는 필드를 잘라내고 타입을
  강제하라. bare pick(`@Body('field') x: string`)은 primitive라 파이프가 아무것도
  검증하지 않는다. [기계검증] (`@Body(`·`@Query(`·`@Param(` 파라미터 타입이 DTO
  클래스가 아닌 원시/any인 곳 grep — 내장 `Parse*Pipe` 동반은 제외)
- **domain/application에서 `HttpException`을 던지지 마라.** 이유: 안쪽 레이어가 HTTP를
  알게 되어 전송 방식에 결합된다. 도메인/애플리케이션 예외를 던지고 매핑은 전역
  filter에 맡겨라. [기계검증] (domain·application 내 `HttpException`·
  `BadRequestException`·`NotFoundException` 등 내장 예외 **클래스명** grep, 기대 0건 —
  패키지명 `@nestjs/common` grep은 `@Inject` import 때문에 오탐)
- **application에서 ORM/드라이버 예외 타입을 import·catch하지 마라.** 이유: use case가
  영속화 기술에 결합된다 — 안쪽 레이어가 HTTP를 모르듯 DB 드라이버도 몰라야 한다.
  어댑터가 포트 수준 예외로 변환해 던지게 하고 use case는 그 예외에 반응하라.
  [기계검증] (application/ 내 `QueryFailedError`·`PrismaClient*Error`·`MongoError` 등
  드라이버 예외 클래스명 grep, 기대 0건)
- **`process.env`를 코드 전반에서 직접 읽지 마라.** 이유: 검증·타입 안전·기본값을
  잃는다. `ConfigService` 경유로 단일화하라. 예외: `main.ts` bootstrap(PORT 등 —
  DI 컨테이너 준비 전)과 빌드 툴 설정 파일.
- **에러 응답을 `res.status().json()`으로 직접 만들지 마라.** 이유: exception filter와
  일관된 에러 포맷을 우회한다. 예외를 throw하라.
- **request-scoped provider를 남용하지 마라.** 이유: 매 요청마다 인스턴스화되어 성능
  저하·스코프 전파 비용이 크다. 꼭 필요한 경우만.

## 스택별 흔한 Edge Case

- **`mergeObjectContext`를 거치지 않은 애그리게잇은 `commit()`해도 이벤트가 발행되지
  않는다** — `apply()`는 쌓기만 한다. 팩토리 호출을 감싸는 걸 잊으면 조용히 유실된다.
- **`commit()` 시점** — 영속화 전에 커밋하면 저장 실패 시 이벤트만 나간다. save 성공
  후 커밋하라.
- **saga의 `ofType`은 `instanceof`로 매칭한다** — 이벤트 클래스를 복사·재선언하면
  절대 매칭되지 않는다(서브클래스는 잡힌다). 발행 도메인의 원본 클래스를 import하라.
- **웹훅 서명 검증은 raw body가 필요하다** — bootstrap에서 `rawBody: true`를 켜고
  컨트롤러에서 `@RawBody() payload: Buffer`로 받아라(`@nestjs/common` 내장; 구버전은
  `RawBodyRequest`). JSON 파싱된 body로는 서명이 절대 맞지 않는다.
- **tsconfig `paths` 별칭은 타입체커만 안다** — 기본 tsc 빌드는 emit된 JS의 import
  경로를 재작성하지 않아, 타입체크·`nest start`는 통과해도 `node dist/main`이
  `Cannot find module '@…'`로 죽는다. 런타임 해석을 빌드 파이프라인에서 보장하라 —
  SWC 빌더(`.swcrc`의 `jsc.baseUrl`+`jsc.paths`는 emit 시 재작성) 또는 webpack 빌더,
  아니면 프로덕션 엔트리에 `tsconfig-paths` 등록. AC가 `node dist/main` 기동까지
  검증해야 이 함정이 게이트에 걸린다.
- **순환 의존** — 모듈/provider가 서로 참조하면 부트스트랩이 실패한다. `forwardRef()`로
  풀되, 설계 문제의 신호로 의심하라(이벤트 경유로 방향을 끊는 게 먼저다).
- **전역 pipe/filter/guard 등록** — `app.useGlobalPipes`는 DI를 못 받는다. DI가 필요하면
  `APP_PIPE` provider로 등록하라.
- **`ValidationPipe` transform** — 숫자 쿼리스트링은 `@Type(() => Number)` 없이는
  문자열로 남는다.
- **`main.ts`는 bootstrap 전용**(global pipe/filter, `rawBody`, Swagger, `listen`) —
  비즈니스 로직 0, TDD 예외.

## 안티패턴

- **anemic 애그리게잇** — public setter 뭉치 + 로직은 전부 핸들러에. 규칙이 흩어지고
  불변식이 아무 데서나 깨진다. 상태 전이를 애그리게잇의 의도 메서드로 옮겨라.
- **버스 우회** — 컨트롤러가 핸들러/서비스를 직접 주입해 호출. use case 진입점이
  둘이 된다.
- **ACL 없는 지름길** — 타 도메인이 export한 리포지토리 토큰을 자기 use case·이벤트
  핸들러에 직주입. 어댑터 한 겹을 아끼려다 컨텍스트 경계가 사라진다.
- **모든 로직을 떠안는 god handler** — use case 하나 = command 하나 = 핸들러 하나.
- **Guard/Interceptor에 비즈니스 규칙 넣기** — 횡단 관심사 전용이다.
- **컨트롤러에서 ORM/DB 직접 접근** — 레이어를 전부 건너뛴다.
- **예외를 `catch` 후 삼키기**(빈 catch) — 실패가 200으로 둔갑한다.
- **파일명↔클래스명 드리프트** — 파일은 `notification`인데 클래스는 `Email`이면 검색이
  끊긴다. 파일명의 PascalCase가 곧 클래스명이어야 한다.
