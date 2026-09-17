# CA 리뷰 — 2026-09-17 (5차) — 4차 1·2번 + 빌드 반영분

**범위**: `profile.entity.ts` · `name.vo.ts` · `packages/schemas/src/{profile.schema,types}.ts`
**기계검증**: boundary 25/25 PASS · schemas build ✅ typecheck ✅ · api typecheck ✅ · api lint ❌ (6 — `drizzle/meta/*.json` 생성물, 소스 0건) · test — 미실행(보류 결정)
**한 줄 총평**: 🔴 0건 · 새 🟡 0건. 도메인 선언 단계에서 열렸던 항목이 전부 닫혔거나 보류로 정리됐다. 남은 건 이월 1건과 문서 1곳뿐 — **이 슬라이스는 application 레이어로 넘어갈 준비가 됐다.**

## 먼저 볼 것

- 없음.

## 나머지 (이월)

- 🟡 `post_likes.profileId/postId` `.notNull()` 없음 — `post.schema.ts:17-18`. 복합 PK라 DB는 강제하지만 `$inferSelect`가 `string | null`이라 `toDomain`에 불필요한 `null` 분기가 생긴다. 세 번 이월됐다 — 의도(복합 PK로 충분)라면 보류로 내린다. 답만 달라.
- ℹ️ `docs/ARCHITECTURE.md` 세 곳(`database/drizzle/`)이 아직 코드·AGENTS.md(`postgres/`)와 다르다.
- ℹ️ lint `drizzle/meta` 6건 — 결정 대기.

## 잘한 점

- 🟢 `Profile.register(handle: Handle, name: string, …)` + 내부 `Name.create` — ④를 유지하는 쪽으로 결정하고 `Post.create`와 같은 모양이 됐다. 이제 두 팩토리의 파라미터 타입이 같은 문장으로 설명된다: "포트에 넘긴 값은 VO, 나머지는 원시값". (nestjs.md › VO 생성 위치 ④)
- 🟢 `Name.create` — `trim` → 빈 값 → 상한, 정규화값 저장. `Handle`·`PostContent`·`Name` 세 VO가 같은 모양이다. 네 번째 VO는 아무거나 복사하면 된다. (nestjs.md › 값 객체는 생성 시 검증)
- 🟢 `RegisterProfileDto = Pick<…>` — 내장 `Pick`으로 직접, 빌드 복구. `types.ts`엔 의미 있는 `StrictOmit`만 남았다.

## 보류 목록 (변동 없음)

- 도메인 spec 미작성 · packages/schemas 4건 · `entity.ts` · 스키마 파일명 단수 · ARCHITECTURE.md `drizzle/` 표기

## 다음 단계

application 레이어 — `post.module.ts`/`profile.module.ts`·포트·첫 use case. 그때 다시 만날 것: `#post/*`·`#profile/*` 별칭 두 곳, `LikesCountHandler` 모듈 등록, 카운터 전략(🔵), 도메인 예외 위계(`shared/domain/`)와 TODO 채우기. 새 코드가 생기면 `/ca-review`.
