import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';
import { PostLikedEvent } from '../../domain/events/post-liked.event';
import { PostUnlikedEvent } from '../../domain/events/post-unliked.event';

// TODO: 어떻게 적용해볼지 고민 중... DB를 transaction하면서 카운터를 가져올까..
@EventsHandler(PostLikedEvent, PostUnlikedEvent)
export class LikesCountHandler implements IEventHandler<PostLikedEvent | PostUnlikedEvent> {
  async handle(event: PostLikedEvent | PostUnlikedEvent) {
    if (event instanceof PostLikedEvent) {
      // liked
    } else {
      // like 취소
    }
  }
}
