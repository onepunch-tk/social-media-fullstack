import type { HealthCheck, HealthResponse } from '@social/schemas';
import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import type { HealthReport } from '../../application/queries/get-health.query.js';

export class HealthCheckDto implements HealthCheck {
  @IsString()
  name: string;

  @IsIn(['ok', 'fail'])
  status: 'ok' | 'fail';

  @IsOptional()
  @IsNumber()
  latencyMs?: number;
}

export class HealthResponseDto implements HealthResponse {
  @IsIn(['ok', 'degraded'])
  status: 'ok' | 'degraded';

  @IsISO8601()
  timestamp: string;

  @ValidateNested({ each: true })
  @Type(() => HealthCheckDto)
  checks: HealthCheckDto[];

  static fromReport(report: HealthReport): HealthResponseDto {
    const dto = new HealthResponseDto();
    dto.status = report.status;
    dto.timestamp = report.timestamp;
    dto.checks = report.checks.map((check) => {
      const item = new HealthCheckDto();
      item.name = check.name;
      item.status = check.status;
      item.latencyMs = check.latencyMs;
      return item;
    });
    return dto;
  }
}
