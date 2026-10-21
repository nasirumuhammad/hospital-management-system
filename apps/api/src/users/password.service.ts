import { Injectable } from '@nestjs/common';
import { compare, hash, hashSync } from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { BCRYPT_ROUNDS } from '../common/constants/auth.constants';

const UNUSABLE_SECRET_BYTES = 32;

@Injectable()
export class PasswordService {
  private readonly decoyHash = hashSync(randomBytes(16).toString('hex'), BCRYPT_ROUNDS);

  hash(plain: string): Promise<string> {
    return hash(plain, BCRYPT_ROUNDS);
  }

  /** A hash of a random secret nobody sees, for accounts that must set their own password first. */
  hashUnusable(): Promise<string> {
    return this.hash(randomBytes(UNUSABLE_SECRET_BYTES).toString('hex'));
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return compare(plain, hashed);
  }

  async spendComparisonTime(plain: string): Promise<void> {
    await compare(plain, this.decoyHash);
  }
}
