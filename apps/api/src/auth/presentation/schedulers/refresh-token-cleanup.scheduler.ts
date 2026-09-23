import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PurgeExpiredRefreshTokenCommand } from '#auth/application/use-cases/purge-expired-refresh-token/purge-expired-refresh-token.command';

@Injectable()
export class RefreshTokenCleanupScheduler {
  private readonly logger = new Logger(RefreshTokenCleanupScheduler.name);

  constructor(private readonly commandBus: CommandBus) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'purge-expired-refresh-tokens' })
  async purge() {
    try {
      const count = await this.commandBus.execute(new PurgeExpiredRefreshTokenCommand(new Date()));
      this.logger.log(`purged ${count} expired refresh tokens`);
    } catch (e) {
      this.logger.error('refresh token purge failed.', e);
    }
  }
}
