import type { Profile } from '../../domain/entities/profile.entity';
import type { ProfileId } from '../../domain/value-objects/profile-id.vo';

export const PROFILE_REPOSITORY = Symbol('PROFILE_REPOSITORY');

export class DuplicateHandleError extends Error {
  constructor(readonly field: 'handle') {
    super(`이미 존재는하는 handle 입니다.`);
    this.name = 'DuplicateHandleError';
  }
}

export interface ProfileRepositoryPort {
  create(profile: Profile): Promise<void>;
  save(profile: Profile): Promise<void>;
  findById(id: ProfileId): Promise<Profile | null>;
  findAll(): Promise<Profile[]>;
}
