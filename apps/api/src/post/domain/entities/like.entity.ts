import { AggregateRoot } from '#shared/domain/aggregate-root';
import { PostLikedEvent } from '../events/post-liked.event';
import { PostUnlikedEvent } from '../events/post-unliked.event';
import type { PostId } from '../value-objects/post-id.vo';

type LikeProps = {
  profileId: string;
  postId: PostId;
  createdAt: Date;
};

export class Like extends AggregateRoot {
  private readonly _profileId: string;
  private readonly _postId: PostId;
  private readonly _createdAt: Date;

  private constructor(props: LikeProps) {
    super();

    this._profileId = props.profileId;
    this._postId = props.postId;
    this._createdAt = props.createdAt;
  }

  get profileId() {
    return this._profileId;
  }
  get postId() {
    return this._postId;
  }
  get createdAt() {
    return this._createdAt;
  }

  static create(profileId: string, postId: PostId): Like {
    const like = new Like({
      profileId,
      postId,
      createdAt: new Date(),
    });

    // TODO: 좋아요 Event 등록 - PostLiked
    like.apply(new PostLikedEvent(profileId, postId.value, like.createdAt));

    return like;
  }

  static reconstitute(props: LikeProps): Like {
    return new Like(props);
  }

  unlike() {
    this.apply(new PostUnlikedEvent(this.profileId, this.postId.value, this.createdAt));
  }

  equals(other: Like) {
    return this.profileId === other.profileId && this.postId.equals(other.postId);
  }
}
