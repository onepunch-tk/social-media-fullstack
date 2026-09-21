import { Command } from '@nestjs/cqrs';
import { AuthSession } from '#auth/application/services/session-issuer.service';

export class RefreshSessionCommand extends Command<AuthSession> {
  constructor(public readonly refreshToken: string) {
    super();
  }
}
