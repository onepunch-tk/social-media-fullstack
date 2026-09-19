export class RegisterAccountCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}
