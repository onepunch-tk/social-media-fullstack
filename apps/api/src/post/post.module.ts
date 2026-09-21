import { Module } from '@nestjs/common';
import { PostController } from './presentation/post.controller';

@Module({
  controllers: [PostController],
})
export class PostModule {}
