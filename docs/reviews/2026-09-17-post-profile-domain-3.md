# CA 리뷰 — 2026-09-17 (3차) — 2차 1·2·3 반영분

**범위**: apps/api · `unique-id.vo.ts` `post-content.vo.ts` `profile.entity.ts` `postgres/schema/post.schema.ts` + 마이그레이션 0004
**기계검증**: boundary 25/25 PASS · api typecheck ✅ · api lint ❌ (6 — 전부 `drizzle/meta/*.json` 생성물, 소스 0건) · test — 미실행 (spec 없음)
**한 줄 총평**: 🔴 0건. 1·2·3의 코드는 정답대로 닫혔다. 남은 건 하나 — `unique-id.vo.ts:12`의 주석은 "spec이 이 자리를 지킨다"고 말하는데, **그 spec이 없다.** 세 번 연속 같은 질문이 남았다: 검증 코드가 맞다는 걸 무엇이 알려주는가?

> 사용자 답변 반영: packages/schemas 보류 항목·`Entity` 미사용은 **의도**로 확인 → 반복 카운트에서 제외, "보류 목록"으로 이동. `postgres/` vs `drizzle/`는 문서 2곳(ARCHITECTURE › File Location Summary, apps/api/AGENTS.md › 절차 4)과 코드 위치 불일치 — 코드나 문서 중 하나를 맞추면 닫힌다.

## 먼저 볼 것

### 1. 🟡 주석이 약속한 spec이 없다
- 위치: `apps/api/src/shared/domain/value-objects/unique-id.vo.ts:12` ("지금은 spec이 이 자리를 지킨다") — `apps/api/src`의 spec은 `get-health.handler.spec.ts`·`env.schema.spec.ts` 둘뿐, 도메인 spec 0
- 규칙: apps/api/AGENTS.md › 테스트 › "단위: 소스 옆 `*.spec.ts`" · review-checklist §6 › "테스트가 **아예 없는** 새 코드는 🟡 — 이 코드에서 가장 먼저 깨질 분기는 무엇이고, 그걸 어떻게 알게 되는가?"
- 왜: 2차의 정규식 버그는 spec이 있었으면 작성 시점에 잡혔다. 이번에 정규식을 고쳤는데 — 고친 정규식이 맞다는 건 지금 무엇이 보장하는가? 같은 자리다. 정답에서 준 spec 뼈대는 코드보다 먼저 옮겨 적으라는 뜻이었다. 세 VO(`UniqueId`·`PostContent`·`Handle`) 모두 "틀린 입력" 목록이 머릿속에만 있다.
- 생각해볼 것: 도메인 예외를 연결하는 날, 어떤 입력이 던져야 하고 어떤 입력이 통과해야 하는지 목록이 어디에 적혀 있는가? 그 목록이 코드로 있으면 예외 연결은 "빨간 것을 초록으로" 한 번이면 끝난다.
- ↻ 3회째 (1차 "가장 싸게 고정하는 파일은?", 2차 "spec을 먼저 써 보라")

### 2. 🔵 `validateName`이 생성자에서 `register`로 이동 — `reconstitute`는 이제 검사하지 않는다
- 위치: `apps/api/src/profile/domain/entities/profile.entity.ts:56` (`register` 안 호출), `:75` (`reconstitute`는 우회)
- 문서: nestjs.md는 `reconstitute`가 "이벤트 없이 생성"한다고만 하고 검증 여부는 말하지 않는다. typescript.md › "경계에서 검증하고 안에서 신뢰하라"를 DB에 적용하면 재수화 값은 신뢰 대상 → 지금 코드가 맞다.
- 반대쪽: `handle`은 `Handle.create`로 재수화되므로(nestjs.md › "재수화 경로의 VO 조립은 어댑터 몫") DB에서 와도 검증을 지난다. 같은 애그리게잇 안에서 VO 필드는 재수화 시 검증되고 원시 필드는 안 되는 비대칭이 생긴다. `name`이 VO였다면 이 질문 자체가 없다.
- 판단: 어느 쪽이든 되지만, "왜 `name`은 VO가 아닌가"(nestjs.md VO 도입 기준 ②: 원시 타입 이상의 불변식)에 답이 있으면 그 답이 이 위치도 정한다. 오타 `NAME_MAX_LENGHT`는 그대로.

## 나머지

- 🟡 `post_likes.profileId/postId` — 여전히 `.notNull()` 없음(`post.schema.ts:17-18`). 복합 PK라 DB는 강제하지만 `$inferSelect`는 `string | null`. `authorId`·`content`에 한 일을 여기도. ↻ 3회째 (row·null 불일치)
- 🔵 `content: text` — 도메인 상한 280인데 DB는 무제한. `handle`·`name`은 `varchar(n)`으로 맞췄다. 문서 규칙은 없다 — 일관성 판단.
- ℹ️ 마이그레이션 5개(0004는 NOT NULL 둘). 첫 커밋 전 squash 여부는 여전히 열린 결정.
- ℹ️ api lint 6건 — `drizzle/meta/*.json`. 마이그레이션이 늘수록 늘어난다. 제외/포맷 결정을 미루는 비용이 커지는 중.

## 보류 목록 (의도 확인됨 — 반복 카운트 제외, 잊지 않기 위해)

- packages/schemas: `import { z }`(AGENTS.md 절차 1) · `*.schema.test.ts`(절차 3) · `RegisterProfileDto`(스키마 없는 타입·용어집 DTO 충돌) · `StrictPick`(= `Pick`과 동일 타입 — `StrictOmit`만 엄격함이 추가됨)
- `shared/domain/entity.ts` — 상속처 0, 향후 사용 예정. 쓰게 될 때 `AggregateRoot` shim과의 관계를 정한다.
- 영속성 스키마 경로 `postgres/`·단수 파일명 vs 문서 `drizzle/`·`{복수형}` — 코드 또는 문서 2곳 중 하나를 맞춘다.

## 잘한 점

- 🟢 `unique-id.vo.ts` — `static readonly` 정규식, `$` 앵커, `[1-8]`, `??` 하나로 "없음" 통일. 정답을 옮겨 적은 게 아니라 이해한 흔적(주석 문구까지 바꿈).
- 🟢 `post-content.vo.ts:5` — private 생성자. 이제 `Handle`과 같은 모양이고 `create` 외 경로가 없다. **VO 생성 시 검증 규칙 — 코드 기준으로 닫힘.** (예외 TODO만 남음)
- 🟢 `post.schema.ts:10` `content.notNull()` + 마이그레이션 0004 — 도메인 "비어 있을 수 없다"가 DB에도 도착했다. `toDomain`의 `null` 분기가 사라진다.
- 🟢 `Profile.validateName` `static` + `NAME_MAX_LENGHT` `static readonly` — 2차 지적 반영.

## 다음 단계

1번 — `unique-id.vo.spec.ts`부터. 정답에 뼈대가 있다. 예외 연결 전이라 실패 케이스는 `it.todo`로 목록만 고정해도 된다. 그다음 같은 모양으로 `post-content.vo.spec.ts`·`handle.vo.spec.ts`. 세 파일이 생기면 도메인 예외 연결이 "TODO 채우기"가 아니라 "빨강→초록"이 된다. 고친 뒤 `/ca-review`.
