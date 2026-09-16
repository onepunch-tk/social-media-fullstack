import { describe, expect, it } from 'bun:test';
import { type HealthResponse, HealthResponseSchema } from './health.schema.js';

const validPayload = {
  status: 'ok',
  timestamp: '2026-09-16T06:30:00.000Z',
  checks: [{ name: 'database', status: 'ok', latencyMs: 12 }],
} satisfies HealthResponse;

describe('HealthResponseSchema', () => {
  it('parses a valid payload and returns an equal object', () => {
    expect(HealthResponseSchema.parse(validPayload)).toEqual(validPayload);
  });

  it('rejects a non-ISO timestamp', () => {
    const result = HealthResponseSchema.safeParse({
      ...validPayload,
      timestamp: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('rejects checks[].status outside the enum', () => {
    const result = HealthResponseSchema.safeParse({
      ...validPayload,
      checks: [{ name: 'database', status: 'unknown' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a top-level status outside the enum', () => {
    const result = HealthResponseSchema.safeParse({ ...validPayload, status: 'down' });
    expect(result.success).toBe(false);
  });

  it('allows latencyMs to be omitted', () => {
    const payload = {
      ...validPayload,
      checks: [{ name: 'database', status: 'fail' }],
    } satisfies HealthResponse;
    expect(HealthResponseSchema.parse(payload)).toEqual(payload);
  });
});
