export class Name {
  private readonly _value: string;
  private static readonly NAME_MAX_LENGTH = 50;

  private constructor(value: string) {
    this._value = value;
  }

  get value() {
    return this._value;
  }

  static create(value: string): Name {
    const trimmed = value.trim();
    if (!trimmed) {
      // TODO: Domain exception
    }
    if (trimmed.length > Name.NAME_MAX_LENGTH) {
      // TODO: Domain exception
    }
    return new Name(trimmed);
  }

  equals(other: Name) {
    return this.value === other.value;
  }
}
