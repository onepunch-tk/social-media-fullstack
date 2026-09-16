# social-media-fullstack PRD

> **생성일**: 2026-09-16 | **플랫폼**: Mobile / Backend | **문서 버전**: 0.1 | **작성자**: prd-generator

---

## 1. 프로젝트 개요 (Project Overview)

### 1.1 목적 (Purpose)
소셜 미디어 풀스택 토이 프로젝트의 스캐폴드. Turborepo 2 + bun workspaces 모노레포에 Expo SDK 57 모바일 앱(`apps/mobile`)과 NestJS 12 API(`apps/api`)를 세우고, `packages/schemas`(zod 와이어 계약)를 양쪽이 공유한다. 제품 도메인은 미정이라 제품 기능은 0이며, 비도메인 `health` 수직 슬라이스 하나(`GET /health` DB ping → 모바일 홈 화면 표시)로 "모노레포가 실제로 결선된다"를 증명하는 것이 이번 범위의 전부다. 이후 도메인이 확정되면 addendum으로 제품 기능을 추가한다.

### 1.2 배경 및 동기 (Background & Motivation)
빈 저장소에서 시작한다. 도메인 미정 상태에서 툴체인·구조·공유 계약을 먼저 세워 이후 도메인 슬라이스가 같은 모양으로 복제되게 한다.

### 1.3 대상 사용자 (Target Users)
| 페르소나 | 설명 | 사용 맥락 |
| --- | --- | --- |
| Developer | 이 저장소를 부트스트랩·검증하고 이후 도메인을 추가하는 개발자(1인 토이 프로젝트) | 로컬 macOS, bun 1.3.14, Node 24, docker의 PostgreSQL 16 컨테이너(`postgres`, localhost:5432, postgres/postgres) |

### 1.4 핵심 제약 (Key Constraints)
- 패키지 매니저는 bun 전용, Nest 런타임은 Node 24
- TypeScript ~6.0 고정(Nest CLI 12·Expo 57 템플릿이 ~6.0 고정, TS 7 보류)
- lint/format은 Biome 단일(eslint/prettier/oxlint 미도입)
- 내부 패키지는 compiled(tsc → dist) ESM — Node 타입 스트리핑이 node_modules 하위 .ts를 거부
- 도메인 명사 미확정 — 도메인 이름을 가정한 코드/스키마 금지
- docker-compose 없음, 로컬 컨테이너 재사용
- 각 step은 격리 헤드리스 세션에서 실행되며 AC는 bash 통과/실패

### 1.5 작업 범위 외 (Out of Scope)
- 모든 제품 도메인 기능(회원/게시물/피드 등 — 도메인 자체 미정)
- 인증/인가
- CI
- docker-compose
- i18n
- 웹 앱 타깃
- 배포
- drizzle 마이그레이션 생성

---

## 2. 사용자 역할 및 권한 (User Roles & Permissions)

### 2.1 역할 정의 (Role Definitions)
| 역할 | 설명 | 핵심 권한 |
| --- | --- | --- |
| Developer | 유일 행위자. 저장소를 부트스트랩·검증하고 이후 도메인을 추가하는 개발자 | 워크스페이스 부트스트랩, 전 App/Package 빌드·lint·typecheck·test, 공유 Schema 변경, API 기동, 모바일 앱 실행 |

### 2.2 권한 매트릭스 (Permission Matrix)
| 역할 | Workspace | App | Package |
| --- | --- | --- | --- |
| Developer | full | full | full |

---

## 3. 사용자 시나리오 (Use Cases)

### 3.1 유즈케이스 목록 (Use Case Inventory)
| ID | 유즈케이스(목표) | Primary Actor | Level | Format |
| --- | --- | --- | --- | --- |
| UC-1 | Workspace를 부트스트랩하고 전 App과 Package를 한 명령으로 검증한다 | Developer | user-goal | casual |
| UC-2 | Schema를 바꾸면 API와 모바일이 함께 타입체크된다 | Developer | user-goal | casual |
| UC-3 | 모바일 홈 화면에서 API Health를 확인한다 | Developer | user-goal | casual |

### 3.2 유즈케이스 상세 (Use Case Details)

