# React (컴포넌트 작성) — 컨벤션 (행동 규칙)

> 빌드 실행 세션(execute.py)이 읽는 **행동 컨벤션**이다 — 관용구 · enforceable 규칙 ·
> 스택별 edge case · 안티패턴만 담는다. 디렉터리 구조 / 레이어 / 파일 위치 / alias는
> ARCHITECTURE.md가 소유하므로 여기서 중복하지 않는다.
>
> 다른 스택 컨벤션과 함께 적용되는 **횡단(cross-cutting) 규칙**이다 — 프레임워크 스택
> 이름과 나란히(`["expo", "react", "typescript"]`) 동봉한다.
>
> 대상은 React DOM · React Native · Expo 공통의 **컴포넌트 작성**(`.tsx`/`.jsx`)이다. 네비게이션·
> 데이터 흐름은 expo/nextjs/react-router가, 언어 규칙은 typescript.md가 소유한다.

## 관용구 (Idioms)

- **핸들러는 상태 소유권을 따라간다** — 조상이 소유한 상태를 바꾸는 로직은 그 소유자에 두고 콜백
  prop으로 내린다. 반대로 컴포넌트-로컬 UI 상태(토글·포커스·애니메이션), 이벤트 어댑터,
  `useCallback` 래퍼는 자식에 남긴다. 기준은 "콜백이냐"가 아니라 **누가 그 상태를 소유하느냐**다.
- **이벤트 어댑터는 자식에서 도메인 값으로 변환한다** — `onPress={() => onSelect(item.id)}`.
  그래야 부모가 `GestureResponderEvent` 같은 플랫폼 타입을 import하지 않는다.
- **props·context 타입 이름은 그 주인 함수 이름을 그대로 따른다** —
  `export default function SomeComponent()`의 props는 `type SomeComponent = { ... }`이고, context는
  `type SomeContext = { ... }` + `const SomeContext = createContext<SomeContext | undefined>(undefined)`다.
  타입과 값은 서로 다른 네임스페이스라 같은 이름이 공존한다 — 계약과 구현이 한 심볼로 묶인다. 파일에
  컴포넌트가 여럿이면 각자 자기 이름을 가져간다.
- **props 타입은 `type`으로 선언한다** — `type Button = { ... }`.
- **베이스 props 확장은 `ComponentPropsWithRef`/`ComponentPropsWithoutRef`를 명시한다** —
  `import type { ComponentPropsWithRef } from 'react'` 후
  `type Button = { label: string } & ComponentPropsWithRef<typeof Pressable>`. 라이브러리가
  props 타입을 export하지 않아도 같은 방식이 통하므로 확장 문법이 하나로 통일된다.
- **이름이 겹치면 `Omit` 먼저** —
  `Omit<ComponentPropsWithRef<typeof Pressable>, 'onPress'> & { onPress: (id: string) => void }`.
- **확장했으면 `...rest`로 실제로 내려보낸다** — 타입만 넓히고 전달하지 않으면 계약이 거짓말이 된다.
- **children은 슬롯을 실제로 렌더할 때만 연다** — 래퍼·패널·카드·레이아웃 컨테이너. 필수면
  `{ children: ReactNode }`, 선택이면 `PropsWithChildren<P>`.

## enforceable 행동 규칙

> 강제는 프로젝트 린터(ESLint·Biome 등)와 타입체커(`tsc`)가 하고 phase `acceptance`가 lint·typecheck를 돌리게 하라 — 특정 도구를 강제하지 않는다(커스텀 훅도 아니다). `[기계검증]` 표시는 그 자동 검증 후보다.

- **props 타입을 `interface`로 선언하지 마라.** 이유: 같은 이름 interface는 조용히 선언 병합되지만
  `type`은 중복 시 컴파일 에러다 — props는 닫힌 계약이라 시끄럽게 실패해야 한다. variant별 유니온과
  `Omit<...> & {...}`도 `type`에서만 표현된다. [기계검증] (`.tsx`의 `interface \w+` grep)
- **props·context 타입에 `Props`·`Type` 같은 접미사를 붙이지 마라.** 이유: 접미사는 정보가 0인 반복인데
  한 번 갈라지면(`ButtonProps` vs `ButtonProperties`) 어느 쪽이 그 컴포넌트의 계약인지 검색으로 못 좁힌다.
  함수와 이름을 같게 두면 계약·구현·소비처가 한 심볼로 묶인다. [기계검증] (`type \w+Props\s*=` grep)
