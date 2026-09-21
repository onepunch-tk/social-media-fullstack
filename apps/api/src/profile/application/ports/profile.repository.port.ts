import type { Profile } from '../../domain/entities/profile.entity';
import type { ProfileId } from '../../domain/value-objects/profile-id.vo';

export const PROFILE_REPOSITORY = Symbol('PROFILE_REPOSITORY');

export interface ProfileRepositoryPort {
  save(profile: Profile): Promise<void>;
  findById(id: ProfileId): Promise<Profile | null>;
  findAll(): Promise<Profile[]>;
}
