import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { Response } from 'express';
import { GetHealthQuery } from '../application/queries/get-health.query.js';
import { HealthResponseDto } from './dtos/health-response.dto.js';

@Controller('health')
export class HealthController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getHealth(@Res({ passthrough: true }) res: Response): Promise<HealthResponseDto> {
    const report = await this.queryBus.execute(new GetHealthQuery());
    const dto = HealthResponseDto.fromReport(report);
    if (dto.status === 'degraded') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return dto;
  }
}
