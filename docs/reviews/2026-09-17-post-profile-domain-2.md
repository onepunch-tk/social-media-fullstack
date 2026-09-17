# CA 리뷰 — 2026-09-17 (2차) — Post·Profile 도메인 피드백 반영분

**범위**: apps/api · `post/` `profile/` `shared/domain/` `shared/infrastructure/database/postgres/` + packages/schemas · 1차와 동일 범위 (`git diff HEAD` + untracked)
**기계검증**: boundary 25/25 PASS · schemas lint ✅ typecheck ✅ · api lint ❌ (5 — 전부 `drizzle/meta/*.json` 생성물 포맷, 소스 0건) · api typecheck ✅ · test — 미실행 (spec 없음)
**한 줄 총평**: 🔴 0건 — 1차의 경계 위반은 해소됐다. 이번 배움은 **"TODO로 비워둔 검증 코드는 한 번도 실행된 적이 없다"** — `UniqueId`의 정규식은 켜는 순간 모든 실제 UUID를 거부한다. 검증을 나중에 켤 거면 테스트를 먼저 써야 그 날이 안전하다.

## 먼저 볼 것

### 1. 🟡 `UniqueId` 검증 — 켜는 순간 전부 거부되고, `''`는 통과한다
- 위치: `apps/api/src/shared/domain/value-objects/unique-id.vo.ts:5-6` (정규식 끝 `\$`), `:9-13` (`if (id)` 가드 + `id ?? randomUUID()`)
- 규칙: typescript.md › 관용구 › "기본값엔 `??`(nullish), 단축 평가엔 `||` — `0`/`""`/`false`가 유효 값일 때 `||`는 이를 덮어쓴다" · edge case › "falsy 분기 — `if (count)` / `value || default`는 `0`·`""`을 누락 취급한다. nullish로 구분." · nestjs.md › 관용구 › "유효하지 않은 값으로는 아예 생성되지 않게"
- 왜: 확인 결과 — `UUID_PATTERN.test(randomUUID())`는 **false**, 끝에 `$` 문자를 붙인 문자열은 true(정규식 리터럴 안의 `\$`는 앵커가 아니라 리터럴 `$`다). 지금은 TODO라 조용하지만 도메인 예외를 연결하는 날 `reconstitute` 전부가 던진다. 그리고 가드는 truthy(`if (id)`)인데 기본값은 nullish(`??`)라 `new PostId('')`는 검증을 건너뛰고 `value === ''`로 생성된다.
- 생각해볼 것:
  - 이 정규식이 틀렸다는 걸 지금까지 무엇이 알려줄 수 있었는가? 1차 리뷰의 질문 — "`PostContent.create('')`가 실패해야 한다는 사실을 가장 싸게 고정하는 파일은?" — 에 대한 답이 여기서도 같다.
  - `if (id)`와 `id ?? …`는 "없음"을 다르게 정의한다 — 하나로 통일하면 어느 쪽이어야 하는가?
  - `UUID_PATTERN`이 `private readonly`(인스턴스 필드)인데 `Handle.PATTERN`은 `private static readonly`다 — 차이가 의미 있는가?

### 2. 🟡 VO 생성 시 검증 — `PostContent`만 아직 문이 열려 있다
- 위치: `apps/api/src/post/domain/value-objects/post-content.vo.ts:5` (public 생성자 — `new PostContent('')` 가능), `:3` (`static` 상수 `readonly` 아님) · `apps/api/src/profile/domain/entities/profile.entity.ts:22` (`NAME_MAX_LENGHT` 오타, 인스턴스 필드)
- 규칙: nestjs.md › 관용구 › "값 객체는 생성 시 검증·불변·`equals` — 유효하지 않은 값으로는 아예 생성되지 않게" · typescript.md › 관용구 › "불변 데이터는 `readonly`"
- 왜: `trimmed` 저장·`equals`·파일명은 고쳐졌다. 남은 건 생성자 하나 — `create`를 거치지 않는 경로가 있는 한 "생성 시 검증"은 보장이 아니라 관례다.
- 생각해볼 것: `Handle`과 `PostContent`의 생성자 선언을 나란히 놓으면 한 단어가 다르다. `validateName`의 상수는 왜 `Handle.PATTERN`처럼 static이 아닌가?
- ↻ 2회째 (직전: 2026-09-17 1차)

