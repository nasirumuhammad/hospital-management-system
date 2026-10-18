import { createHash, randomBytes } from 'node:crypto';
import { OPAQUE_TOKEN_BYTES } from '../constants/auth.constants';

export function generateOpaqueToken(): string {
  return randomBytes(OPAQUE_TOKEN_BYTES).toString('base64url');
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
