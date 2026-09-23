import { AggregateRoot } from '#shared/domain/aggregate-root';
import { Handle } from '../value-objects/handle.vo';
import { Name } from '../value-objects/name.vo';
import { ProfileId } from '../value-objects/profile-id.vo';

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

    return profile;
  }

  static createDefault(profileId: ProfileId): Profile {
    const handle = Handle.generate();
    const now = new Date();

    return new Profile({
      id: profileId,
      handle,
      name: Name.create(handle.value),
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: ProfileProps): Profile {
    return new Profile(props);
  }
}
