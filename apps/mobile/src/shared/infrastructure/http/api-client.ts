import { RequestFailedError } from '@shared/application/errors/request-failed.error';
import { ApiErrorSchema, type HealthResponse, HealthResponseSchema } from '@social/schemas';

// 구조적 타입 - zod를 직접 import하지 않기 위해서 parser 구현.
type Parser<T> = { parse(input: unknown): T };

// 점 표기 정적 접근만 — Expo는 이 형태만 번들 타임에 인라인한다.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, parser: Parser<T>, init?: RequestInit): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new RequestFailedError('NETWORK', '서버에 연결할 수 없습니다.');
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const parsed = ApiErrorSchema.safeParse(json);
    const body = parsed.success
      ? parsed.data
      : { code: 'INTERNAL_ERROR' as const, message: `HTTP ${res.status}` };

    throw new RequestFailedError(body.code, body.message, body.fields);
  }

  try {
    return parser.parse(json);
  } catch {
    throw new RequestFailedError('INVALID_RESPONSE', '응답 형식이 올바르지 않습니다.');
  }
}

export const fetchHealth = (signal?: AbortSignal) =>
  request<HealthResponse>('/health', HealthResponseSchema, { signal });
