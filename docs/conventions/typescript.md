# TypeScript — 컨벤션 (행동 규칙)

> 빌드 실행 세션(execute.py)이 읽는 **행동 컨벤션**이다 — 관용구 · enforceable 규칙 ·
> 스택별 edge case · 안티패턴만 담는다. 디렉터리 구조 / 레이어 / 파일 위치 / alias는
> ARCHITECTURE.md가 소유하므로 여기서 중복하지 않는다.
>
> 다른 스택 컨벤션과 함께 적용되는 **횡단(cross-cutting) 규칙**이다 — 프레임워크 스택
> 이름과 나란히(`["nestjs", "typescript"]`) 거의 항상 동봉된다.

## 관용구 (Idioms)

- **경계에서 검증하고 안에서 신뢰하라.** 외부 입력(HTTP body, `JSON.parse`, env, IPC arg)은
  진입 경계에서 런타임 스키마(Zod 등)로 한 번 파싱하고, 그 안쪽은 정적 타입을 믿는다.
  타입은 런타임에 지워지므로 타입만으로는 외부 데이터 형태를 보장하지 못한다.
- **상태는 discriminated union으로 모델링한다** — `{ kind: "ok"; value: T } | { kind: "err"; error: E }`.
  불가능한 상태를 타입으로 막고, `switch (s.kind)`로 좁힌다.
- **객체 리터럴 검증엔 `satisfies`를 쓴다** — `as`로 강제 변환하지 않고 타입 적합성을 확인하면서
  좁은 추론을 유지한다.
- **리터럴 고정엔 `as const`**, 열거엔 `enum` 대신 union literal + `as const` 객체를 쓴다.
- **`switch` default에서 `never`로 exhaustiveness를 강제한다** — `const _exhaustive: never = x`.
  새 variant가 추가되면 컴파일 에러로 빠짐을 잡는다.
- **타입 전용 import는 `import type`** — 런타임 부작용·순환 의존을 피하고 번들에서 제거되게 한다.
- **불변 데이터는 `readonly`/`ReadonlyArray`로 표시한다.** 의도치 않은 변형을 컴파일 타임에 막는다.
- **기본값엔 `??`(nullish), 단축 평가엔 `||`** — `0`/`""`/`false`가 유효 값일 때 `||`는 이를 덮어쓴다.
- **에러는 좁혀서 다룬다** — `catch (e: unknown)`로 받고 `instanceof`/타입 가드로 좁힌 뒤 사용한다.

## enforceable 행동 규칙

> 강제는 프로젝트 린터(ESLint·Biome 등)와 타입체커(`tsc`)가 하고 phase `acceptance`가 lint·typecheck를 돌리게 하라 — 특정 도구를 강제하지 않는다(커스텀 훅도 아니다). `[기계검증]` 표시는 그 자동 검증 후보다.

- **`any`를 쓰지 마라.** 이유: 타입 검사를 그 지점부터 무력화해 런타임 버그를 컴파일 타임에
  못 잡는다. 불가피하면 `unknown`으로 받아 좁혀라. [기계검증] (`: any` / `as any` grep, `noImplicitAny`)
- **`@ts-ignore`/`@ts-expect-error`를 설명 주석 없이 달지 마라.** 이유: 억제된 오류는 조용히
  썩는다. 굳이 억제할 땐 `@ts-expect-error`(미사용 시 자체 경고)를 쓰고 이유를 한 줄 남겨라. [기계검증]
- **non-null assertion `!`를 외부·비동기·옵셔널 값에 쓰지 마라.** 이유: `undefined`를 숨겨
  "cannot read property of undefined" 런타임 크래시로 옮긴다. 명시적 가드로 좁혀라.
- **`const enum`을 쓰지 마라.** 이유: `isolatedModules`(Vite/esbuild/SWC) 빌드에서 인라인이 깨진다.
  일반 `enum`은 무방하나, 단순 상수 집합엔 union literal + `as const`가 더 가볍다.
- **floating promise를 만들지 마라** — Promise를 반환하는 호출은 `await`하거나 명시적으로
  `void`/`.catch`로 처리하라. 이유: unhandled rejection이 조용히 유실된다. [기계검증] (`no-floating-promises`)
- **`JSON.parse`/네트워크 응답을 타입 단언(`as T`)으로 신뢰하지 마라.** 이유: 런타임 형태는
  보장되지 않는다 — 스키마로 검증한 뒤 타입을 얻어라.
- **`Function`·`Object`·`{}`·`any[]` 같은 광범위 타입을 시그니처에 쓰지 마라.** 이유: 사실상 `any`라
  호출 안전성을 잃는다. 구체 시그니처/제네릭으로 좁혀라.

## 스택별 흔한 Edge Case

- **빈 배열 `.reduce()`** — 초기값 없이 호출하면 `TypeError`. 항상 초기값을 줘라.
- **`Number()` / `parseInt()`** — 잘못된 입력은 `NaN`을 반환하고, `NaN`은 모든 비교가 `false`다.
  `Number.isNaN`으로 명시 검사.
- **인덱스 접근** — `arr[i]`는 `noUncheckedIndexedAccess` 없이는 `T`로 추론되지만 런타임엔
  `undefined`일 수 있다. 경계 밖 접근을 가정에 넣지 마라.
- **`JSON.parse("")`** — 빈 문자열은 throw. fetch 빈 본문·파일 누락 케이스를 감싸라.
- **부동소수/타임존** — `0.1 + 0.2 !== 0.3`, `new Date("...")`의 로컬/UTC 해석 차이. 금액은 정수
  최소단위로, 날짜는 명시적 타임존으로.
- **falsy 분기** — `if (count)` / `value || default`는 `0`·`""`을 누락 취급한다. nullish로 구분.

## 안티패턴

- **`as`로 컴파일러를 설득하기** — 단언 남발은 타입 시스템을 끄는 것과 같다. 가드로 좁혀라.
- **깊은 옵셔널 체이닝으로 에러 삼키기** — `a?.b?.c ?? fallback`이 실제 버그(상류 null)를 가린다.
- **요청하지 않은 제네릭/추상화** — 호출처가 하나인데 타입 파라미터를 다는 것은 과설계다.
