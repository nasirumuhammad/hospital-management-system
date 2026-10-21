import { ADMIN, createTestApp, loginAgent, newAgent, STRONG_PASSWORD, TestContext } from './utils/test-app';

describe('Account invitations and one-step logins (e2e)', () => {
  let ctx: TestContext;
  let admin: Awaited<ReturnType<typeof loginAgent>>;

  beforeAll(async () => {
    ctx = await createTestApp();
    admin = await loginAgent(ctx.app, ADMIN.email, ADMIN.password);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  async function createPatient(email: string): Promise<string> {
    const response = await admin.post('/api/patients').send({ firstName: 'Ada', lastName: 'Okafor', email }).expect(201);
    return response.body.id;
  }

  async function createDoctor(email: string): Promise<string> {
    const response = await admin.post('/api/doctors').send({ firstName: 'Tunde', lastName: 'Bello', email, specialty: 'Cardiology' }).expect(201);
    return response.body.id;
  }

  describe('creating a login from a patient or doctor record', () => {
    const email = 'ada.okafor@example.com';
    let patientId: string;

    it('creates a linked account and e-mails an invitation instead of a password', async () => {
      patientId = await createPatient(email);
      const response = await admin.post('/api/users/from-profile').send({ profileType: 'PATIENT', profileId: patientId }).expect(201);

      expect(response.body).toMatchObject({ email, name: 'Ada Okafor', role: 'PATIENT' });
      expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|password"/);
      const invitation = ctx.mail.sent.filter((mail) => mail.to === email && mail.kind === 'account-invitation');
      expect(invitation).toHaveLength(1);
      expect(new URL(invitation[0].link).searchParams.get('invited')).toBe('1');
      expect((await admin.get(`/api/patients/${patientId}`).expect(200)).body.userId).toBe(response.body.id);
    });

    it('lets the invited person set a password once, then sign in and see their own profile', async () => {
      const token = ctx.mail.tokenFor(email, 'account-invitation');
      await newAgent(ctx.app).post('/api/auth/reset-password').send({ token, newPassword: STRONG_PASSWORD }).expect(204);

      const patient = await loginAgent(ctx.app, email, STRONG_PASSWORD);
      expect((await patient.get('/api/patients/me').expect(200)).body.email).toBe(email);
      await newAgent(ctx.app).post('/api/auth/reset-password').send({ token, newPassword: 'Another-Strong-Pass-7' }).expect(400);
    });

    it('cannot sign in before the invitation is accepted', async () => {
      const pendingEmail = 'pending.person@example.com';
      const pendingId = await createPatient(pendingEmail);
      await admin.post('/api/users/from-profile').send({ profileType: 'PATIENT', profileId: pendingId }).expect(201);
      await newAgent(ctx.app).post('/api/auth/login').send({ email: pendingEmail, password: STRONG_PASSWORD }).expect(401);
    });

    it('refuses a second login for the same profile', async () => {
      await admin.post('/api/users/from-profile').send({ profileType: 'PATIENT', profileId: patientId }).expect(409);
    });

    it('refuses when another account already uses the profile e-mail, without creating a profile link', async () => {
      const clashingId = await createPatient(ADMIN.email);
      await admin.post('/api/users/from-profile').send({ profileType: 'PATIENT', profileId: clashingId }).expect(409);
      expect((await admin.get(`/api/patients/${clashingId}`).expect(200)).body.userId).toBeNull();
    });

    it('creates a doctor login with the doctor role', async () => {
      const doctorEmail = 'tunde.bello@example.com';
      const doctorId = await createDoctor(doctorEmail);
      const response = await admin.post('/api/users/from-profile').send({ profileType: 'DOCTOR', profileId: doctorId }).expect(201);
      expect(response.body).toMatchObject({ email: doctorEmail, role: 'DOCTOR' });
      expect((await admin.get(`/api/doctors/${doctorId}`).expect(200)).body.userId).toBe(response.body.id);
    });

    it('is restricted to administrators and rejects unknown profiles', async () => {
      const patient = await loginAgent(ctx.app, email, STRONG_PASSWORD);
      await patient.post('/api/users/from-profile').send({ profileType: 'PATIENT', profileId: patientId }).expect(403);
      await admin.post('/api/users/from-profile').send({ profileType: 'PATIENT', profileId: '00000000-0000-4000-8000-000000000000' }).expect(404);
      await admin.post('/api/users/from-profile').send({ profileType: 'NURSE', profileId: patientId }).expect(400);
    });
  });

  describe('Add account with and without a password', () => {
    it('sends an invitation when the password is omitted or blank', async () => {
      await admin.post('/api/users').send({ email: 'no.password@example.com', name: 'No Password', role: 'PATIENT' }).expect(201);
      await admin.post('/api/users').send({ email: 'blank.password@example.com', name: 'Blank', role: 'PATIENT', password: '' }).expect(201);
      expect(ctx.mail.sent.some((mail) => mail.to === 'no.password@example.com' && mail.kind === 'account-invitation')).toBe(true);
      expect(ctx.mail.sent.some((mail) => mail.to === 'blank.password@example.com' && mail.kind === 'account-invitation')).toBe(true);
    });

    it('keeps the verification e-mail flow when the admin sets a temporary password', async () => {
      await admin.post('/api/users').send({ email: 'with.password@example.com', name: 'With Password', role: 'PATIENT', password: STRONG_PASSWORD }).expect(201);
      expect(ctx.mail.sent.some((mail) => mail.to === 'with.password@example.com' && mail.kind === 'email-verification')).toBe(true);
      expect(ctx.mail.sent.some((mail) => mail.to === 'with.password@example.com' && mail.kind === 'account-invitation')).toBe(false);
      await newAgent(ctx.app).post('/api/auth/login').send({ email: 'with.password@example.com', password: STRONG_PASSWORD }).expect(200);
    });

    it('still rejects a password that is too short', async () => {
      await admin.post('/api/users').send({ email: 'short@example.com', name: 'Short', role: 'PATIENT', password: 'short' }).expect(400);
    });
  });
});
