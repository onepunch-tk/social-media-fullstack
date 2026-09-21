import { Command } from '@nestjs/cqrs';
import { AuthSession } from '#auth/application/services/session-issuer.service';

export class RegisterAccountCommand extends Command<AuthSession> {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {
    super();
  }
}
