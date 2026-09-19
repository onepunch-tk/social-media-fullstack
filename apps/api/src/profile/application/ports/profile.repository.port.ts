import type { Profile } from '../../domain/entities/profile.entity.js';
import type { ProfileId } from '../../domain/value-objects/profile-id.vo.js';

export const PROFILE_REPOSITORY = Symbol('PROFILE_REPOSITORY');

export interface ProfileRepositoryPort {
  save(profile: Profile): Promise<void>;
  findById(id: ProfileId): Promise<Profile | null>;
  findAll(): Promise<Profile[]>;
}
