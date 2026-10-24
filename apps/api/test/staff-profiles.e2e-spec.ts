import { ADMIN, createTestApp, loginAgent, newAgent, STRONG_PASSWORD, TestContext } from './utils/test-app';

describe('Staff profiles are separate from accounts (e2e)', () => {
  let ctx: TestContext;
  let admin: Awaited<ReturnType<typeof loginAgent>>;

  beforeAll(async () => {
    ctx = await createTestApp();
    admin = await loginAgent(ctx.app, ADMIN.email, ADMIN.password);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  async function createStaff(email: string, role = 'NURSE'): Promise<string> {
    const response = await admin.post('/api/staff').send({ firstName: 'Ngozi', lastName: 'Eze', email, role, jobTitle: 'Ward nurse' }).expect(201);
    return response.body.id;
  }

  async function giveLogin(profileId: string, email: string) {
    const account = (await admin.post('/api/users/from-profile').send({ profileType: 'STAFF', profileId }).expect(201)).body;
    await newAgent(ctx.app).post('/api/auth/reset-password').send({ token: ctx.mail.tokenFor(email, 'account-invitation'), newPassword: STRONG_PASSWORD }).expect(204);
    return account;
  }

  it('creates a staff record with no account, then gives it a login with the matching role', async () => {
    const email = 'ngozi.eze@example.com';
    const id = await createStaff(email);
    expect((await admin.get(`/api/staff/${id}`).expect(200)).body.userId).toBeNull();

    const account = await giveLogin(id, email);
    expect(account).toMatchObject({ email, name: 'Ngozi Eze', role: 'NURSE' });
    expect((await admin.get(`/api/staff/${id}`).expect(200)).body.userId).toBe(account.id);
  });

  it('keeps the staff record, and the work the account did, when the account is deleted', async () => {
    const email = 'cashier.one@example.com';
    const id = await createStaff(email, 'CASHIER');
    const account = await giveLogin(id, email);
    const cashier = await loginAgent(ctx.app, email, STRONG_PASSWORD);

    await admin.delete(`/api/users/${account.id}`).expect(204);

    const profile = (await admin.get(`/api/staff/${id}`).expect(200)).body;
    expect(profile).toMatchObject({ id, email, role: 'CASHIER', isActive: true, userId: null });
    await cashier.get('/api/auth/me').expect(401);
    await newAgent(ctx.app).post('/api/auth/login').send({ email, password: STRONG_PASSWORD }).expect(401);
    const accounts = (await admin.get('/api/users').query({ q: 'cashier.one' }).expect(200)).body;
    expect(accounts.items).toHaveLength(0);

    // The same person can be given a brand-new login afterwards.
    const second = (await admin.post('/api/users/from-profile').send({ profileType: 'STAFF', profileId: id }).expect(201)).body;
    expect(second.id).not.toBe(account.id);
  });

  it('keeps doctor and patient records when their accounts are deleted', async () => {
    const doctorId = (await admin.post('/api/doctors').send({ firstName: 'Tunde', lastName: 'Bello', email: 'tunde@example.com', specialty: 'Cardiology' }).expect(201)).body.id;
    const account = (await admin.post('/api/users/from-profile').send({ profileType: 'DOCTOR', profileId: doctorId }).expect(201)).body;
    await admin.delete(`/api/users/${account.id}`).expect(204);
    expect((await admin.get(`/api/doctors/${doctorId}`).expect(200)).body.userId).toBeNull();
  });

  it('creating a standalone staff-role account also creates its staff record', async () => {
    const email = 'lab.tech@example.com';
    const account = (await admin.post('/api/users').send({ email, name: 'Ife Lab', role: 'LAB' }).expect(201)).body;
    const staff = (await admin.get('/api/staff').query({ q: email }).expect(200)).body.items;
    expect(staff).toHaveLength(1);
    expect(staff[0]).toMatchObject({ role: 'LAB', userId: account.id, firstName: 'Ife', lastName: 'Lab' });
  });

  it('refuses mismatched roles, role changes while linked, removing a profile that has a login, and self-deletion', async () => {
    const email = 'ward.mgr@example.com';
    const id = await createStaff(email, 'WARD_MANAGER');
    const nurseAccount = (await admin.post('/api/users').send({ email: 'other.nurse@example.com', name: 'Other Nurse', role: 'NURSE' }).expect(201)).body;
    await admin.post('/api/users/link-profile').send({ userId: nurseAccount.id, profileType: 'STAFF', profileId: id }).expect(400);

    const account = (await admin.post('/api/users/from-profile').send({ profileType: 'STAFF', profileId: id }).expect(201)).body;
    await admin.patch(`/api/staff/${id}`).send({ role: 'CASHIER' }).expect(409);
    await admin.delete(`/api/staff/${id}`).expect(409);
    await admin.post('/api/staff').send({ firstName: 'X', lastName: 'Y', email, role: 'NURSE' }).expect(400);
    await admin.post('/api/staff').send({ firstName: 'X', lastName: 'Y', email: 'doc@example.com', role: 'DOCTOR' }).expect(400);

    const me = (await admin.get('/api/auth/me')).body;
    await admin.delete(`/api/users/${me.id}`).expect(400);
    await admin.delete(`/api/users/${account.id}`).expect(204);
    await admin.delete(`/api/staff/${id}`).expect(204);
  });

  it('only administrators can manage staff records', async () => {
    const email = 'plain.nurse@example.com';
    const id = await createStaff(email);
    await giveLogin(id, email);
    const nurse = await loginAgent(ctx.app, email, STRONG_PASSWORD);
    await nurse.get('/api/staff').expect(403);
    await nurse.post('/api/staff').send({ firstName: 'A', lastName: 'B', email: 'a@b.com', role: 'NURSE' }).expect(403);
  });
});
