import { DomainException } from '#shared/domain/exceptions/domain.exception';

export class PostContent {
  private readonly _value: string;
  private static readonly CONTENT_MAX_LENGTH = 280;

  private constructor(value: string) {
    this._value = value;
  }

  get value() {
    return this._value;
  }

  static create(value: string): PostContent {
    const trimmed = value.trim();

    if (!trimmed) {
      throw new DomainException(`게시물의 내용을 작성하세요.`, 'content');
    }

    if (trimmed.length > PostContent.CONTENT_MAX_LENGTH) {
      throw new DomainException(
        `게시물의 내용이 ${PostContent.CONTENT_MAX_LENGTH} 자를 초과합니다.`,
        'content',
      );
    }

    return new PostContent(trimmed);
  }

  equals(other: PostContent) {
    return this.value === other.value;
  }
}