### UC-1: Workspace를 부트스트랩하고 전 App과 Package를 한 명령으로 검증한다 (user-goal / Developer)
개발자가 의존성을 설치하고 하나의 파이프라인 명령으로 build·lint·typecheck·test를 전부 돌린다. 하나라도 실패하면 파이프라인이 실패로 끝나고 원인 패키지가 드러난다.

_승격 트리거: CI 도입·다중 환경 배포가 추가되면 fully-dressed_


### UC-2: Schema를 바꾸면 API와 모바일이 함께 타입체크된다 (user-goal / Developer)
개발자가 `packages/schemas`의 와이어 계약을 수정하면 API의 DTO와 모바일의 응답 파싱이 같은 타입을 참조하므로 타입체크에서 불일치가 드러난다. 빌드되지 않은 Schema를 소비하려 하면 해석에 실패해 파이프라인이 먼저 Schema를 빌드한다.

_승격 트리거: 버전이 다른 Schema를 동시에 지원해야 하면 fully-dressed_


### UC-3: 모바일 홈 화면에서 API Health를 확인한다 (user-goal / Developer)
개발자가 모바일 앱을 열면 홈 화면이 API의 Health를 조회해 각 check의 상태를 목록으로 보여준다. DB ping이 실패하면 API는 degraded 상태를 돌려주고 화면은 실패한 check를 그대로 표시한다. 네트워크에 닿지 못하거나 응답이 Schema와 다르면 화면은 에러 상태를 보여준다.

_승격 트리거: 인증이 붙어 Health 외 첫 도메인 조회가 생기면 fully-dressed_


---

## 4. 기능 명세 (Feature Specifications)

### 4.1 기능 목록 (Feature Overview)
| ID | 기능명 | 설명 | 우선순위 | Surface | 상태 |
| --- | --- | --- | --- | --- | --- |
| F001 | monorepo-toolchain | bun workspaces(hoisted linker, `bunfig.toml`), Turborepo 2 tasks(build/lint/typecheck/test/dev), Biome 2(`packages/biome-config` + 루트 `biome.json`), `packages/typescript-config`, TS ~6.0 고정, 루트 AGENTS.md/CLAUDE.md. | Core | Workspace | Approved |
| F002 | shared-schemas | `@social/schemas`: `HealthResponseSchema` = `{ status: 'ok'\|'degraded', timestamp: ISO datetime, checks: [{ name: string, status: 'ok'\|'fail', latencyMs?: number }] }` + `HealthCheckSchema` + 추론 타입 `HealthResponse`/`HealthCheck`. ESM(`"type":"module"`), tsc → dist + d.ts, exports `{types, default}`, `bun test`. | Core | Package | Approved |
| F003 | api-health | `@social/api`: NestJS 12 ESM + Vitest, CQRS(`GetHealthQuery` → `GetHealthHandler` → `DatabasePingPort` → drizzle/postgres.js `select 1`), `GET /health`, `@nestjs/config`에 zod env 검증(`DATABASE_URL`, `PORT`), 전역 ValidationPipe(whitelist/forbidNonWhitelisted/transform), `HealthResponseDto implements HealthResponse`, 단위(port mock) + supertest e2e(실 DB). | Core | Backend App | Approved |
| F004 | mobile-health-screen | `@social/mobile`: Expo 57 + expo-router(`src/app/` 셸, named re-export만) + stylo-native 테마(`defineThemes` + 루트 `ThemeProvider store`) + TanStack Query(`useQuery(['health'])`) + FlashList로 `checks[]` 렌더, `EXPO_PUBLIC_API_URL`(기본 `http://localhost:3000`), `web.output:"single"`, jest-expo 렌더 테스트(fetch mock). | Core | Mobile App | Approved |
| F005 | agent-docs | root, apps/mobile, apps/api, packages/schemas 4곳에 `AGENTS.md`(구조·명령·규칙) + `CLAUDE.md`(AGENTS.md를 바라보는 한 줄). | Support | Workspace | Approved |

### 4.2 기능 상세 (Feature Details)

