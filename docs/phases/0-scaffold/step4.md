# Step 4: integration-gate

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- [docs/PRD.md](/docs/PRD.md)
- [docs/ARCHITECTURE.md](/docs/ARCHITECTURE.md)
- [docs/adr/ADR-001.md](/docs/adr/ADR-001.md)
- [docs/adr/ADR-012.md](/docs/adr/ADR-012.md)
- [AGENTS.md](/AGENTS.md)
- [apps/api/AGENTS.md](/apps/api/AGENTS.md)
- [apps/mobile/AGENTS.md](/apps/mobile/AGENTS.md)
- [packages/schemas/AGENTS.md](/packages/schemas/AGENTS.md)
- [turbo.json](/turbo.json)
- [package.json](/package.json)
- [docs/conventions/typescript.md](/docs/conventions/typescript.md)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

step0~3의 산출물을 하나의 Workspace로 최종 검증하고 루트 문서를 실측과 맞춘다. 코드를 새로 만들지 않는다 — 발견한 불일치를 최소 수정한다. 먼저 루트 `AGENTS.md`, `turbo.json`, `package.json`, 각 App/Package의 `package.json`·`AGENTS.md`를 읽어라.

## 할 일
1. 클린 검증: `rm -rf node_modules apps/*/node_modules packages/*/node_modules packages/schemas/dist apps/api/dist apps/mobile/dist .turbo` 후 `bun install` → `bun run build && bun run lint && bun run typecheck && bun run test`가 turbo 파이프라인(캐시 없음)에서 통과하는지 확인. `test`는 `apps/api`(vitest, 실 DB 필요 — `bun run --filter @social/api db:ensure` 선행)·`apps/mobile`(jest-expo)·`packages/schemas`(bun test)를 모두 포함해야 한다. `bun run test`에 e2e가 포함되지 않으면 `apps/api`의 `test` 스크립트가 e2e도 돌리도록(`vitest run && vitest run --config ./vitest.config.e2e.ts`) 조정하거나 turbo에 `test:e2e` task를 추가하고 루트 `test`가 그것도 실행하게 한다.
2. 루트 `AGENTS.md`를 실제 트리와 동기화: '예정' 표기를 제거하고 실제 디렉터리·스크립트·패키지명(`@social/*`)을 반영, 각 App/Package AGENTS.md로의 링크, 격리 세션이 처음 읽었을 때 5분 안에 빌드·테스트를 돌릴 수 있는 수준. 4곳(`AGENTS.md`, `apps/mobile/AGENTS.md`, `apps/api/AGENTS.md`, `packages/schemas/AGENTS.md`)과 짝 `CLAUDE.md`(한 줄)가 모두 존재하는지 확인.
3. git 위생: `git status --porcelain`에 `dist/`, `.expo/`, `expo-env.d.ts`, `.env`, `node_modules/`, `.turbo/`가 나타나지 않고, `bun.lock`·`.env.example`(apps/api, apps/mobile)은 추적 대상인지 확인. 위반 시 `.gitignore` 수정.
4. `bun pm untrusted`를 실행해 차단된 lifecycle 스크립트가 있으면 루트 AGENTS.md에 기록만 한다(`trustedDependencies` 추가 금지).

## 반드시 처리할 엣지

아래 엣지/실패 모드를 구현에서 반드시 다루고, Acceptance Criteria가 이를 검증하도록 작성하라:

- 캐시 없는 순수 실행(`.turbo`·`dist` 삭제 후)에서도 전체 파이프라인 통과
- 루트 `test`가 `turbo run test`이고 api e2e가 파이프라인에 포함됨
- 생성물(`dist`, `.expo`, `expo-env.d.ts`, `.env`)이 git 추적 대상에 없음, `bun.lock`·`.env.example`은 추적됨
- AGENTS.md/CLAUDE.md 4쌍 존재, CLAUDE.md는 한 줄

## Acceptance Criteria

```bash
bun install && bun run --filter @social/api db:ensure && bun run build && bun run lint && bun run typecheck && bun run test && test -f AGENTS.md && test -f CLAUDE.md && test -f apps/api/AGENTS.md && test -f apps/api/CLAUDE.md && test -f apps/mobile/AGENTS.md && test -f apps/mobile/CLAUDE.md && test -f packages/schemas/AGENTS.md && test -f packages/schemas/CLAUDE.md && test "$(wc -l < CLAUDE.md | tr -d ' ')" -le 2 && ! git status --porcelain --ignored=no | grep -E '(^|/)(dist|\.expo|node_modules|\.turbo)/|expo-env\.d\.ts|(^|/)\.env$' && git check-ignore -q apps/api/.env
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 결과에 따라 `index.json`의 이 step status를 직접 갱신한다:
   - AC 통과 → `"status": "completed"`, `"summary"`에 다음 step이 이어받는 데 필요한 산출물 요약(생성·수정한 핵심 파일/모듈, 노출한 주요 인터페이스·시그니처, 다음 step이 따라야 할 설계 결정·제약). 과정 서술은 빼고 산출물 중심으로 간결하게
   - 3회 수정 시도 후에도 실패 → `"status": "error"`, `"error_message"`에 구체적 에러
   - 사용자 개입 필요 (API 키, 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason"` 기록 후 즉시 중단

주의: status/summary/error_message/blocked_reason은 작업 세션이 기록한다. 타임스탬프(started_at/completed_at/failed_at/blocked_at)는 runner가 기록하므로 직접 넣지 마라.

## 금지사항

- 루트 `test`를 `bun test`로 바꾸지 마라. 이유: bun 러너가 jest-expo/vitest 파일을 직접 실행해 실패한다 — `turbo run test`만.
- `trustedDependencies`를 추가하지 마라. 이유: bun 기본 신뢰 목록을 대체한다 — 차단 스크립트는 AGENTS.md에 기록만.
- AC를 통과시키려고 turbo 캐시에 의존하지 마라. 이유: 이 step은 캐시 없는 순수 실행을 검증한다 — 먼저 `.turbo`·`dist`를 지운다.
- 새 기능·새 슬라이스를 추가하지 마라. 이유: 이 step은 게이트이며 범위는 불일치 최소 수정뿐이다.
- 기존 테스트를 깨뜨리지 마라
