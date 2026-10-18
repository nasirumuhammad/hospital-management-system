import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ACCESS_TOKEN_ISSUER, JWT_ALGORITHM } from '../common/constants/auth.constants';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './auth.types';

@Injectable()
export class AccessTokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(user: Pick<User, 'id' | 'tokenVersion'>): Promise<string> {
    const payload: JwtPayload = { sub: user.id, tv: user.tokenVersion };
    return this.jwt.signAsync(payload);
  }

  verify(token: string): Promise<JwtPayload> {
    return this.jwt.verifyAsync<JwtPayload>(token, { algorithms: [JWT_ALGORITHM], issuer: ACCESS_TOKEN_ISSUER });
  }
}
