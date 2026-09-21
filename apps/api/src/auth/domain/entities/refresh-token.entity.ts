import { Entity } from '#shared/domain/entity';
import { UniqueId } from '#shared/domain/value-objects/unique-id.vo';
import type { AccountId } from '../value-objects/account-id.vo';

type RefreshTokenProps = {
  id: UniqueId;
  accountId: AccountId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
};

export class RefreshToken extends Entity {
  private readonly _accountId: AccountId;
  private readonly _tokenHash: string;
  private readonly _expiresAt: Date;
  private readonly _createdAt: Date;

  private constructor(props: RefreshTokenProps) {
    super(props.id);
    this._accountId = props.accountId;
    this._tokenHash = props.tokenHash;
    this._expiresAt = props.expiresAt;
    this._createdAt = props.createdAt;
  }

  get accountId() {
    return this._accountId;
  }
  get tokenHash() {
    return this._tokenHash;
  }
  get expiresAt() {
    return this._expiresAt;
  }
  get createdAt() {
    return this._createdAt;
  }

  static issue(accountId: AccountId, tokenHash: string, expiresAt: Date): RefreshToken {
    return new RefreshToken({
      id: new UniqueId(),
      accountId,
      tokenHash,
      expiresAt,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: RefreshTokenProps): RefreshToken {
    return new RefreshToken(props);
  }

  isExpired(now: Date): boolean {
    return this.expiresAt <= now;
  }

  // 새 id & hash, expiresAt은 그대로 - refresh로 세션이 무한 연장되지 않는다.
  rotate(nextHash: string): RefreshToken {
    return new RefreshToken({
      id: new UniqueId(),
      accountId: this.accountId,
      tokenHash: nextHash,
      expiresAt: this.expiresAt,
      createdAt: new Date(),
    });
  }
}
