import { AggregateRoot } from '#shared/domain/aggregate-root.js';
import type { Handle } from '../value-objects/handle.vo.js';
import { Name } from '../value-objects/name.vo.js';
import { ProfileId } from '../value-objects/profile-id.vo.js';

type ProfileProps = {
  id: ProfileId;
  handle: Handle;
  name: Name;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class Profile extends AggregateRoot {
  private readonly _id: ProfileId;
  private readonly _handle: Handle;
  private readonly _name: Name;
  private readonly _avatarUrl: string | null;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor({ id, handle, name, avatarUrl, createdAt, updatedAt }: ProfileProps) {
    super();

    this._id = id;
    this._handle = handle;
    this._name = name;
    this._avatarUrl = avatarUrl;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  get id() {
    return this._id;
  }
  get handle() {
    return this._handle;
  }
  get name() {
    return this._name;
  }
  get avatarUrl() {
    return this._avatarUrl;
  }
  get createdAt() {
    return this._createdAt;
  }
  get updatedAt() {
    return this._updatedAt;
  }

  static register(handle: Handle, name: string, avatarUrl: string | null): Profile {
    const id = new ProfileId();
    const now = new Date();

    const profile = new Profile({
      id,
      handle,
      name: Name.create(name),
      avatarUrl,
      createdAt: now,
      updatedAt: now,
    });

    // TODO: Cqrs 이벤트 등록

    return profile;
  }

  static reconstitute(props: ProfileProps): Profile {
    return new Profile(props);
  }
}
