export class AccountRegisteredEvent {
  constructor(
    public readonly accountId: string,
    public readonly email: string,
    public readonly occurredAt: Date,
  ) {}
}
