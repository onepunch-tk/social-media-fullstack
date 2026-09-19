import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import type { PasswordHasherPort } from '../../application/ports/password-hasher.port.js';

@Injectable()
export class BcryptPasswordHasherAdapter implements PasswordHasherPort {
  private readonly SALT_ROUNDS = 10;

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.SALT_ROUNDS);
  }
  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
