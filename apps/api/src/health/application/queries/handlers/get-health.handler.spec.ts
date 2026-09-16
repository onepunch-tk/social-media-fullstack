import { Test } from '@nestjs/testing';
import type { DatabasePingPort } from '../../ports/database-ping.port.js';
import { DATABASE_PING } from '../../ports/database-ping.port.js';
import { GetHealthHandler } from './get-health.handler.js';

async function createHandler(ping: DatabasePingPort['ping']): Promise<GetHealthHandler> {
  const moduleRef = await Test.createTestingModule({
    providers: [GetHealthHandler, { provide: DATABASE_PING, useValue: { ping } }],
  }).compile();
  return moduleRef.get(GetHealthHandler);
}

describe('GetHealthHandler', () => {
  it('reports ok when the database ping succeeds', async () => {
    const handler = await createHandler(async () => ({ ok: true, latencyMs: 3 }));

    const report = await handler.execute();

    expect(report.status).toBe('ok');
    expect(report.checks).toEqual([{ name: 'database', status: 'ok', latencyMs: 3 }]);
    expect(() => new Date(report.timestamp).toISOString()).not.toThrow();
  });

  it('reports degraded with a failed database check when the ping fails', async () => {
    const handler = await createHandler(async () => ({
      ok: false,
      latencyMs: 7,
      reason: 'connection refused',
    }));

    const report = await handler.execute();

    expect(report.status).toBe('degraded');
    expect(report.checks[0]?.name).toBe('database');
    expect(report.checks[0]?.status).toBe('fail');
  });
});
