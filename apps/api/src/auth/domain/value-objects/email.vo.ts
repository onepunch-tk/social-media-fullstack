import { DomainException } from '#shared/domain/exceptions/domain.exception.js';

export class Email {
  private static readonly EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  get value() {
    return this._value;
  }

  static create(value: string): Email {
    const trimmed = value.trim().toLowerCase();

    if (!trimmed) {
      throw new DomainException(`Email 입력은 필수 입니다.`, 'email');
    }

    if (!Email.EMAIL_PATTERN.test(trimmed)) {
      throw new DomainException(`올바른 이메일 형식을 입력하세요.: ${trimmed}`, 'email');
    }

    return new Email(trimmed);
  }

  equals(other: Email) {
    return this.value === other.value;
  }
}
