import request from 'supertest';
import { ADMIN, cookieValue, createTestApp, loginAgent, newAgent, STRONG_PASSWORD, TestContext, WEB_ORIGIN } from './utils/test-app';

describe('Authentication and sessions (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('logs in with HttpOnly cookies and never leaks the password hash', async () => {
    const response = await newAgent(ctx.app).post('/api/auth/login').send(ADMIN).expect(200);
    const setCookie = (response.headers['set-cookie'] as unknown as string[]).join('\n');
    expect(setCookie).toMatch(/cp_access=.*HttpOnly/);
    const refreshCookie = setCookie.split('\n').find((line) => line.startsWith('cp_refresh=')) as string;
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('Path=/api/auth');
    expect(response.body.user).toMatchObject({ email: ADMIN.email, role: 'ADMIN' });
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|accessToken|refreshToken/);
  });

  it('returns an identical response for an unknown email and a wrong password', async () => {
    const unknown = await newAgent(ctx.app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'whatever-123456' });
    const wrong = await newAgent(ctx.app).post('/api/auth/login').send({ email: ADMIN.email, password: 'wrong-password-123' });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it('rejects protected routes without a session', async () => {
    await request(ctx.app.getHttpServer()).get('/api/auth/me').expect(401);
    await request(ctx.app.getHttpServer()).get('/api/patients').expect(401);
  });

  it('blocks cookie-authenticated writes from a foreign origin', async () => {
    const agent = await loginAgent(ctx.app, ADMIN.email, ADMIN.password);
    await agent.post('/api/patients').set('Origin', 'https://evil.example').send({}).expect(403);
    await agent.post('/api/auth/logout').set('Origin', WEB_ORIGIN).expect(204);
  });

  it('rotates refresh tokens and revokes every session when an old one is replayed', async () => {
    const login = await newAgent(ctx.app).post('/api/auth/login').send(ADMIN).expect(200);
    const original = cookieValue(login, 'cp_refresh') as string;

    const rotated = await request(ctx.app.getHttpServer())
      .post('/api/auth/refresh').set('Origin', WEB_ORIGIN).set('Cookie', `cp_refresh=${original}`).expect(200);
    const rotatedRefresh = cookieValue(rotated, 'cp_refresh') as string;
    const rotatedAccess = cookieValue(rotated, 'cp_access') as string;
    expect(rotatedRefresh).not.toEqual(original);

    await request(ctx.app.getHttpServer())
      .get('/api/auth/me').set('Cookie', `cp_access=${rotatedAccess}`).expect(200);

    await request(ctx.app.getHttpServer())
      .post('/api/auth/refresh').set('Origin', WEB_ORIGIN).set('Cookie', `cp_refresh=${original}`).expect(401);

    await request(ctx.app.getHttpServer())
      .get('/api/auth/me').set('Cookie', `cp_access=${rotatedAccess}`).expect(401);
    await request(ctx.app.getHttpServer())
      .post('/api/auth/refresh').set('Origin', WEB_ORIGIN).set('Cookie', `cp_refresh=${rotatedRefresh}`).expect(401);
  });

  it('logs out a single session without affecting others', async () => {
    const first = await loginAgent(ctx.app, ADMIN.email, ADMIN.password);
    const second = await loginAgent(ctx.app, ADMIN.email, ADMIN.password);
    await first.post('/api/auth/logout').expect(204);
    await first.post('/api/auth/refresh').expect(401);
    await second.post('/api/auth/refresh').expect(200);
  });

  describe('password change', () => {
    const email = 'changer@example.com';
    const original = 'Original-Password-123';

    beforeAll(async () => {
      const admin = await loginAgent(ctx.app, ADMIN.email, ADMIN.password);
      await admin.post('/api/users').send({ email, name: 'Changer', password: original, role: 'PATIENT' }).expect(201);
    });

    it('rejects a wrong current password and weak new passwords', async () => {
      const agent = await loginAgent(ctx.app, email, original);
      await agent.patch('/api/auth/password').send({ currentPassword: 'nope-nope-nope', newPassword: STRONG_PASSWORD }).expect(400);
      await agent.patch('/api/auth/password').send({ currentPassword: original, newPassword: 'short' }).expect(400);
      await agent.patch('/api/auth/password').send({ currentPassword: original, newPassword: original }).expect(400);
    });

    it('keeps the current device signed in and signs every other device out', async () => {
      const current = await loginAgent(ctx.app, email, original);
      const other = await loginAgent(ctx.app, email, original);
      await current.patch('/api/auth/password').send({ currentPassword: original, newPassword: STRONG_PASSWORD }).expect(200);
      await current.get('/api/auth/me').expect(200);
      await other.get('/api/auth/me').expect(401);
      await newAgent(ctx.app).post('/api/auth/login').send({ email, password: original }).expect(401);
      await newAgent(ctx.app).post('/api/auth/login').send({ email, password: STRONG_PASSWORD }).expect(200);
    });
  });

  describe('password reset', () => {
    const email = 'forgetful@example.com';
    const password = 'Forgotten-Password-1';

    beforeAll(async () => {
      const admin = await loginAgent(ctx.app, ADMIN.email, ADMIN.password);
      await admin.post('/api/users').send({ email, name: 'Forgetful', password, role: 'PATIENT' }).expect(201);
    });

    it('answers identically for known and unknown emails and only mails real accounts', async () => {
      const before = ctx.mail.sent.length;
      const unknown = await newAgent(ctx.app).post('/api/auth/forgot-password').send({ email: 'ghost@example.com' });
      expect(ctx.mail.sent.length).toBe(before);
      const known = await newAgent(ctx.app).post('/api/auth/forgot-password').send({ email });
      expect(known.status).toBe(unknown.status);
      expect(known.body).toEqual(unknown.body);
      expect(ctx.mail.sent.length).toBe(before + 1);
    });

    it('resets once, invalidates sessions, and rejects reuse or garbage tokens identically', async () => {
      const session = await loginAgent(ctx.app, email, password);
      await newAgent(ctx.app).post('/api/auth/forgot-password').send({ email });
      const token = ctx.mail.tokenFor(email, 'password-reset');

      await newAgent(ctx.app).post('/api/auth/reset-password').send({ token, newPassword: STRONG_PASSWORD }).expect(204);
      await session.get('/api/auth/me').expect(401);
      await newAgent(ctx.app).post('/api/auth/login').send({ email, password }).expect(401);
      await newAgent(ctx.app).post('/api/auth/login').send({ email, password: STRONG_PASSWORD }).expect(200);

      const reused = await newAgent(ctx.app).post('/api/auth/reset-password').send({ token, newPassword: 'Another-Strong-Pass-7' });
      const garbage = await newAgent(ctx.app).post('/api/auth/reset-password').send({ token: 'garbage', newPassword: 'Another-Strong-Pass-7' });
      expect(reused.status).toBe(400);
      expect(reused.body).toEqual(garbage.body);
    });

    it('invalidates an older link when a newer one is requested', async () => {
      await newAgent(ctx.app).post('/api/auth/forgot-password').send({ email });
      const older = ctx.mail.tokenFor(email, 'password-reset');
      await newAgent(ctx.app).post('/api/auth/forgot-password').send({ email });
      await newAgent(ctx.app).post('/api/auth/reset-password').send({ token: older, newPassword: 'Yet-Another-Pass-42' }).expect(400);
    });
  });

  describe('email verification and account status', () => {
    const email = 'newhire@example.com';
    const password = 'Temporary-Password-1';

    it('mails a verification link on account creation and marks the account verified once used', async () => {
      const admin = await loginAgent(ctx.app, ADMIN.email, ADMIN.password);
      await admin.post('/api/users').send({ email, name: 'New Hire', password, role: 'DOCTOR' }).expect(201);
      const user = await loginAgent(ctx.app, email, password);
      expect((await user.get('/api/auth/me')).body.emailVerified).toBe(false);

      const token = ctx.mail.tokenFor(email, 'email-verification');
      await newAgent(ctx.app).post('/api/auth/verify-email').send({ token }).expect(204);
      expect((await user.get('/api/auth/me')).body.emailVerified).toBe(true);
      await newAgent(ctx.app).post('/api/auth/verify-email').send({ token }).expect(400);
    });

    it('cuts off a disabled account immediately and refuses to disable oneself', async () => {
      const admin = await loginAgent(ctx.app, ADMIN.email, ADMIN.password);
      const adminId = (await admin.get('/api/auth/me')).body.id as string;
      await admin.patch(`/api/users/${adminId}/active`).send({ isActive: false }).expect(400);

      const user = await loginAgent(ctx.app, email, password);
      const userId = (await user.get('/api/auth/me')).body.id as string;
      await admin.patch(`/api/users/${userId}/active`).send({ isActive: false }).expect(200);
      await user.get('/api/auth/me').expect(401);
      await user.post('/api/auth/refresh').expect(401);
      await newAgent(ctx.app).post('/api/auth/login').send({ email, password }).expect(401);

      await admin.patch(`/api/users/${userId}/active`).send({ isActive: true }).expect(200);
      await user.get('/api/auth/me').expect(401);
      await newAgent(ctx.app).post('/api/auth/login').send({ email, password }).expect(200);
    });
  });
});
