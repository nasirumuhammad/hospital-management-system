import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from '../common/constants/auth.constants';
import { EnvironmentVariables } from '../config/env.validation';
import { SessionTokens } from './auth.types';

const MS_PER_SECOND = 1000;

@Injectable()
export class AuthCookieService {
  private readonly baseOptions: CookieOptions;
  private readonly accessMaxAgeMs: number;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    const sameSite = config.get('COOKIE_SAME_SITE', { infer: true });
    this.baseOptions = {
      httpOnly: true,
      secure: config.get('NODE_ENV', { infer: true }) === 'production' || sameSite === 'none',
      sameSite,
      domain: config.get('COOKIE_DOMAIN', { infer: true }),
    };
    this.accessMaxAgeMs = config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true }) * MS_PER_SECOND;
  }

  attach(response: Response, tokens: SessionTokens): void {
    response.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, { ...this.baseOptions, path: '/', maxAge: this.accessMaxAgeMs });
    response.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
      ...this.baseOptions,
      path: REFRESH_COOKIE_PATH,
      expires: tokens.refreshExpiresAt,
    });
  }

  clear(response: Response): void {
    response.clearCookie(ACCESS_COOKIE_NAME, { ...this.baseOptions, path: '/' });
    response.clearCookie(REFRESH_COOKIE_NAME, { ...this.baseOptions, path: REFRESH_COOKIE_PATH });
  }
}