#### F001 — monorepo-toolchain
- **설명**: bun workspaces(hoisted linker, `bunfig.toml`), Turborepo 2 tasks(build/lint/typecheck/test/dev), Biome 2(`packages/biome-config` + 루트 `biome.json`), `packages/typescript-config`, TS ~6.0 고정, 루트 AGENTS.md/CLAUDE.md.
- **User Story**: Developer로서, 나는 한 명령으로 전 패키지를 검증하길 원한다, 왜냐하면 격리 세션에서도 실패 지점을 즉시 알 수 있어야 하기 때문이다
- **관련 Use Cases**: UC-1
- **Acceptance Criteria**:
  - **happy**: GIVEN 클린 체크아웃 WHEN `bun install && bun run build && bun run lint && bun run typecheck && bun run test` 실행 THEN 전부 종료코드 0
  - **error**: GIVEN 어떤 패키지에 Biome 규칙 위반 파일이 있음 WHEN `bun run lint` 실행 THEN 종료코드 ≠ 0이고 위반 파일 경로가 출력됨
  - **edge**: GIVEN `packages/schemas/dist`가 없음 WHEN `bun run build` 실행 THEN turbo가 `^build` 의존으로 schemas를 먼저 빌드해 소비자 빌드가 성공
- **Edge Cases**: `bunx biome`가 로컬 미설치 시 엉뚱한 `biome@0.3.3` 패키지를 자동 설치, 공유 config 파일명이 `biome.json`이면 중첩 config 오인 에러, `trustedDependencies` 명시 시 bun 기본 신뢰 목록을 대체, 생성물(dist/.expo/expo-env.d.ts)이 lint 대상에 섞임
- **Dependencies**: _없음_
- **Out-of-scope (이 기능 한정)**: _없음_

#### F002 — shared-schemas
- **설명**: `@social/schemas`: `HealthResponseSchema` = `{ status: 'ok'|'degraded', timestamp: ISO datetime, checks: [{ name: string, status: 'ok'|'fail', latencyMs?: number }] }` + `HealthCheckSchema` + 추론 타입 `HealthResponse`/`HealthCheck`. ESM(`"type":"module"`), tsc → dist + d.ts, exports `{types, default}`, `bun test`.
- **User Story**: Developer로서, 나는 와이어 계약을 한 곳에 두길 원한다, 왜냐하면 API와 모바일이 같은 타입을 참조해야 드리프트가 타입체크에 잡히기 때문이다
- **관련 Use Cases**: UC-2
- **Acceptance Criteria**:
  - **happy**: GIVEN 유효한 payload WHEN `HealthResponseSchema.parse` 호출 THEN 동일 객체 반환
  - **error**: GIVEN `timestamp`가 ISO가 아니거나 `checks[].status`가 enum 밖 WHEN `HealthResponseSchema.parse` 호출 THEN ZodError 발생
  - **edge**: GIVEN 테스트 파일 `src/**/*.test.ts` 존재 WHEN build 실행 THEN dist에 테스트 파일이 포함되지 않음
- **Edge Cases**: `@types/bun` 없으면 TS 6 `types:[]` 기본으로 `bun:test` 타입 실패, 모바일에서 `zod`를 직접 import하면 Metro가 두 복사본을 로드
- **Dependencies**: F001
- **Out-of-scope (이 기능 한정)**: _없음_

#### F003 — api-health
- **설명**: `@social/api`: NestJS 12 ESM + Vitest, CQRS(`GetHealthQuery` → `GetHealthHandler` → `DatabasePingPort` → drizzle/postgres.js `select 1`), `GET /health`, `@nestjs/config`에 zod env 검증(`DATABASE_URL`, `PORT`), 전역 ValidationPipe(whitelist/forbidNonWhitelisted/transform), `HealthResponseDto implements HealthResponse`, 단위(port mock) + supertest e2e(실 DB).
- **User Story**: Developer로서, 나는 API가 DB까지 살아있는지 한 엔드포인트로 알길 원한다, 왜냐하면 스캐폴드의 결선(CQRS·drizzle·config)이 실제로 동작함을 증명해야 하기 때문이다
- **관련 Use Cases**: UC-3
- **Acceptance Criteria**:
  - **happy**: GIVEN DB 접속 가능 WHEN `GET /health` 요청 THEN 200, body `status:"ok"`, `checks`에 `name:"database", status:"ok"`, `timestamp`는 ISO
  - **error**: GIVEN DB ping 실패 WHEN `GET /health` 요청 THEN 503, `status:"degraded"`, `checks[database].status:"fail"`
  - **error**: GIVEN `DATABASE_URL` 누락 WHEN API 부팅 THEN 프로세스가 검증 오류로 즉시 종료
  - **edge**: GIVEN e2e 테스트 종료 WHEN `app.close()` 호출 THEN postgres 커넥션 풀이 닫혀 테스트 프로세스가 정상 종료
