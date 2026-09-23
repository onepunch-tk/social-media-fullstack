import { Profile as ProfileRespose } from '@social/schemas';
import { Profile } from '#profile/domain/entities/profile.entity';

export class ProfileResponseDto implements ProfileRespose {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;

  static fromDomain(profile: Profile) {
    const dto = new ProfileResponseDto();

    dto.id = profile.id.value;
    dto.handle = profile.handle.value;
    dto.name = profile.name.value;
    dto.avatarUrl = profile.avatarUrl;
    dto.createdAt = profile.createdAt.toISOString();
    dto.updatedAt = profile.updatedAt.toISOString();

    return dto;
  }
}
