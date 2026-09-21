import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenAlreadyRotatedError,
  type RefreshTokenRepositoryPort,
} from '#auth/application/ports/refresh-token.repository.port';
import {
  REFRESH_TOKEN_ISSUER,
  type RefreshTokenIssuerPort,
} from '#auth/application/ports/refresh-token-issuer.port';
import { SessionIssuer } from '#auth/application/services/session-issuer.service';
import { ApplicationException } from '#shared/domain/exceptions/application.exception';
import { RefreshSessionCommand } from './refresh-session.command';

@CommandHandler(RefreshSessionCommand)
export class RefreshSessionHandler implements ICommandHandler<RefreshSessionCommand> {
  constructor(
    @Inject(REFRESH_TOKEN_ISSUER) private readonly issuer: RefreshTokenIssuerPort,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(command: RefreshSessionCommand) {
    const current = await this.refreshTokenRepository.findByHash(
      this.issuer.hash(command.refreshToken),
    );
    if (!current || current.isExpired(new Date())) throw sessionExpired();

    try {
      return await this.sessions.rotate(current);
    } catch (e) {
      if (e instanceof RefreshTokenAlreadyRotatedError) throw sessionExpired();
      throw e;
    }
  }
}

const sessionExpired = () =>
  new ApplicationException('UNAUTHORIZED', '로그인이 만료되었습니다. 다시 로그인해주세요.');
