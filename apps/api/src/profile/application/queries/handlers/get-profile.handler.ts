import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  PROFILE_REPOSITORY,
  type ProfileRepositoryPort,
} from '#profile/application/ports/profile.repository.port';
import { Profile } from '#profile/domain/entities/profile.entity';
import { ProfileId } from '#profile/domain/value-objects/profile-id.vo';
import { ApplicationException } from '#shared/domain/exceptions/application.exception';
import { GetProfileQuery } from '../get-profile.query';

@QueryHandler(GetProfileQuery)
export class GetProfileHandler implements IQueryHandler<GetProfileQuery> {
  constructor(
    @Inject(PROFILE_REPOSITORY) private readonly profileRepository: ProfileRepositoryPort,
  ) {}

  async execute(query: GetProfileQuery): Promise<Profile> {
    const profile = await this.profileRepository.findById(new ProfileId(query.accountId));

    if (!profile) throw new ApplicationException('NOT_FOUND', '유저의 프로필을 찾을 수 없습니다.');

    return profile;
  }
}
