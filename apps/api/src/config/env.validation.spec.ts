import { validateEnv } from './env.validation';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'a'.repeat(40),
};

describe('validateEnv', () => {
  it('applies safe defaults', () => {
    const env = validateEnv(valid);
    expect(env.ACCESS_TOKEN_TTL_SECONDS).toBe(900);
    expect(env.COOKIE_SAME_SITE).toBe('lax');
    expect(env.REQUIRE_EMAIL_VERIFICATION).toBe(false);
  });

  it('parses boolean strings correctly ("false" must not become true)', () => {
    expect(validateEnv({ ...valid, REQUIRE_EMAIL_VERIFICATION: 'false' }).REQUIRE_EMAIL_VERIFICATION).toBe(false);
    expect(validateEnv({ ...valid, REQUIRE_EMAIL_VERIFICATION: 'true' }).REQUIRE_EMAIL_VERIFICATION).toBe(true);
  });

  it('rejects short secrets and missing database configuration', () => {
    expect(() => validateEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
    expect(() => validateEnv({ JWT_SECRET: valid.JWT_SECRET })).toThrow(/DATABASE_URL/);
  });

  it('refuses unsafe production settings', () => {
    const production = { ...valid, NODE_ENV: 'production' };
    expect(() => validateEnv(production)).toThrow(/MAIL_TRANSPORT/);
    expect(() => validateEnv({ ...production, JWT_SECRET: `replace_with_${'a'.repeat(30)}`, MAIL_TRANSPORT: 'resend', RESEND_API_KEY: 're_test_key', WEB_URL: 'https://app.example.com' })).toThrow(/placeholder/);
    expect(() => validateEnv({ ...production, MAIL_TRANSPORT: 'resend', RESEND_API_KEY: 're_test_key', WEB_URL: 'http://app.example.com' })).toThrow(/https/);
    expect(() => validateEnv({ ...production, MAIL_TRANSPORT: 'resend', RESEND_API_KEY: 're_test_key', WEB_URL: 'https://app.example.com' })).not.toThrow();
  });

  it('requires an API key whenever Resend is the mail transport', () => {
    expect(() => validateEnv({ ...valid, MAIL_TRANSPORT: 'resend' })).toThrow(/RESEND_API_KEY/);
    expect(() => validateEnv({ ...valid, MAIL_TRANSPORT: 'resend', RESEND_API_KEY: 're_test_key' })).not.toThrow();
  });
});
