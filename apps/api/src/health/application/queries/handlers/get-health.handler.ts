import { Inject } from '@nestjs/common';
import type { IQueryHandler } from '@nestjs/cqrs';
import { QueryHandler } from '@nestjs/cqrs';
import type { DatabasePingPort } from '../../ports/database-ping.port.js';
import { DATABASE_PING } from '../../ports/database-ping.port.js';
import type { HealthReport } from '../get-health.query.js';
import { GetHealthQuery } from '../get-health.query.js';

@QueryHandler(GetHealthQuery)
export class GetHealthHandler implements IQueryHandler<GetHealthQuery> {
  constructor(@Inject(DATABASE_PING) private readonly databasePing: DatabasePingPort) {}

  async execute(): Promise<HealthReport> {
    const result = await this.databasePing.ping();
    const checks: HealthReport['checks'] = [
      { name: 'database', status: result.ok ? 'ok' : 'fail', latencyMs: result.latencyMs },
    ];
    return {
      status: checks.some((check) => check.status === 'fail') ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
