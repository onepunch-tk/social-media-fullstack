# CA 리뷰 — 2026-09-17 — Post·Profile 도메인 첫 선언 + 영속성 스키마 + 와이어 스키마

**범위**: apps/api · `post/` `profile/` `shared/domain/` `shared/infrastructure/database/postgres/` + packages/schemas · 파일 28개 (`git diff HEAD` + untracked)
**기계검증**: boundary 25/25 PASS · schemas lint ✅ typecheck ✅ · api lint ❌ (4 — 전부 `apps/api/drizzle/meta/*.json` 생성물 포맷, 소스 0건) · api typecheck ✅ · test — 미실행 (spec/test 변경 없음, api test는 실 DB)
**한 줄 총평**: 레이어 경계는 정확히 지켰다(🔴 의존 방향 위반 0). 이번에 배울 것은 "불변식이 지금 어느 층에 살고 있는가" — VO·애그리게잇에 TODO로 비워둔 자리를 zod와 DB 제약이 대신 메우고 있다.

> 사용자 메모: entity·VO·간단한 event만 선언. DB 스키마 + packages/schemas는 zod 스키마만. Request/Response DTO는 필요 시점에.
> → application(ports·use-cases)·infrastructure(adapters)·presentation·`{domain}.module.ts`·별칭은 범위 밖으로 두고 본다.

## 먼저 볼 것

### 1. 🔴 도메인 이벤트가 `domain/` 밖에 있다 — `post/events/`
- 위치: `apps/api/src/post/events/post-liked.event.ts:1`, `apps/api/src/post/events/post-unliked.event.ts:1`, 이를 import하는 `apps/api/src/post/domain/entities/like.entity.ts:2-3`
- 규칙: ARCHITECTURE.md › apps/api › File Location Summary › "도메인 이벤트 | `src/{domain}/domain/events/`" · Directory Tree › `{domain}/domain/{entities,value-objects,events}/`
- 왜: 이벤트는 도메인 개념이라 domain 레이어의 순수성 규칙을 같이 받아야 한다. 지금 `boundary-check.sh`의 domain 순수성 검사(`@nestjs/*`·드라이버 import 0건)는 `*/domain/` 아래만 훑는다 — `post/events/`는 검사 사각지대다. 그리고 nestjs.md › 관용구 › "도메인 이벤트 클래스는 발행 도메인의 공개 계약 … 원본 경로 import로 통일하라" — 구독자가 생긴 뒤 경로를 옮기면 모든 구독자가 깨진다. 지금이 가장 싼 시점.
- 생각해볼 것: `like.entity.ts`(domain)가 `../../events/`를 import한다 — domain 레이어 파일이 domain 디렉터리 밖을 참조하는 것이 허용되는 경우가 문서에 있는가? 이 두 이벤트 파일에 `@nestjs/cqrs`를 import하면 지금 어떤 검사가 잡는가?

### 2. 🟡 `Like` — 상태 전이를 정적 팩토리로 표현했다
- 위치: `apps/api/src/post/domain/entities/like.entity.ts:46` (`static remove`), `:31` (`static create`), 그리고 `reconstitute` 부재
- 규칙: nestjs.md › 관용구 › 애그리게잇 › "신규 생성 팩토리(register, place, initiate …)는 도메인 이벤트를 `this.apply(event)`하고, DB 재수화용 `reconstitute`는 이벤트 없이 생성한다. 상태 전이는 setter가 아니라 의도 메서드(`confirm()`, `cancel()` …)로 표현하고 전이 규칙 위반 시 도메인 예외를 던진다."
- 왜: `remove`는 새 `Like`를 만들어(`createdAt: now` — 취소 시각이 생성 시각에 들어간다) `PostUnlikedEvent`를 붙인다. "존재하지 않는 좋아요를 취소"하는 규칙을 검사할 자리가 없고, 저장소에서 꺼낸 기존 Like에 도달할 경로(`reconstitute`)도 없다. 애그리게잇이 자기 생애주기를 모르면 규칙은 핸들러로 흩어진다(안티패턴 › anemic).
- 생각해볼 것:
  - 취소할 좋아요는 어디서 오는가 — 새로 만드는가, 저장소에서 꺼내는가? 꺼낸다면 `Like`에 무엇이 더 필요한가?
  - 이 애그리게잇의 식별자는 무엇인가? `Post`·`Profile`은 `PostId`·`ProfileId`를 갖는데 `Like`는 없다 — `shared/domain/entity.ts`의 `Entity<T extends UniqueId>` 계약에 `Like`가 들어맞는가? (복합 키를 가진 애그리게잇은 문서에 규칙이 없다 — 🔵로 이어짐)
  - "같은 사람이 같은 글을 두 번 좋아요할 수 없다"는 규칙은 지금 코드 어디에 있는가? DB 복합 PK 말고 도메인/use case 쪽에서.
  - 같은 도메인 안에 `PostId` VO가 있는데 `Like.postId`는 `string`이다 — 이 차이는 의도인가?
  - (작게) `PostLikedEvent`엔 `occurredAt`이 있고 `PostUnlikedEvent`엔 없다.

