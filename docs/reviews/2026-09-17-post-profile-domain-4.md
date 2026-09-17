# CA 리뷰 — 2026-09-17 (4차) — 3차 2번(`Name` VO) 반영분

**범위**: apps/api · `profile/domain/value-objects/name.vo.ts`(신규) `profile.entity.ts` · packages/schemas `types.ts` · `apps/api/AGENTS.md`
**기계검증**: boundary 25/25 PASS · api typecheck ✅(기존 dist 기준) · **schemas typecheck ❌ (1 — `profile.schema.ts:2` `StrictPick` 없음, TS2305 → build도 실패)** · api lint ❌ (6 — `drizzle/meta` 생성물) · test — 미실행
**한 줄 총평**: 🔴 0건. `name`이 VO가 되면서 3차 🔵(재수화 검증 비대칭)는 자연히 닫혔다. 대신 1차에서 🟢였던 **VO 생성 위치 ④**가 뒤집혔다 — `register`가 `Name`을 받게 되면서 "누가 VO를 만드는가"의 근거가 사라졌다.

> 사용자 결정 반영: "spec 없음"은 구현 단계에서 쓰지 않기로 → 보류(의도), 카운트 정지. `apps/api/AGENTS.md`가 `postgres/`로 갱신됨 — 문서/코드 택1 중 문서 쪽 선택 확인.

## 먼저 볼 것

### 1. 🟡 `register(name: Name)` — 이 VO는 누가 만들어야 하는가
- 위치: `apps/api/src/profile/domain/entities/profile.entity.ts:53` (`name: Name` 파라미터) vs `apps/api/src/post/domain/entities/post.entity.ts:44` (`content: string` → 팩토리 내부 `PostContent.create`)
- 규칙: nestjs.md › 관용구 › VO 생성 위치 › "④ 값 VO는 판단 규칙으로: 핸들러가 포트 호출 때문에 이미 만든 VO(중복 조회용 `Email` 등)…는 핸들러가 조립해 팩토리에 전달하고, **나머지는 원시값으로 넘겨 팩토리가 내부 생성한다** — 같은 값의 VO를 핸들러와 팩토리가 두 번 만들지 않는다."
- 왜: `handle: Handle`은 유일성 선조회(`findByHandle`)로 핸들러가 이미 만든 VO라 ④의 앞절에 해당한다. `name`은 어떤 포트 호출에도 쓰이지 않는다 — ④의 뒷절. 1차 🟢에서 "이 비대칭을 ④로 설명할 수 있는가"를 물었던 이유가 바로 이 자리다. 지금은 `Post.create`와 `Profile.register`가 같은 종류의 값(포트 무관 값 VO)을 다르게 받는다.
- 생각해볼 것: 앞으로 `RegisterProfileHandler`가 `Name.create(cmd.name)`을 호출할 이유가 있는가? 없다면 그 줄은 왜 핸들러에 있어야 하는가? `avatarUrl`은 여전히 원시값인데 `name`만 VO로 받는 기준은 무엇인가?

### 2. 🟡 `Name.create` — 형제 VO와 검증 모양이 다르다
- 위치: `apps/api/src/profile/domain/value-objects/name.vo.ts:13-19` — `trim` 없음, 빈 값 검사 없음, 상한만
- 규칙: nestjs.md › 관용구 › "값 객체는 생성 시 검증 — 유효하지 않은 값으로는 아예 생성되지 않게". 와이어 계약은 `ProfileSchema.name: z.string().min(1).max(50)` — 하한이 있다.
- 왜: `Name.create('')`·`Name.create('   ')`가 통과한다. `Handle`·`PostContent`는 둘 다 `trim` → 빈 값 검사 → 형식/길이 순서인데 `Name`만 상한 하나다. 같은 코드베이스의 VO 세 개가 서로 다른 모양이면 네 번째 VO를 쓸 때 어느 것을 복사할지 모른다.
- 생각해볼 것: `'   '`(공백 3자)는 유효한 이름인가? 그 답이 zod에는 적혀 있는데 도메인에는 없다 — 어느 쪽이 원본인가(1차 3번과 같은 질문).

## 나머지

- ❌ **빌드 깨짐** — `packages/schemas/src/types.ts`에서 `StrictPick`을 지웠는데 `profile.schema.ts:2`가 아직 import한다. `@social/schemas` typecheck·build 모두 실패 → 다음 클린 빌드에서 `@social/api`도 `Cannot find module '@social/schemas'`. (아키텍처 아님 — 툴체인 줄)
- ℹ️ `apps/api/AGENTS.md`는 `postgres/`로 맞췄지만 `docs/ARCHITECTURE.md`(Directory Tree · Layer Map · File Location Summary 세 곳)는 아직 `drizzle/`. 파일명 `{domain-복수형}`도 두 문서 모두 그대로(코드는 단수).
- 🟡 `post_likes.profileId/postId` `.notNull()` — 변동 없음. ↻ (카운트 유지)

## 보류 목록 (의도 확인 — 카운트 정지)

- 도메인 spec — 구현 단계에서 작성하지 않음 (사용자 결정 2026-09-17)
- packages/schemas: `import { z }` · 테스트 · `RegisterProfileDto` · `StrictOmit`(호출처 0)
- `entity.ts` 상속처 0
- 영속성 스키마 파일명 단수 vs 문서 복수형

## 잘한 점

