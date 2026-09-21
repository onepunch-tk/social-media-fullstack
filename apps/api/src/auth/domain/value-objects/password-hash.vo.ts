import { DomainException } from '#shared/domain/exceptions/domain.exception';

export class PasswordHash {
  private constructor(private readonly _value: string) {}

  static from(value: string): PasswordHash {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new DomainException('비밀번호 입력은 필수 입니다.', 'password');
    }
    return new PasswordHash(trimmed);
  }

  get value() {
    return this._value;
  }

  equals(other: PasswordHash) {
    return this._value === other._value;
  }
}
