import type { UniqueId } from './value-objects/unique-id.vo';

export abstract class Entity<T extends UniqueId = UniqueId> {
  constructor(protected readonly _id: T) {}

  get id(): T {
    return this._id;
  }

  equals(other: Entity<T>): boolean {
    if (other === null || other === undefined) return false;
    if (this === other) return true;

    return this.id.equals(other.id);
  }
}
