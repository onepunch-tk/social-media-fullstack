export class PostLikedEvent {
  constructor(
    public readonly profileId: string,
    public readonly postId: string,
    public readonly occurredAt: Date,
  ) {}
}
