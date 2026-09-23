import { Module } from '@nestjs/common';

import { PROFILE_REPOSITORY } from './application/ports/profile.repository.port';
import { QueryHandlers } from './application/queries';
import { Sagas } from './application/sagas';
import { CommandHandlers } from './application/use-cases';
import { DrizzleProfileRepositoryAdapter } from './infrastructure/adapters/drizzle-profile.repository.adapter';
import { ProfileController } from './presentation/profile.controller';

@Module({
  controllers: [ProfileController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    ...Sagas,
    {
      provide: PROFILE_REPOSITORY,
      useClass: DrizzleProfileRepositoryAdapter,
    },
  ],
})
export class ProfileModule {}
