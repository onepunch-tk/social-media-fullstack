import { Command } from '@nestjs/cqrs';
import { Profile } from '#profile/domain/entities/profile.entity';

export class EnsureProfileCommand extends Command<Profile> {
  constructor(public readonly accountId: string) {
    super();
  }
}
