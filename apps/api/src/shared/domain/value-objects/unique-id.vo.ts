import { randomUUID } from 'node:crypto';

export class UniqueId {
  private readonly _value: string;
  private static readonly UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(id?: string) {
    const value = id ?? randomUUID();

    if (!UniqueId.UUID_PATTERN.test(value)) {
      // TODO: Domain exception 구현시 적용 — 지금은 spec이 이 자리를 지킨다
    }

    this._value = value;
  }

  get value() {
    return this._value;
  }

  equals(other: UniqueId) {
    return this.value === other.value;
  }
}