### 3. 🟡 VO가 아직 VO가 아니다 — 불변식이 zod·DB에만 있다
- 위치:
  - `apps/api/src/post/domain/value-objects/pos-content.vo.ts:5` (public 생성자), `:25` (`new PostContent(value)` — 검증한 `trimmed`가 아니라 원본 저장), `equals` 없음, `:3` (`static` 상수가 `readonly` 아님), 파일명 `pos-content` ↔ 클래스 `PostContent`
  - `apps/api/src/shared/domain/value-objects/unique-id.vo.ts:6` (`id?: string` 형식 검증 없음 — DB 컬럼은 `uuid`)
  - `apps/api/src/profile/domain/entities/profile.entity.ts:8` (`name: string` — 길이 규칙이 zod `max(50)`·DB `varchar(50)`에만 있고 도메인엔 없음)
- 규칙: nestjs.md › 관용구 › "값 객체는 생성 시 검증·불변·`equals` — 유효하지 않은 값으로는 아예 생성되지 않게 하고, 동등성은 값으로 비교한다. 도입 기준: ① 식별자 없이 속성이 같으면 교체 가능하고 ② 원시 타입 이상의 불변식·도메인 의미가 있을 때". 파일명은 nestjs.md › 안티패턴 › "파일명↔클래스명 드리프트 — 파일명의 PascalCase가 곧 클래스명이어야 한다."
- 왜: 도메인 예외를 TODO로 비워둔 것은 알고 있는 상태다. 문제는 그 사이 `PostContent.create('')`와 `new PostContent('x'.repeat(10_000))`이 둘 다 **성공**한다는 것 — 지금 이 값을 막는 층은 zod(와이어)와 `varchar(50)`(DB)뿐이고, 도메인은 아무것도 지키지 않는다. VO의 존재 이유가 "안쪽은 신뢰"인데(typescript.md › 관용구 › 경계에서 검증하고 안에서 신뢰하라) 안쪽이 신뢰할 근거가 없다.
- 생각해볼 것:
  - `Handle`은 private 생성자 + `trimmed` 저장 + `equals`인데 `PostContent`는 셋 다 아니다 — 두 VO를 나란히 놓고 갈라진 줄을 세어 보라.
  - `name`이 51자면 지금 어느 층에서 처음 막히는가? 그 층이 그 규칙의 "주인"이어야 하는가? (zod 정규식과 `Handle.PATTERN`이 같은 식으로 두 벌인 것은 이 아키텍처에서 불가피하다 — packages/schemas는 api 도메인을 import할 수 없다. 질문은 "어느 쪽이 원본인가"다.)
  - 도메인 예외 위계는 `shared/domain/`에 둘 것인가 — 두 TODO가 같은 예외 클래스를 던지게 될 텐데, 그 파일은 어느 슬라이스가 소유하는가? (ARCHITECTURE › File Location Summary › "공용 베이스/VO/예외 | `src/shared/domain/`")
  - `PostContent.create('')`가 실패해야 한다는 사실을 가장 싸게 고정하는 파일은 무엇인가?

## 나머지

