import { Query } from '@nestjs/cqrs';

export type VerifiedSession = { accountId: string };

export class VerifySessionQuery extends Query<VerifiedSession | null> {
  constructor(public readonly accessToken: string) {
    super();
  }
}
