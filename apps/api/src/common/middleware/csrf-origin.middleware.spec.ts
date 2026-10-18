import { ForbiddenException } from '@nestjs/common';
import { Request, Response } from 'express';
import { csrfOriginCheck } from './csrf-origin.middleware';

const ALLOWED = ['https://app.example.com'];

function run(request: Partial<Request>): unknown {
  const next = jest.fn();
  csrfOriginCheck(ALLOWED)({ headers: {}, cookies: {}, ...request } as Request, {} as Response, next);
  return next.mock.calls[0][0];
}

describe('csrfOriginCheck', () => {
  it('lets safe methods and cookie-less requests through', () => {
    expect(run({ method: 'GET', cookies: { cp_access: 'x' } })).toBeUndefined();
    expect(run({ method: 'POST' })).toBeUndefined();
  });

  it('blocks cookie-authenticated unsafe requests from unknown or missing origins', () => {
    expect(run({ method: 'POST', cookies: { cp_access: 'x' }, headers: { origin: 'https://evil.example' } })).toBeInstanceOf(ForbiddenException);
    expect(run({ method: 'DELETE', cookies: { cp_refresh: 'x' } })).toBeInstanceOf(ForbiddenException);
  });

  it('accepts an allowed Origin or Referer', () => {
    expect(run({ method: 'POST', cookies: { cp_access: 'x' }, headers: { origin: ALLOWED[0] } })).toBeUndefined();
    expect(run({ method: 'POST', cookies: { cp_access: 'x' }, headers: { referer: `${ALLOWED[0]}/page` } })).toBeUndefined();
  });
});
