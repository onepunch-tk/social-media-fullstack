import { AggregateRoot } from '#shared/domain/aggregate-root.js';
import { PostContent } from '../value-objects/post-content.vo.js';
import { PostId } from '../value-objects/post-id.vo.js';

type PostProps = {
  id: PostId;
  authorId: string;
  content: PostContent;
  createdAt: Date;
  updatedAt: Date;
};

export class Post extends AggregateRoot {
  private readonly _id: PostId;
  private readonly _authorId: string;
  private readonly _content: PostContent;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(props: PostProps) {
    super();

    this._id = props.id;
    this._authorId = props.authorId;
    this._content = props.content;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get id() {
    return this._id;
  }
  get authorId() {
    return this._authorId;
  }
  get content() {
    return this._content;
  }
  get createdAt() {
    return this._createdAt;
  }
  get updatedAt() {
    return this._updatedAt;
  }

  static create(content: string, authorId: string): Post {
    const id = new PostId();
    const postContent = PostContent.create(content);
    const now = new Date();

    return new Post({
      id,
      content: postContent,
      authorId,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: PostProps): Post {
    return new Post(props);
  }
}