### 3. 🟡 `posts.content` — 도메인은 필수·≤280, DB는 NULL 허용·무제한
- 위치: `apps/api/src/shared/infrastructure/database/postgres/schema/post.schema.ts:10` (`text('content')` — `.notNull()` 없음, 길이 없음), `:17-18` (`post_likes.profileId/postId` 여전히 `string | null` 타입)
- 규칙: nestjs.md › 관용구 › "도메인↔영속 모델 매핑은 리포지토리 어댑터가 소유한다 … `toDomain`은 엔티티의 `reconstitute`를 호출한다"
- 왜: `authorId`는 `.notNull()`을 붙였는데 새로 넣은 `content`는 안 붙였다 — 같은 실수가 자리를 옮겼다. `toDomain(row)`가 `row.content: string | null`을 `PostContent`로 바꾸려면 `null` 분기가 생기고, 그 분기는 도메인 규칙("내용은 비어 있을 수 없다")을 어댑터가 두 번째로 알게 되는 자리다. `varchar(15)`·`varchar(50)`은 도메인 상한과 맞췄으면서 `content`만 `text`인 것도 같은 질문.
- 생각해볼 것: `profiles.handle`·`name`은 어떻게 선언했는가? 그 규칙을 `content`에 그대로 적용하면 무엇이 되는가? `post_likes`의 두 키 컬럼은 복합 PK라 DB는 NOT NULL을 강제하는데 `$inferSelect` 타입은 왜 `null`을 허용하는가?
- ↻ 2회째 (직전: 2026-09-17 1차)

## 나머지

- 🟡 **stale TODO** — `like.entity.ts:39` "TODO: 좋아요 Event 등록"과 `:53` "TODO: 취소 Event 등록" — 바로 아랫줄이 이미 `apply`한다. 다음 사람(또는 다음 주의 나)이 "아직 안 됐구나"로 읽는다. 질문: 이 두 TODO가 가리키는 미완 작업이 실제로 남아 있는가?
- 🟡 **`PostUnlikedEvent`에 `occurredAt` 없음** — `post-unliked.event.ts` vs `post-liked.event.ts:5`. 1차 지적 그대로. 카운터 핸들러가 두 이벤트를 한 스트림으로 받을 때 시각 없는 쪽은 순서를 정할 수 없다.
- 🟡 **packages/schemas — 1차와 동일** — `import { z }`(AGENTS.md 절차 1), `*.schema.test.ts` 없음(절차 3), `RegisterProfileDto`(스키마 없는 타입 + 용어집 DTO 충돌), `StrictPick` = `Pick`. TODO도 없이 그대로다 — 의도적으로 미룬 것인지, 놓친 것인지. ↻ 2회째
- 🟡 **`Entity` 호출처 0** — `abstract`로 바뀌었지만 여전히 아무도 상속하지 않고, `Post`·`Profile`은 `_id`/`get id()`를 재선언한다. 남길 거면 `AggregateRoot` shim이 이걸 알아야 하고, 아니면 지워야 한다. ↻ 2회째 (typescript.md › 안티패턴 › 요청하지 않은 추상화)
- 🟡 **영속성 스키마 경로 `postgres/` vs 문서 `drizzle/`** — 코드·문서 어느 쪽도 안 움직였다. ↻ 2회째
- 🔵 1차의 토론 항목 전부 유지 — 카운터 전략(`likes-count.handler.ts:5` TODO), `PostId`/`ProfileId` 구조적 동일, domain의 `node:crypto`, `PostSchema.author` 임베드, `post_likes.postId` onDelete 없음, `$defaultFn` vs DB `DEFAULT`, 마이그레이션 4개 squash 여부.
- ℹ️ `drizzle-kit` `~`→`^` 이유 미기재 · api lint 5건은 `drizzle/meta/*.json` 생성물 — 제외 목록에 넣을지 포맷할지 결정이 아직 없다.

## 잘한 점