- 🟡 **`posts` 테이블에 `content` 컬럼이 없다** — `apps/api/src/shared/infrastructure/database/postgres/schema/post.schema.ts:5-9` vs 도메인 `Post._content` (`post.entity.ts:7`). 마이그레이션 `0001_uneven_post.sql`도 동일. 규칙: nestjs.md › 관용구 › "도메인↔영속 모델 매핑은 리포지토리 어댑터가 소유한다 … `toPersistence`/`toDomain`". 질문: 어댑터의 `toPersistence(post)`는 `content`를 어디에 넣는가?
- 🟡 **`idColumn` 단축 속성 → row 키 이름이 `idColumn`이다** — `common.schema.ts:8` + `post.schema.ts:6`, `profile.schema.ts:5`. tsc로 확인: `typeof posts.$inferSelect`에 `id` 키는 없고 `idColumn`이 있다(SQL 컬럼명은 `id`). 참조도 `profiles.idColumn`으로 번진다. 규칙: nestjs.md › 관용구 › "row 타입은 스키마에서 파생하고(`$inferSelect`·`$inferInsert`), `toDomain`은 엔티티의 `reconstitute`를 호출한다". 질문: `toDomain(row)`에서 `row.idColumn`을 읽게 될 텐데, `...dateColumns`는 왜 키가 `createdAt`으로 나오는가? 같은 방식으로 `id`를 만들 수 있는가?
- 🟡 **row 타입과 도메인 타입의 null 불일치** — `post.schema.ts:7` `authorId` `.notNull()` 없음(→ `string | null`), `post_likes.profileId/postId`도 `null` 허용 타입(복합 PK라 DB는 NOT NULL을 강제하지만 `$inferSelect`는 `string | null`). 도메인 `Post.authorId: string`. 규칙: 위와 같음(어댑터가 매핑 소유). 질문: `toDomain`이 `null`을 만나면 무엇을 해야 하는가 — 그 분기가 생기는 게 맞는가, 스키마가 그 분기를 없앨 수 있는가?
- 🟡 **`Entity` 베이스가 호출처 0** — `apps/api/src/shared/domain/entity.ts:3`. `Post`·`Profile`·`Like`는 전부 `AggregateRoot`(shim)를 상속하고, shim은 `Entity`를 모른다. 그래서 `Post`·`Profile`이 `_id`·`get id()`를 각자 재선언하고 `equals`는 어디에도 없다. `Entity.equals`의 `null`/`undefined` 가드는 파라미터 타입이 non-nullable이라 strict에서 도달 불가. 규칙: typescript.md › 안티패턴 › "요청하지 않은 제네릭/추상화 — 호출처가 하나인데 타입 파라미터를 다는 것은 과설계다." 질문: 애그리게잇은 엔티티인가? 그렇다면 shim 한 줄이 어떻게 바뀌어야 `Post`가 `_id`를 다시 쓰지 않는가? 두 `Post` 인스턴스가 "같다"는 지금 무엇으로 결정되는가?
- 🟡 **영속성 스키마 경로·파일명이 문서와 갈라졌다** — `database/postgres/` (문서: `database/drizzle/`), `post.schema.ts`·`profile.schema.ts` (문서: `{domain-복수형}.schema.ts`). 규칙: ARCHITECTURE.md › apps/api › File Location Summary › "영속성 스키마 (drizzle) | `src/shared/infrastructure/database/drizzle/schema/{domain-복수형}.schema.ts`" · apps/api/AGENTS.md › 새 슬라이스 추가 절차 4. `db:generate`·`db:migrate` 스크립트 추가도 AGENTS.md("generate/migrate는 이번 phase 범위 밖")와 어긋난다. 어느 쪽이 맞든 하나만 남겨야 한다 — 코드를 옮기든 문서(ARCHITECTURE·AGENTS 두 곳)를 옮기든. 질문: `postgres`로 바꾼 이유가 "기술(드라이버)"과 "도구(ORM)"의 구분이라면 `drizzle.module.ts`·`DRIZZLE` 토큰은 왜 그대로인가?
- 🟡 **packages/schemas — 절차 1·3 미이행** — `packages/schemas/src/post.schema.ts:1`, `profile.schema.ts:1`: `import { z }` (AGENTS.md › 새 Schema 추가 절차 1 › "`import * as z from 'zod'`" — `health.schema.ts` 선례와 다름). `post.schema.test.ts`·`profile.schema.test.ts` 없음 (절차 3 › "유효 payload 성공 + 잘못된 payload 실패 케이스를 쓴다"). 질문: `handle: 'AB'`(대문자·2자)가 `ProfileSchema.parse`를 통과하는가 — 그걸 지금 어떻게 아는가?
- 🟡 **`RegisterProfileDto` — 스키마 없는 타입 + 용어 충돌** — `packages/schemas/src/profile.schema.ts:14`. 규칙: packages/schemas/AGENTS.md › 역할 › "zod 와이어 계약의 단일 소스 … zod 스키마로 정의하고 추론 타입을 함께 노출" · 루트 AGENTS.md › 도메인 용어 › "DTO | apps/api presentation 전용 class-validator 클래스. Schema 추론 타입을 `implements`". 질문: 모바일이 이 요청 body를 보내기 전에 무엇으로 검증하는가(zod 없이)? 이름이 `Dto`인 이 타입을 api의 `RegisterProfileDto` 클래스가 `implements`하면 두 심볼 이름이 같아진다 — 용어집의 DTO는 어느 쪽인가?
- 🟡 **`StrictPick` = `Pick`** — `packages/schemas/src/types.ts:2`. 내장 `Pick<T, K extends keyof T>`가 이미 같은 제약을 갖는다(`Omit`은 `K extends keyof any`라 `StrictOmit`만 의미가 있다). `StrictOmit`은 호출처 0. 규칙: typescript.md › 안티패턴 › 요청하지 않은 추상화.
- 🟡 **`IEventHandler` 값 import** — `apps/api/src/post/application/events/likes-count.handler.ts:1`. 규칙: typescript.md › 관용구 › "타입 전용 import는 `import type`" · 선례 `get-health.handler.ts:2` (`import type { IQueryHandler }`). apps/api는 biome `useImportType` off라 기계가 못 잡는다.
- 🔵 **좋아요 카운터 갱신 전략** (`likes-count.handler.ts:5` TODO) — 문서가 고정하는 것: 핸들러가 DB를 직접 만지면 nestjs.md › enforceable › "application에서 infrastructure 구현을 import하지 마라" 위반이므로 어느 안이든 `application/ports/`의 포트를 `@Inject`한다. 갈리는 것:
  - (A) 이벤트 핸들러가 포트로 `+1` — like use case가 카운터를 모른다(관심사 분리). 단, nestjs.md 순서(save → `commit()`)상 like는 이미 저장된 뒤라 핸들러 실패 시 카운터가 어긋나고, in-memory EventBus엔 재시도가 없다(최종 일관성).
  - (B) Like 리포지토리 어댑터가 like insert와 counter update를 한 트랜잭션에 — 강한 일관성. 단, nestjs.md › "리포지토리 어댑터는 정책 없이 예외 변환만" — 카운터 갱신이 "정책"인지 "영속 세부"인지가 쟁점. 이 경우 이벤트는 알림용으로만 남는다.
  - (C) `post_counters` 없이 `COUNT(*)` — 가장 단순, 읽기 비용.
  - 질문: 핸들러 실패로 카운터가 1 어긋났을 때 누가 어떻게 알아채는가? 그 답이 A/B를 가른다. `post_counters`를 `posts` 컬럼이 아닌 별도 테이블로 둔 이유(hot row 분리?)는 어느 안과 맞는가?
