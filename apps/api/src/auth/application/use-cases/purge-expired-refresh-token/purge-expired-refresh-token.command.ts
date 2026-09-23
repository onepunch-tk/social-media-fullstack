import { Command } from '@nestjs/cqrs';

export class PurgeExpiredRefreshTokenCommand extends Command<number> {
  constructor(public readonly now: Date) {
    super();
  }
}
