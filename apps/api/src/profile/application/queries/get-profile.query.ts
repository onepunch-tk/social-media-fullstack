import { Query } from '@nestjs/cqrs';
import { Profile } from '#profile/domain/entities/profile.entity';

export class GetProfileQuery extends Query<Profile> {
  constructor(public readonly accountId: string) {
    super();
  }
}