- 🔵 **`PostId`·`ProfileId`가 구조적으로 동일하다** — `PostId extends UniqueId {}`, `ProfileId extends UniqueId {}` 멤버 추가 0 → TS 구조적 타이핑에서 `new PostId().equals(new ProfileId())`가 컴파일된다. 문서에 브랜딩 규칙은 없다. 한쪽: 지금은 실수할 코드가 없으니 과설계. 다른쪽: `Like`가 두 ID를 나란히 받는 순간(`create(profileId, postId)`) 인자 순서 실수를 타입이 못 잡는다. 질문: 이 두 값이 "다르다"는 것을 컴파일러에게 어떻게 알려줄 수 있는가?
- 🔵 **domain의 `node:crypto`** — `unique-id.vo.ts:1`. 문서는 domain에서 `@nestjs/*`·드라이버만 금지한다. Node 런타임 전제(AGENTS.md "런타임은 Node 24")라 위반은 아니다. 한쪽: ID 생성은 도메인 책임이니 여기가 맞다. 다른쪽: 도메인 코드가 플랫폼 모듈을 알면 mobile `shared/domain`과 코드 공유 가능성이 닫힌다(전역 `crypto.randomUUID`는 Node·브라우저 공통). 판단.
- 🔵 **`PostSchema.author: ProfileSchema` 전체 임베드** — `packages/schemas/src/post.schema.ts:6`. 피드 아이템마다 작성자의 `createdAt`·`updatedAt`까지 실린다. 와이어 계약이 Profile 응답 형태에 결합된다 — Profile 필드가 늘면 피드 응답도 는다. 한쪽: 지금은 재사용이 싸다. 다른쪽: `pick`으로 작성자 요약을 분리. 그리고 `Post`라는 추론 타입명이 도메인 `Post` 클래스와 같다 — DTO 파일에서 둘을 동시에 import하게 될 때 어느 쪽에 별칭을 붙일 것인가(선례: `HealthResponse`).
- 🔵 **DB 세부** — `post.schema.ts:16` `post_likes.postId`만 `onDelete` 없음(글 삭제 시 FK 위반; 다른 FK는 전부 cascade) — 글은 hard delete 안 한다는 결정인가? `:26-28` `$defaultFn(() => 0)`은 앱 측 기본값이라 마이그레이션 SQL에 `DEFAULT`가 없다 — 다른 클라이언트(psql)가 insert하면 실패. 마이그레이션 3개 중 `0002`는 컬럼 drop 하나 — 첫 커밋 전 squash할지.
- ℹ️ `apps/api/package.json` `drizzle-kit` `~0.31.10` → `^0.31.10` — 이유가 diff에 없다. 의도한 변경인가?
- ℹ️ api lint 4건은 `drizzle/meta/*.json` 생성물 포맷. `biome.json`이 `dist/`·`.expo/`를 제외하는 이유가 여기에도 적용되는가, 아니면 커밋되는 파일이니 포맷하는가 — 둘 중 하나를 정해야 `bun run lint` 게이트가 다시 초록이 된다.

