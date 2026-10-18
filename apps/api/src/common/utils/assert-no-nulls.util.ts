import { BadRequestException } from '@nestjs/common';

export function assertNoNulls<T extends object>(changes: T, requiredKeys: (keyof T)[]): void {
  const cleared = requiredKeys.filter((key) => changes[key] === null);
  if (cleared.length > 0) {
    throw new BadRequestException(`${cleared.map(String).join(', ')} cannot be cleared`);
  }
}
