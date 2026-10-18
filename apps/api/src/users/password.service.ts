import { Injectable } from '@nestjs/common';
import { compare, hash, hashSync } from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { BCRYPT_ROUNDS } from '../common/constants/auth.constants';

@Injectable()
export class PasswordService {
  private readonly decoyHash = hashSync(randomBytes(16).toString('hex'), BCRYPT_ROUNDS);

  hash(plain: string): Promise<string> {
    return hash(plain, BCRYPT_ROUNDS);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return compare(plain, hashed);
  }

  async spendComparisonTime(plain: string): Promise<void> {
    await compare(plain, this.decoyHash);
  }
}
