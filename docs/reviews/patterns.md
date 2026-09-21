# 반복 패턴

| 규칙 (문서 › 절) | 횟수 | 최근 | 정답 공개 | 상태 |
| --- | --- | --- | --- | --- |
| api/AGENTS.md › ESM 규칙 › 도메인 안에서는 상대경로, 경계 넘을 때만 별칭 | 3 | 2026-09-22 | — | 진행중 — 코드/문서 중 하나를 결정할 것 |
| api/AGENTS.md › 레이어 규칙 › infrastructure는 포트가 정의한 결과 타입으로 반환 (`try { return promise }` — catch 미도달) | 3 | 2026-09-22 | 1회 | 진행중 — verify() 해결, rotate() 잔존 |
| api/AGENTS.md › 환경 › ConfigService<Env, true> 경유 (+ `{ infer: true }`) | 3 | 2026-09-22 | 1회 | 진행중 — sign() 해결, verify() 잔존 |
| nestjs.md › 관용구 › 주입은 `private readonly` | 2 | 2026-09-22 | — | 진행중 |
| ARCHITECTURE.md › api › ESM 규칙 › 타입 전용 import는 `import type` (Biome useImportType off → 사람이 지킨다) | 1 | 2026-09-22 | — | 진행중 |
| schemas/AGENTS.md › 역할 › 와이어 계약 단일 소스 (ApiErrorCode ↔ filter 상태 매핑 — 429) | 1 | 2026-09-22 | — | 진행중 |
| ARCHITECTURE.md › api › Directory Tree › application 하위 디렉터리(ports/use-cases/…)에만 파일 | 2 | 2026-09-21 | 1회 | 진행중 (3차에서 미출현 — 해결) |
| nestjs.md › edge case › 전역 pipe/filter/guard 등록 (데코레이터는 읽어줄 Guard가 있어야 동작 — Throttler) | 2 | 2026-09-21 | 1회 | 진행중 (3차에서 미출현 — 해결) |
| nestjs.md › enforceable › presentation(dtos/ 제외)에서 도메인 타입 import 금지 · 포트·리포지토리 직접 주입 금지 | 1 | 2026-09-21 | 1회 | 진행중 (3차에서 미출현 — 해결) |
| nestjs.md › 관용구 › 예외는 레이어 소유 (presentation은 HttpException · 포트 예외 → application 예외 변환) | 1 | 2026-09-21 | 1회 | 진행중 (3차에서 미출현) |
| typescript.md › 안티패턴 › 옵셔널 체이닝으로 에러 삼키기 (`null` 결과를 `?.`로 통과) | 1 | 2026-09-21 | 1회 | 진행중 (3차에서 미출현 — 해결) |
| schemas/AGENTS.md › 소비 규칙 › API DTO는 추론 타입을 implements (Schema = 와이어 단일 진실) | 1 | 2026-09-21 | — | 진행중 (2·3차 미출현) |
| api/AGENTS.md › 구조 › 메시지 클래스가 결과 타입을 extends (Query<R>/Command<R>) | 1 | 2026-09-21 | 1회 | 진행중 (2·3차 미출현) |
| ARCHITECTURE.md › api › 모듈 등록 › 핸들러 배럴 배열 상수에 등록 | 1 | 2026-09-21 | — | 진행중 (2·3차 미출현) |
| nestjs.md › 관용구 › 매핑 › 쓰기 $inferInsert · 읽기 $inferSelect | 1 | 2026-09-21 | — | 진행중 (2·3차 미출현) |
| api/AGENTS.md › 테스트 › 핸들러 spec (포트 useValue mock) · schemas 절차 3 › schema.test.ts | 1 | 2026-09-21 | — | 진행중 (2·3차는 사용자 요청으로 제외) |
| typescript.md › 관용구 › 리터럴 고정엔 as const | 1 | 2026-09-21 | — | 진행중 (2·3차 미출현) |

상태: `진행중` / `졸업` (마지막 3회 리뷰에서 미출현 — 졸업 시 그 리뷰 파일에 축하 한 줄)

## 성장 기록

| 날짜 | 리뷰 | 🔴 | 🟡 | 🟢 | 졸업 |
| --- | --- | --- | --- | --- | --- |
| 2026-09-21 | [auth 세션 발급](2026-09-21-auth-session.md) | 0 | 10 | 8 | — |
| 2026-09-21 | [auth Guard · 데코레이터 (2차)](2026-09-21-auth-guard.md) | 1 | 8 | 12 | — |
| 2026-09-22 | [auth 재검토 (3차)](2026-09-22-auth-guard-recheck.md) | 0 | 6 | 10 | — |
