import { type HealthResponse, HealthResponseSchema } from '@social/schemas';

// 점 표기 정적 접근만 — Expo는 이 형태만 번들 타임에 인라인한다.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/** GET /health — 200(ok)·503(degraded) 모두 같은 body이므로 상태 코드와 무관하게 파싱한다. */
export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/health`, { signal });
  return HealthResponseSchema.parse(await response.json());
}
