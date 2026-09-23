import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepositoryPort,
} from '../../ports/refresh-token.repository.port';
import { PurgeExpiredRefreshTokenCommand } from './purge-expired-refresh-token.command';

@CommandHandler(PurgeExpiredRefreshTokenCommand)
export class PurgeExpiredRefreshTokenHandler
  implements ICommandHandler<PurgeExpiredRefreshTokenCommand>
{
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
  ) {}
  async execute(command: PurgeExpiredRefreshTokenCommand): Promise<number> {
    return this.refreshTokenRepository.deleteExpired(command.now);
  }
}