- **베이스와 이름이 같은 prop을 `&`로 덮지 마라.** 이유: 교차 타입은 두 시그니처를 병합해 `never`/
  호출 불가 타입을 만든다 — React Native 자신도 `Omit<ViewProps, 'children'|'style'|'hitSlop'>`을
  쓴다. `Omit`으로 먼저 제거하고 교차하라. [기계검증]
- **제네릭 컴포넌트에 `ComponentProps<typeof X>`를 쓰지 마라.** 이유: 타입 인자가 기본값으로 붕괴해
  (`ComponentProps<typeof FlatList>` = `FlatListProps<any>`) `data`·`renderItem`이 전부 `any`가 된다.
  `FlatListProps<Item>`처럼 제네릭 props 타입을 직접 써라. [기계검증]
- **bare `ComponentProps`를 쓰지 마라.** 이유: intrinsic/forwardRef 대상에선 `ref`를 포함하지만 class
  컴포넌트 대상에선 누락돼 일관되지 않는다. `WithRef`/`WithoutRef`로 의도를 명시하라.
- **부모가 소유한 상태를 바꾸는 로직을 자식 안에 작성하지 마라.** 이유: 같은 컴포넌트를 다른 맥락에
  재사용할 수 없고 상태 소유자가 흐려진다. 콜백 prop으로 받아라.
- **베이스가 이미 `children`을 제공하는데 `PropsWithChildren`을 덧씌우지 마라.** 이유: `ViewProps`엔
  중복이고, `Pressable`에선 render-prop 유니온 `({ pressed }) => ReactNode`를 교차로 파괴한다.
- **슬롯을 렌더하지 않는 leaf 컴포넌트(Icon·Avatar·Badge·Input)에 `children`을 열지 마라.** 이유:
  없는 슬롯을 타입으로 광고하고 넘어온 값은 조용히 버려진다. 막으려면 `children?: never`.

## 스택별 흔한 Edge Case

- **같은 이름의 타입·값은 선언은 되지만 import에서 부딪힌다** — 소비처가 컴포넌트(값)와 그 props 타입을
  한 선언문에서 같이 가져오면 `Duplicate identifier`다(`import SomeComponent, { type SomeComponent }`).
  한쪽에 `as` 별칭을 주면 풀린다 — 이름을 되돌리지 마라.
- **`&` 교차가 만드는 `never`** — 선언 시점엔 에러가 안 나고 호출처에서 터진다. prop 이름 충돌은
  타입을 쓸 때가 아니라 **선언할 때** `Omit`으로 막아라.
- **`PropsWithChildren`은 항상 optional** — 정의가 `P & { children?: ReactNode }`다. 필수 children은
  `{ children: ReactNode }`로 직접 선언해야 한다.
- **`children: ReactNode`는 `null`·`false`·`''`도 통과** — "비어 있지 않음"은 타입이 아니라 런타임 관심사다.
- **React 19 ref-as-prop** — 함수 컴포넌트는 `ComponentProps`와 `ComponentPropsWithRef`가 수렴하지만,
  class 컴포넌트(RN의 `View`/`Text`/`Image`/`FlatList` 타입)는 ref가 props가 아니라 영구히 갈린다.
- **`Pressable`의 `children`·`style`은 render-prop 유니온**(`({ pressed }) => ...`)이다 — 좁히면 기능이 사라진다.
- **controlled 전환의 비용** — 로컬 상태를 전부 부모로 올리면 유연해지지만 부모의 설정 부담이 커진다.
  트레이드오프이지 규칙이 아니다.

## 안티패턴

- **presentational/container 교조적 분리** — 원저자가 2019년 철회했다. 로직 분리는 커스텀 훅으로 한다.
- **확장만 하고 `...rest`를 안 넘기기** — props 타입은 넓은데 실제로는 안 먹는 유령 계약이 된다.
- **라이브러리 props를 복붙해 재선언** — 업스트림이 바뀌면 조용히 드리프트한다.
- **모든 컴포넌트에 `PropsWithChildren` 기본 장착** — 마이그레이션 shim을 설계 기본값으로 오해한 것이다.