## 잘한 점

- 🟢 `apps/api/src/shared/domain/aggregate-root.ts` — `@nestjs/cqrs` 유출을 shim 한 파일로 수렴했고, 세 애그리게잇 모두 shim만 상속한다. boundary 검사 "domain: @nestjs/* import 0건 (shim 제외)" PASS. (nestjs.md › enforceable › "엔티티는 `@nestjs/cqrs`를 직접 import하지 말고 이 shim을 상속하라")
- 🟢 `Post`·`Profile` — private 생성자 + 정적 팩토리 + 이벤트 없는 `reconstitute`. 재수화 경로가 팩토리와 분리돼 있어 어댑터의 `toDomain`이 갈 곳이 이미 있다. (nestjs.md › 관용구 › 애그리게잇)
- 🟢 `post.entity.ts:7` `authorId: string` — `ProfileId`를 import하지 않았다. 컨텍스트 경계를 넘는 참조를 원시값으로 둔 것이 정확하다. (nestjs.md › 관용구 › ACL › "타 도메인 심볼(토큰·포트 타입·ID VO)은 이 어댑터 안에서만 만진다") — 다만 post 도메인 안에서 이 값에 이름을 붙일지(`AuthorId`)는 열린 판단.
- 🟢 **VO 생성 위치의 비대칭** — `Post.create(content: string, …)`는 원시값을 받아 팩토리가 `PostContent`를 만들고, `Profile.register(handle: Handle, …)`는 VO를 받는다. nestjs.md › 관용구 › VO 생성 위치 ④ 기준으로 둘 다 맞다: `handle`은 유일성 선조회(`findByHandle`) 때문에 핸들러가 이미 VO를 만들고, `content`는 포트 호출이 없으니 팩토리 내부 생성. 질문 하나만: 이 비대칭을 ④를 인용해 설명할 수 있는가? 설명할 수 있으면 의도고, 우연이면 다음에 뒤집힌다.
- 🟢 `profile.schema.ts:7` `handle.unique()` + `post_likes` 복합 PK — 유일성 선검사의 최종 집행자를 DB에 미리 걸었다. (nestjs.md › 관용구 › "선검사 필드에는 반드시 제약을 함께 걸고") `varchar(15)`·zod `{3,15}`·`Handle.PATTERN` 상한이 일치한다.
- 🟢 `Handle` VO — private 생성자, 정규화(`trim().toLowerCase()`) 후 검증, 정규화된 값 저장, `equals`. 예외 TODO만 남았다. `PostContent`가 따라갈 기준점.
- 🟢 별칭 규칙 — 도메인 안은 상대경로 + `.js`, 경계(`#shared`)를 넘을 때만 별칭. boundary "ESM .js 누락 0건" PASS. (apps/api/AGENTS.md › ESM 규칙)
- 🟢 `common.schema.ts` `dateColumns` 스프레드 — drizzle 공식 재사용 패턴이고 `{ withTimezone: true }`를 고정했다.

## 기존 문제 (이번 변경 밖 — 참고만)

- 없음.

## 범위 밖이지만 다음 단계에서 반드시 만날 것