- 🟢 `Name` VO 도입 — nestjs.md VO 도입 기준 ①②(교체 가능 + 원시 이상의 불변식) 충족. 3차 🔵 "재수화 시 VO 필드만 검증되는 비대칭"이 구조적으로 사라졌다 — `reconstitute` 경로도 어댑터가 `Name.create`를 거치게 된다.
- 🟢 `name.vo.ts` — private 생성자 · `static readonly` · `equals` · 파일명 = 클래스명. 오타 `LENGHT`도 사라졌다.
- 🟢 `apps/api/AGENTS.md` 갱신 — 코드/문서 불일치를 "문서를 코드에 맞춘다"로 결정하고 실행. 다음 사람이 `drizzle/`를 찾다 헤매지 않는다.

## 다음 단계

빌드부터(`profile.schema.ts:2`). 그다음 1번 — 정답을 보기 전에 `Post.create`와 나란히 놓고 ④를 한 번 더 읽어 보라. 고친 뒤 `/ca-review`.

---

## 정답 공개됨 — 1번 (`register(name)` VO 생성 위치) · 2026-09-17

**원리**: ④의 판단 기준은 "이 VO를 핸들러가 **이미** 만들 수밖에 없는가"다. `Handle`은 `findByHandle(handle)` 선조회 때문에 핸들러가 먼저 만들고, 그걸 그대로 팩토리에 넘기면 두 번 만들지 않는다. `Name`은 어떤 포트도 요구하지 않으므로 핸들러가 만들 이유가 없고, 원시값으로 넘겨 팩토리가 내부에서 `Name.create`한다 — `Post.create(content: string)`이 `PostContent`를 만드는 것과 같은 자리. 시그니처가 곧 문서가 된다: 파라미터가 VO면 "핸들러가 이미 갖고 있는 값", 원시값이면 "여기서 처음 검증되는 값".

**최소 스니펫**:

```ts
static register(handle: Handle, name: string, avatarUrl: string | null): Profile {
  const profile = new Profile({
    id: new ProfileId(),
    handle,
    name: Name.create(name),          // 포트 무관 값 VO → 팩토리 내부 생성
    avatarUrl,
    createdAt: now, updatedAt: now,
  });
  …
}
```

`ProfileProps.name: Name`과 `reconstitute(props)`는 그대로 — 재수화 경로의 VO 조립은 어댑터 몫이다.

**일반화 — 신호**:
- 팩토리 파라미터 타입을 정할 때 "이 VO를 핸들러가 포트 호출에 쓰는가?"만 묻는다. 예 → VO, 아니오 → 원시값.
- 같은 애그리게잇에서 VO 파라미터와 원시 파라미터가 섞여 있으면 각각 ④의 앞절/뒷절로 설명돼야 한다. 설명이 안 되는 쪽이 틀린 쪽.
- 핸들러 spec에 `Name.create`가 등장하면 의심 — 핸들러가 팩토리 일을 하고 있다.

## 정답 공개됨 — 2번 (`Name.create` 검증 모양) · 2026-09-17

**원리**: VO 검증은 "정규화 → 존재 → 형식/길이" 순서로 통일한다. 정규화(`trim`)를 먼저 해야 `'   '`가 빈 값으로 잡히고, 저장하는 값은 정규화된 값이어야 `equals`가 공백 차이로 갈리지 않는다. 하한(`min(1)`)은 zod에만 있었는데 도메인이 원본이어야 한다 — zod는 도메인 규칙을 와이어에서 앞당겨 거를 뿐이다.

**최소 스니펫**:

```ts
static create(value: string): Name {
  const trimmed = value.trim();
  if (!trimmed) {
    // TODO: Domain exception
  }
  if (trimmed.length > Name.NAME_MAX_LENGTH) {
    // TODO: Domain exception
  }
  return new Name(trimmed);
}
```

**일반화 — 신호**:
- VO `create`가 `trim` 없이 길이만 보면 `'   '`로 즉시 검산.
- `return new X(value)`에서 `value`가 검증한 변수와 다른 이름이면 저장값 ≠ 검증값(2차 `PostContent`와 같은 실수).
- zod 스키마에 있는 제약이 도메인 VO에 없으면 "누가 원본인가"를 묻는다 — 답은 항상 도메인.

### 후속 — "1번 비대칭, 과한 것 아닌가?"

④는 문서 규칙이라 지적은 정당하지만 판돈이 작다(VO 중복 생성 비용 = 문자열 검사 1회). ④가 지키는 것 중 중요한 건 "command/presentation은 VO를 모른다" 하나이고, 이는 팩토리 시그니처와 무관하게 지켜진다. 선택지: (1) ④ 유지 — "포트에 넘겼나?" 한 질문. (2) 단순화 — 팩토리는 전부 원시값, VO는 팩토리 내부 생성으로 통일하고 nestjs.md ④ 앞절을 그에 맞게 수정. **추천 (2)** — 결정 시 코드·문서 동시 이동.

### 후속 — "그러면 name을 VO로 만들 필요도 없지 않나?"

맞다 — 3차 항목은 🔵(선택)였다. 문서 기준(①②)은 문턱이 너무 낮아 실용 기준이 못 된다. 실용 문턱: **같은 규칙이 두 군데 이상 입구에서 지켜져야 하면 VO, 한 군데면 팩토리 검증.** `name`은 `rename`이 예정돼 있으니 이미 만든 `Name`은 유지. `avatarUrl`처럼 입구가 하나인 값은 형식이 있어도 원시값 + 팩토리 검증.