- **Edge Cases**: DB 이미 존재 시 `CREATE DATABASE` 비멱등, 데코레이터 시그니처의 인터페이스를 `import type` 없이 쓰면 TS1272, `nest new` 비대화 모드는 ESM+Vitest 생성
- **Dependencies**: F002
- **Out-of-scope (이 기능 한정)**: _없음_

#### F004 — mobile-health-screen
- **설명**: `@social/mobile`: Expo 57 + expo-router(`src/app/` 셸, named re-export만) + stylo-native 테마(`defineThemes` + 루트 `ThemeProvider store`) + TanStack Query(`useQuery(['health'])`) + FlashList로 `checks[]` 렌더, `EXPO_PUBLIC_API_URL`(기본 `http://localhost:3000`), `web.output:"single"`, jest-expo 렌더 테스트(fetch mock).
- **User Story**: Developer로서, 나는 홈 화면에서 API 상태를 보길 원한다, 왜냐하면 공유 Schema·네트워크·스타일·목록 결선이 실제 화면에서 동작함을 확인해야 하기 때문이다
- **관련 Use Cases**: UC-3
- **Acceptance Criteria**:
  - **happy**: GIVEN API가 ok 응답 WHEN 홈 화면 렌더 THEN 각 check 이름과 상태가 목록으로 표시
  - **error**: GIVEN fetch가 네트워크 오류 WHEN 홈 화면 렌더 THEN 에러 상태 표시
  - **error**: GIVEN 응답이 Schema 불일치 WHEN 홈 화면 렌더 THEN parse 실패로 에러 상태 표시
  - **edge**: GIVEN API 서버 미기동 WHEN `typecheck && lint && test && export:web` 실행 THEN 전부 통과(테스트는 fetch mock, export는 서버 불필요)
- **Edge Cases**: RNTL 14 설치 시 expo-router testing-library 파괴(13.x 고정), `expo-env.d.ts` 미생성 시 `process.env` 타입 실패(`expo customize tsconfig.json` 선행), `create-expo-app`이 AGENTS.md/CLAUDE.md/.claude/settings.json 자동 생성(`--no-agents-md`), `zod` 직접 import 금지
- **Dependencies**: F002
- **Out-of-scope (이 기능 한정)**: _없음_

#### F005 — agent-docs
- **설명**: root, apps/mobile, apps/api, packages/schemas 4곳에 `AGENTS.md`(구조·명령·규칙) + `CLAUDE.md`(AGENTS.md를 바라보는 한 줄).
- **User Story**: Developer로서, 나는 각 root에 에이전트 지시 단일 소스를 두길 원한다, 왜냐하면 격리 세션이 그 패키지의 규칙을 바로 읽어야 하기 때문이다
- **관련 Use Cases**: _없음_
- **Acceptance Criteria**:
  - **happy**: GIVEN root, apps/mobile, apps/api, packages/schemas 4곳 WHEN 파일 존재 확인 THEN 각 CLAUDE.md는 한 줄이며 AGENTS.md를 참조
- **Edge Cases**: _없음_
- **Dependencies**: F003, F004
- **Out-of-scope (이 기능 한정)**: _없음_

### 4.3 보류 기능 (Deferred Features)
| 기능명 | 보류 사유 | 검토 시점 |
| --- | --- | --- |
| 제품 도메인 기능 전부(회원·게시물·피드 등) | 도메인 미정 | 도메인 용어 확정 시 addendum |
| 인증/인가 | 도메인·역할 미정 | 첫 도메인 슬라이스 설계 시 |
| CI 파이프라인 | 로컬 turbo 파이프라인으로 충분 | 원격 협업 시작 시 |
| docker-compose | 로컬 컨테이너 재사용 | 팀원 온보딩 필요 시 |
| drizzle 마이그레이션 생성 | 테이블 0 | 첫 영속성 스키마 작성 시 |

