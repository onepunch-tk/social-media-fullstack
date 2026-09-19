import type { ApiErrorCode } from '@social/schemas';

export type RequestErrorCode = ApiErrorCode | 'NETWORK' | 'INVALID_RESPONSE';

export class RequestFailedError extends Error {
  constructor(
    readonly code: RequestErrorCode,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'RequestFailedError';
  }
}