- 🟢 **🔴 해소** — 이벤트가 `post/domain/events/`로 이동, `like.entity.ts:2-3`이 `../events/`를 참조. domain 순수성 grep 범위 안에 들어왔다. (ARCHITECTURE › File Location Summary)
- 🟢 `Like` — `reconstitute` + `unlike()` 의도 메서드 + 쌍 `equals`. `static remove` 삭제. `postId: PostId`(자기 도메인) / `profileId: string`(타 도메인)의 비대칭이 후속 토론 그대로 반영됐다. (nestjs.md › 관용구 › 애그리게잇 · ACL)
- 🟢 `post-content.vo.ts` — 파일명 = 클래스명, `trimmed` 저장, `equals`. (nestjs.md › 안티패턴 › 드리프트 해소)
- 🟢 `common.schema.ts:8` `idColumn = { id: … }` 스프레드 — `$inferSelect` 키가 `id`. `posts.authorId.notNull()`. (nestjs.md › row 타입은 스키마에서 파생)
- 🟢 `likes-count.handler.ts:1` `type IEventHandler` 인라인 — 선례와 동일한 효과. (typescript.md › import type)
- 🟢 `Profile` 생성자의 `validateName` — `register`·`reconstitute` 두 경로가 같은 검사를 지난다. 불변식이 처음으로 도메인 안에 자리를 잡았다(아직 TODO지만 위치는 맞다).
- 🟢 `UniqueId`가 검증을 갖게 된 방향 자체 — 정규식은 틀렸지만 "ID VO도 형식을 지킨다"는 판단은 맞다.

## 기존 문제 (이번 변경 밖 — 참고만)

- 없음.

## 다음 단계

1번은 정규식 한 글자와 가드 하나 — 고치기 전에 **그걸 잡는 spec을 먼저** 써 보라(`*.spec.ts` 소스 옆, vitest). 그 spec이 다른 VO의 TODO도 같은 방식으로 지켜 준다. 고친 뒤 `/ca-review`.

---

## 정답 공개됨 — 1번 (UniqueId 검증) · 2026-09-17

**원리**: 세 가지가 얽혀 있다. ① 정규식 리터럴 안에서 `\$`는 "문자열 끝"이 아니라 "문자 `$`"다 — 앵커는 이스케이프 없이 `$`. ② "값이 없다"의 정의를 한 곳으로 통일한다 — 파라미터가 `string | undefined`면 "없음"은 `undefined`뿐이고, 그러면 가드는 `id === undefined`(또는 `??` 한 줄로 분기 자체를 없앤다)여야 `''`가 검증을 우회하지 못한다. ③ 상수 정규식은 인스턴스마다 만들 이유가 없으니 `static readonly`. 그리고 이 셋 모두 spec 한 파일이 먼저 있었으면 작성 즉시 드러났다 — TODO로 비워둔 검증은 "나중에 켜는 날"이 곧 "처음 실행되는 날"이다.

**최소 스니펫**:

```ts
export class UniqueId {
  private static readonly UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private readonly _value: string;

  constructor(id?: string) {
    const value = id ?? randomUUID();          // "없음" = undefined 하나로 통일
    if (!UniqueId.UUID_PATTERN.test(value)) {
      // TODO: Domain exception 구현시 적용 — 지금은 spec이 이 자리를 지킨다
    }
    this._value = value;
  }
  // get value / equals 동일
}
```

(`[4]` → `[1-8]`: DB `uuid` 컬럼은 v4만 받지 않는다. 자기 생성은 v4지만 재수화 값은 형식만 맞으면 된다.)

spec 뼈대 — 소스 옆 `unique-id.vo.spec.ts`(vitest globals):

```ts
describe('UniqueId', () => {
  it('인자 없이 만들면 자기 생성값이 형식을 통과한다', () => {
    expect(() => new UniqueId()).not.toThrow();
  });
  it.each(['', 'not-a-uuid', `${crypto.randomUUID()}$`])('%j 는 거부된다', (bad) => {
    expect(() => new UniqueId(bad)).toThrow();   // 예외 연결 전까지는 .todo 로 두고 목록만 고정
  });
  it('같은 문자열이면 equals', () => { /* … */ });
});
```

**일반화 — 다음에 이 상황을 알아보는 신호**:
- 정규식 안에 `\$`·`\^`가 보이면 앵커인지 리터럴인지 즉시 의심 — 앵커에는 백슬래시가 없다.
- 같은 함수 안에 `if (x)`와 `x ?? …`가 공존하면 "없음"의 정의가 두 개다 — `''`·`0`으로 즉시 검산.
- 검증 함수 본문이 TODO뿐이라면, 그 함수는 아직 한 번도 "틀린 입력"을 만난 적이 없다 — 켜기 전에 실패 케이스 목록을 spec으로 먼저 고정한다.
- `private readonly` 정규식/상수가 인스턴스 필드에 있으면 `static`을 빼먹은 것.
