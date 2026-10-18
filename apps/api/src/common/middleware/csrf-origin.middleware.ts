import { ForbiddenException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../constants/auth.constants';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function originOf(request: Request): string | null {
  const origin = request.headers.origin;
  if (origin) return origin;
  const referer = request.headers.referer;
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function hasSessionCookie(request: Request): boolean {
  return Boolean(request.cookies?.[ACCESS_COOKIE_NAME] || request.cookies?.[REFRESH_COOKIE_NAME]);
}

export function csrfOriginCheck(allowedOrigins: string[]) {
  return (request: Request, _res: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(request.method) || !hasSessionCookie(request)) return next();
    const origin = originOf(request);
    if (!origin || !allowedOrigins.includes(origin)) {
      return next(new ForbiddenException('Cross-site request blocked'));
    }
    next();
  };
}
