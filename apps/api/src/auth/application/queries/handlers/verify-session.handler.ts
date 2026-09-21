import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ACCESS_TOKEN_SIGNER,
  type AccessTokenSignerPort,
} from '#auth/application/ports/access-token-signer.port';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepositoryPort,
} from '#auth/application/ports/account.repository.port';
import { AccountId } from '#auth/domain/value-objects/account-id.vo';
import { type VerifiedSession, VerifySessionQuery } from '../verify-session.query';

@QueryHandler(VerifySessionQuery)
export class VerifySessionHandler implements IQueryHandler<VerifySessionQuery> {
  constructor(
    @Inject(ACCESS_TOKEN_SIGNER) private readonly signer: AccessTokenSignerPort,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepositoryPort,
  ) {}

  async execute(query: VerifySessionQuery): Promise<VerifiedSession | null> {
    const claims = await this.signer.verify(query.accessToken);
    if (!claims) return null;

    const account = await this.accountRepository.findById(new AccountId(claims.sub));
    return account ? { accountId: account.id.value } : null;
  }
}
