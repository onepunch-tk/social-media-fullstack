export class Handle {
  private readonly _value: string;
  private static readonly PATTERN = /^[a-z0-9_]{3,15}$/;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): Handle {
    const trimmed = value.trim().toLowerCase();

    if (!trimmed) {
      // TODO: Domain exception 구현 후 적용
    }

    if (!Handle.PATTERN.test(trimmed)) {
      // TODO: Domain exception 구현 후 적용
    }

    return new Handle(trimmed);
  }

  get value() {
    return this._value;
  }

  equals(other: Handle) {
    return this.value === other.value;
  }
}
