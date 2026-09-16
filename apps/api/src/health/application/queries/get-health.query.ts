import { Query } from '@nestjs/cqrs';

export interface HealthReport {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks: ReadonlyArray<{ name: string; status: 'ok' | 'fail'; latencyMs: number }>;
}

export class GetHealthQuery extends Query<HealthReport> {}
