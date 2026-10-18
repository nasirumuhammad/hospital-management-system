import { validateSync } from 'class-validator';
import { IsNewPassword } from './password.decorator';

class Subject {
  @IsNewPassword() password: string;
  constructor(password: string) {
    this.password = password;
  }
}

const isValid = (password: string) => validateSync(new Subject(password)).length === 0;

describe('IsNewPassword', () => {
  it('requires at least 12 characters', () => {
    expect(isValid('short-pass')).toBe(false);
    expect(isValid('long-enough-pw1')).toBe(true);
  });

  it('rejects passwords over bcrypt’s 72-byte limit, counting bytes not characters', () => {
    expect(isValid('a'.repeat(72))).toBe(true);
    expect(isValid('a'.repeat(73))).toBe(false);
    expect(isValid('é'.repeat(37))).toBe(false);
  });
});