---

## 5. 정보 구조 (Surface Map / Information Architecture)

### 5.1 Web Surfaces
_해당 없음_

### 5.2 Mobile Surfaces
| Path | Name | Description | Implements | Access | Group |
| --- | --- | --- | --- | --- | --- |
| / | Home | API Health check 목록 화면 | mobile-health-screen | Developer | — |

### 5.3 Backend Surfaces (Endpoint Groups)
| Method | Path | Description | Feature | Auth | Roles |
| --- | --- | --- | --- | --- | --- |
| GET | /health | DB ping 포함 상태 응답 | api-health | none | Developer |

---

## 6. Surface 상세 (Surface Details)

### 6.1 Home
> **구현 기능**: F004 | **접근 권한**: Developer | **플랫폼**: Mobile

| 항목 | 내용 |
| --- | --- |
| 역할 (Purpose) | 스캐폴드 결선 증명 화면 |
| 진입 경로 (Entry Path) | / |
| 사용자 행동 (User Actions) | 화면 진입 시 자동 조회, 당겨서 재조회(선택) |
| 핵심 요소 (Key Elements) | 상태 요약, check 목록(FlashList) |
| 표시 데이터 (Data Displayed) | `status`, `timestamp`, `checks[].name/status/latencyMs` |
| 다음 이동 (Next Navigation) | 없음(단일 화면; `+not-found` 존재) |
| 빈 상태 (Empty State) | `checks`가 빈 배열이면 "검사 항목 없음" 표시 |
| 에러 상태 (Error State) | 네트워크 실패·Schema 불일치 시 에러 메시지와 재시도 |
| 접근 제어 (Access Control) | 없음 |

### 6.2 Backend Endpoint Specs

#### `GET /health`
- **Request Body**: —
- **Response (200)**:
```json
{
  "status": "ok",
  "timestamp": "<ISO>",
  "checks": [
    {
      "name": "database",
      "status": "ok",
      "latencyMs": "<number>"
    }
  ]
}
```
- **Error Codes**: 503

---

## 7. 데이터 모델 (Data Model)

### 7.1 엔티티 정의 (Entity Definitions)

#### HealthResponse
_비영속 값 객체(와이어 계약). `GET /health` 응답 전체. 저장하지 않으며 `packages/schemas`의 `HealthResponseSchema`가 단일 정의_

| 필드 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| status | 'ok' \| 'degraded' | required, enum | 전체 상태. 하나라도 fail이면 degraded |
| timestamp | string | required, ISO 8601 datetime | 응답 생성 시각 |
| checks | HealthCheck[] | required, 빈 배열 허용 | 개별 check 결과 목록 |

#### HealthCheck
_비영속 값 객체(와이어 계약). 개별 check 결과. `packages/schemas`의 `HealthCheckSchema`가 단일 정의_

| 필드 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| name | string | required | check 식별 이름(예: `database`) |
| status | 'ok' \| 'fail' | required, enum | check 결과 |
| latencyMs | number | optional, ≥ 0 | check 소요 시간(ms) |

### 7.2 엔티티 관계 (Entity Relationships)
- HealthResponse 1 — N HealthCheck (`checks[]`에 값으로 포함; 영속성 없음)

### 7.3 데이터 저장 전략 (Data Storage Strategy)
- **서버**: PostgreSQL 16 (drizzle-orm ~0.45 + postgres.js), 이번 phase 테이블 0
- **클라이언트**: 없음 — TanStack Query 메모리 캐시만
- **캐시**: TanStack Query staleTime 기본