- `LikesCountHandler`가 어떤 모듈에도 등록돼 있지 않다(`grep LikesCountHandler` → 정의 파일 외 0건). `post.module.ts`가 생기기 전까지 Nest는 이 클래스를 인스턴스화하지 않으므로 이벤트는 조용히 무시된다.
- `#post/*`·`#profile/*` 별칭이 `tsconfig.json paths`·`package.json imports` 어느 쪽에도 없다 — 지금은 두 슬라이스 모두 자기 안에서 상대경로만 쓰므로 통과하지만, `app.module.ts`가 `#post/post.module.js`를 import하는 순간 필요하다. (apps/api/AGENTS.md › 새 슬라이스 추가 절차 3 — "한쪽만 두면 typecheck는 통과하고 런타임이 깨진다")

## 다음 단계

1·2·3을 먼저. 고친 뒤 `/ca-review`로 재검토. 막히면 "N번 힌트 더" 또는 "N번 정답".

---

## 정답 공개됨 — 2번 (Like 상태 전이) · 2026-09-17

**원리**: 애그리게잇은 자기 생애주기를 소유한다. "좋아요 취소"는 새 객체의 탄생이 아니라 **이미 존재하는 Like의 전이**(여기선 종료)다. 그래서 흐름은 "저장소에서 꺼낸다(`reconstitute`) → 의도 메서드를 부른다(이벤트 `apply`) → 저장/삭제 → `commit()`"이고, "없는 좋아요를 취소"는 use case가 `findOne` 결과 `null`로 판정해 NOT_FOUND 분류 예외를 던진다(크로스 애그리게잇 검사는 use case 몫). 신규 생성 팩토리는 하나만 남고, 삭제 의미의 팩토리는 사라진다. 식별자는 `(profileId, postId)` 쌍 — `UniqueId` 하나로 환원되지 않으므로 `Entity<T extends UniqueId>`엔 맞지 않고, `equals`를 쌍으로 직접 정의한다.

**최소 스니펫** (domain — `remove` 삭제, `reconstitute`·`unlike`·`equals` 추가, `postId`는 자기 도메인 VO):

```ts
type LikeProps = { profileId: string; postId: PostId; createdAt: Date };

export class Like extends AggregateRoot {
  private constructor(private readonly props: LikeProps) { super(); }

  get profileId() { return this.props.profileId; }
  get postId() { return this.props.postId; }
  get createdAt() { return this.props.createdAt; }

  static create(profileId: string, postId: PostId): Like {        // 신규 — 이벤트 apply
    const like = new Like({ profileId, postId, createdAt: new Date() });
    like.apply(new PostLikedEvent(profileId, postId.value, like.createdAt));
    return like;
  }

  static reconstitute(props: LikeProps): Like {                   // 재수화 — 이벤트 없음
    return new Like(props);
  }

  unlike(): void {                                                 // 전이 — 기존 인스턴스에서
    this.apply(new PostUnlikedEvent(this.profileId, this.postId.value, new Date()));
  }

  equals(other: Like): boolean {
    return this.profileId === other.profileId && this.postId.equals(other.postId);
  }
}
```

use case 쪽 흐름(포트·예외 클래스는 아직 없음 — 모양만):

```ts
// UnlikePostHandler.execute
const like = await this.likes.findOne(profileId, new PostId(postId));   // Promise<Like | null>
if (!like) throw new /* application 예외 */ (NOT_FOUND);
const aggregate = this.publisher.mergeObjectContext(like);
aggregate.unlike();
await this.likes.delete(aggregate);
aggregate.commit();
```

**일반화 — 다음에 이 상황을 알아보는 신호**:
- 정적 팩토리가 둘 이상인데 그중 하나의 이름이 "없앤다/취소한다"다 → 팩토리가 아니라 전이다.
- 팩토리 인자에 `createdAt: now`가 들어가는데 그 시각의 의미가 "생성"이 아니다.
- `reconstitute` 없이 use case가 완성된다 → 애그리게잇이 "이미 존재하는 나"를 모른다.
- 리포지토리 포트에 `find*`가 없어도 흐름이 닫힌다 → 규칙 검사(부재·중복)가 어디에도 없다는 뜻.

### 후속 — "profileId도 ProfileId여야 하지 않나 / postId를 string으로?"

논리는 "ID는 VO"가 아니라 **자기 도메인 ID는 자기 VO, 타 도메인 ID는 원시값**. `Like`가 `post/` 안이므로 `postId: PostId`(같은 컨텍스트, nestjs.md ②), `profileId: string`(ACL 규칙). `Like`를 별도 컨텍스트로 뺀다면 둘 다 string. 결정할 것은 타입이 아니라 **Like가 post 컨텍스트 안인가** — 그 답이 타입을 정한다.
