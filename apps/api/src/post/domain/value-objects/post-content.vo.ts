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
      // TODO:  Domain exception 적용
    }

    if (trimmed.length > PostContent.CONTENT_MAX_LENGTH) {
      // TODO:  Domain exception 적용
    }

    return new PostContent(trimmed);
  }

  equals(other: PostContent) {
    return this.value === other.value;
  }
}