### 7.4 도메인 용어집 (Ubiquitous Language)
| 용어 | 정의 | 통합된 동의어 |
| --- | --- | --- |
| Workspace | bun workspaces + Turborepo로 묶인 저장소 전체(`apps/*`, `packages/*`) | 모노레포, 레포 |
| App | 실행 가능한 배포 단위(`apps/mobile`, `apps/api`) | 애플리케이션 |
| Package | App이 소비하는 내부 라이브러리(`packages/schemas`, `packages/typescript-config`, `packages/biome-config`) | 공통 라이브러리, 내부 패키지 |
| Schema | `packages/schemas`의 zod 와이어 계약 + 추론 타입. DB 테이블 정의가 아님 | 공통 스키마, 와이어 계약 |
| 영속성 스키마 | drizzle 테이블 정의(`apps/api/src/shared/infrastructure/database/drizzle/schema/`) | DB 스키마, drizzle schema |
| DTO | class-validator/class-transformer 요청·응답 클래스. `apps/api` presentation 전용, Schema 추론 타입을 implements | 요청 DTO, 응답 DTO |
| Health | DB ping을 포함한 API 상태 응답 `{status, timestamp, checks[]}` | 헬스체크 |
| Vertical slice | 한 관심사를 CA 4레이어(domain/application/infrastructure/presentation)로 접은 디렉터리(`src/health/`) — 미래 바운디드 컨텍스트의 템플릿 | 슬라이스, 도메인 디렉터리 |
| Routing shell | `apps/mobile/src/app/` — named re-export만 두는 expo-router 라우트 파일 | 라우트 셸 |
| Agent doc | 각 중요 root의 `AGENTS.md`(실체) + `CLAUDE.md`(AGENTS.md를 가리키는 한 줄) | 에이전트 문서 |

---

## 8. Backend 명세 (Backend Specifics)

### 8.1 API 컨벤션
- **Base URL**: `/`
- **버전 전략**: 없음
- **Auth Header**: `없음`

### 8.2 요청/응답 표준
- **Pagination**: 미정의(Deferred)
- **Filtering**: 미정의(Deferred)
- **Sorting**: 미정의(Deferred)

### 8.3 에러 처리
| 코드 | HTTP | 설명 |
| --- | --- | --- |
| HEALTH_DEGRADED | 503 | DB ping 실패 |
| VALIDATION_FAILED | 400 | ValidationPipe whitelist/forbidNonWhitelisted 위반 |

### 8.4 도메인 이벤트 (Domain Events)
_없음_

### 8.5 외부 통합 (External Integrations)
_없음_

---

## 9. Mobile 명세 (Mobile Specifics)

### 9.1 필수 권한
_없음_

### 9.2 플랫폼 차이 (iOS / Android)
_없음_

### 9.3 오프라인 및 동기화 전략
- **Storage**: 없음
- **Conflict Resolution**: 해당 없음
- **Network State**: 오프라인 시 조회 실패를 에러 상태로 표시(재시도 가능)

### 9.4 푸시 알림
_없음_

---

## 10. 보안 및 인가 (Security & Authorization)

### 10.1 인증 (Authentication)
- **방식**: none(Deferred)
- **제공자**: 없음
- **토큰 라이프사이클**: 없음

### 10.2 인가 (Authorization / RBAC)
_없음_

### 10.3 데이터 접근 범위 (Data Access Scoping)
| 역할 | 범위 |
| --- | --- |
| Developer | 전체(로컬 개발) |

---

## 11. 비기능 요구사항 (Non-Functional Requirements)

> 모든 항목은 **기술적 contract**입니다. KPI/DAU/전환율 등 비즈니스 성과 약속은 포함되지 않습니다.

### 11.1 성능 (Performance)
- turbo 캐시 히트 시 변경 없는 패키지의 task는 재실행되지 않는다
- `GET /health`는 DB ping 1회만 수행한다

### 11.2 신뢰성 (Reliability)
- env 검증 실패 시 부팅 즉시 종료(잘못된 설정으로 기동하지 않음)
- e2e 종료 시 DB 커넥션 풀을 닫아 테스트 프로세스가 hang 없이 종료
- DB 실패는 503으로 구분되어 프로세스는 살아있음

### 11.3 접근성 (Accessibility)
- 이번 phase 목표 없음(단일 화면)

### 11.4 국제화 (Internationalization)
- 없음(한국어 UI 텍스트 고정)

### 11.5 관측성 (Observability)
- `GET /health`가 유일한 관측 표면
- `checks[].latencyMs`로 DB 지연 노출

---

## 12. 기술 스택 (Tech Stack)

> 모든 버전은 `package.json`에서 추출. monorepo는 sub-package 우선.

### 12.1 Web
_해당 없음_

### 12.2 Mobile
- **expo ~57.0.23** — 앱 런타임
- **react-native 0.86.3** — 네이티브 런타임
- **react 19.2.3** — UI 라이브러리
- **expo-router ~57.0.21** — 파일 기반 라우팅, typed routes
- **@shopify/flash-list SDK 57 핀 버전(v2)** — 목록
- **@tanstack/react-query ^5.102** — 서버 상태
- **stylo-native 1.0.0** — 테마·스타일(순수 JS)
- **jest ~29.7.0** — 테스트 러너
- **jest-expo ~57** — Expo 테스트 프리셋
- **@testing-library/react-native ~13.3.3** — 렌더 테스트
- **react-native-web ~0.21** — export:web 검증용

### 12.3 Backend
- **@nestjs/core, @nestjs/common, @nestjs/platform-express ^12.0** — API 프레임워크(ESM)
- **@nestjs/cqrs ^12** — Query 버스
- **@nestjs/config ^12** — env + zod validate
- **drizzle-orm ~0.45.2** — DB 접근
- **postgres ^3.4** — postgres.js 드라이버
- **drizzle-kit ~0.31.10** — 설정만(마이그레이션 Deferred)
- **class-validator ^0.15** — DTO 검증
- **class-transformer ^0.5** — DTO 변환
- **vitest ^4.1** — 테스트 러너
- **@nestjs/testing ^12** — Nest 테스트 모듈
- **supertest ^7** — e2e HTTP 테스트
- **vite-tsconfig-paths ^5** — vitest 별칭

### 12.4 공통 의존성 (Shared Dependencies)
- **zod ^4.6** — 와이어 계약
- **turbo ^2.10** — task 그래프
- **@biomejs/biome 2.5.13** — lint/format
- **typescript ~6.0.3** — 전 패키지 고정

### 12.5 패키지 매니저 (Package Manager)
- **bun 1.3.14 (Nest 런타임은 Node 24)**

---

## 13. 가정 및 미결 질문 (Assumptions & Open Questions)

### 13.1 가정 (Assumptions)
- npm 스코프는 `@social/*`
- DB명은 `social_media`
- API 포트는 3000
- `EXPO_PUBLIC_API_URL` 기본값은 `http://localhost:3000`
- Nest 런타임은 Node 24.12(로컬) — `@nestjs/schematics` engines ^24.15는 `nest g` 사용 시에만 관련
- `.env`는 gitignore하고 `.env.example`만 커밋(step이 사용자 접속정보 `postgres://postgres:postgres@localhost:5432/social_media`로 `.env` 생성)
- Health 실패 정책 = 503 + degraded
- git init은 첫 step에서 수행
- flash-list는 SDK 57 핀 버전 사용(`estimatedItemSize` 없음)
- bun linker는 hoisted 명시
- §7 데이터 모델의 `HealthResponse`/`HealthCheck`는 영속 엔티티가 아니라 와이어 계약의 값 객체다(렌더러가 엔티티 ≥1을 요구해 등록). DB 테이블은 이번 phase에 0개이며, 실제 영속 엔티티는 도메인 확정 후 addendum의 `data_model_patch`로 추가한다

### 13.2 미결 질문 (Open Questions)
| ID | 질문 | 차단 영향 | 결정 기한 |
| --- | --- | --- | --- |
| OQ-1 | 제품 도메인(Twitter형/Instagram형 등)과 역할 확정 | No | 첫 도메인 addendum 전 |
| OQ-2 | TypeScript 7 전환 시점(Nest CLI·Expo 템플릿 지원 후) | No | 미정 |

---

## 14. 부록 (Appendix)

### 14.1 참조 자료 (References)
- Turborepo internal packages 문서
- Expo monorepo 가이드(SDK 52+ Metro 자동 구성)
- NestJS 12 ESM 마이그레이션 노트
- Biome 2 big-projects 가이드
- stylo-native README(github onepunch-tk/stylo-native)

### 14.2 문서 변경 이력 (Document History)
| 일자 | 작성자 | 변경 내용 |
| --- | --- | --- |
| 2026-09-16 | TaekyungHa | bootstrap 초안 |

### 14.3 Addendum 인덱스 (Addendum Index)
_아직 addendum 없음._
