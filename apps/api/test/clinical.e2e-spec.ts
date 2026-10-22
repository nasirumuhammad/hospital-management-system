import { Agent } from 'supertest';
import { ADMIN, createTestApp, loginAgent, STRONG_PASSWORD, TestContext } from './utils/test-app';

interface Person {
  profileId: string;
  userId: string;
  agent: Agent;
}

const FUTURE_HOURS = 48;
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

describe('Authorization, clinical and billing flows (e2e)', () => {
  let ctx: TestContext;
  let admin: Agent;
  let doctorA: Person;
  let doctorB: Person;
  let patient1: Person;
  let patient2: Person;
  let unlinkedDoctor: Agent;

  async function createPerson(kind: 'patients' | 'doctors', email: string, extra: Record<string, unknown>): Promise<Person> {
    const required = kind === 'patients' ? { phone: '08031234567', gender: 'MALE' } : {};
    const profile = await admin.post(`/api/${kind}`).send({ firstName: 'First', lastName: email.split('@')[0], email, ...required, ...extra }).expect(201);
    const role = kind === 'patients' ? 'PATIENT' : 'DOCTOR';
    const account = await admin.post('/api/users').send({ email, name: email, password: STRONG_PASSWORD, role }).expect(201);
    await admin.post('/api/users/link-profile').send({ userId: account.body.id, profileType: role, profileId: profile.body.id }).expect(200);
    return { profileId: profile.body.id, userId: account.body.id, agent: await loginAgent(ctx.app, email, STRONG_PASSWORD) };
  }

  beforeAll(async () => {
    ctx = await createTestApp();
    admin = await loginAgent(ctx.app, ADMIN.email, ADMIN.password);
    doctorA = await createPerson('doctors', 'doctor.a@example.com', { specialty: 'Cardiology' });
    doctorB = await createPerson('doctors', 'doctor.b@example.com', { specialty: 'Neurology' });
    patient1 = await createPerson('patients', 'patient.one@example.com', {});
    patient2 = await createPerson('patients', 'patient.two@example.com', {});
    await admin.post('/api/users').send({ email: 'doctor.c@example.com', name: 'Unlinked', password: STRONG_PASSWORD, role: 'DOCTOR' }).expect(201);
    unlinkedDoctor = await loginAgent(ctx.app, 'doctor.c@example.com', STRONG_PASSWORD);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('role gates and input hardening', () => {
    it('keeps patients out of staff-only resources', async () => {
      await patient1.agent.get('/api/patients').expect(403);
      await patient1.agent.get('/api/users').expect(403);
      await patient1.agent.get('/api/audit-logs').expect(403);
      await patient1.agent.post('/api/doctors').send({ firstName: 'X', lastName: 'Y', email: 'x@y.co', specialty: 'Z' }).expect(403);
    });

    it('rejects unknown fields so a PATCH cannot overwrite internal columns', async () => {
      await admin.patch(`/api/patients/${patient1.profileId}`).send({ userId: patient2.userId }).expect(400);
      await admin.patch(`/api/patients/${patient1.profileId}`).send({ id: patient2.profileId }).expect(400);
      await admin.patch(`/api/patients/${patient1.profileId}`).send({ firstName: null }).expect(400);
      const ok = await admin.patch(`/api/patients/${patient1.profileId}`).send({ phone: '0800000000' }).expect(200);
      expect(ok.body.userId).toBe(patient1.userId);
    });

    it('returns 409 for duplicate emails instead of a server error', async () => {
      await admin.post('/api/patients').send({ firstName: 'Dup', lastName: 'Licate', email: 'patient.one@example.com', phone: '08031234567', gender: 'MALE' }).expect(409);
    });

    it('returns paginated envelopes', async () => {
      const response = await admin.get('/api/patients?page=1&limit=1').expect(200);
      expect(response.body).toMatchObject({ page: 1, limit: 1, total: 2, pages: 2 });
      expect(response.body.items).toHaveLength(1);
      await admin.get('/api/patients?limit=1000').expect(400);
    });
  });

  describe('medical records isolation', () => {
    let recordId: string;

    it('requires a linked doctor profile to author a record', async () => {
      await unlinkedDoctor.post('/api/medical-records').send({ patientId: patient1.profileId, diagnosis: 'Flu', notes: 'Rest' }).expect(403);
      await admin.post('/api/medical-records').send({ patientId: patient1.profileId, diagnosis: 'Flu', notes: 'Rest' }).expect(403);
    });

    it('lets the author and the patient read it, and nobody else', async () => {
      const created = await doctorA.agent
        .post('/api/medical-records').send({ patientId: patient1.profileId, diagnosis: 'Hypertension', notes: 'Monitor BP' }).expect(201);
      recordId = created.body.id;

      await doctorA.agent.get(`/api/medical-records/${recordId}`).expect(200);
      await patient1.agent.get(`/api/medical-records/${recordId}`).expect(200);
      await patient2.agent.get(`/api/medical-records/${recordId}`).expect(404);
      await doctorB.agent.get(`/api/medical-records/${recordId}`).expect(404);

      expect((await patient2.agent.get('/api/medical-records')).body.items).toHaveLength(0);
      expect((await patient1.agent.get('/api/medical-records')).body.items).toHaveLength(1);
      expect((await doctorB.agent.get('/api/medical-records')).body.items).toHaveLength(0);
      expect((await patient2.agent.get(`/api/medical-records?patientId=${patient1.profileId}`)).body.items).toHaveLength(0);
    });

    it('only lets the authoring doctor amend it and audits reads', async () => {
      await doctorB.agent.patch(`/api/medical-records/${recordId}`).send({ notes: 'tamper' }).expect(404);
      await patient1.agent.patch(`/api/medical-records/${recordId}`).send({ notes: 'tamper' }).expect(403);
      const updated = await doctorA.agent.patch(`/api/medical-records/${recordId}`).send({ treatmentPlan: 'ACE inhibitor' }).expect(200);
      expect(updated.body.treatmentPlan).toBe('ACE inhibitor');
      const logs = await admin.get('/api/audit-logs?action=MEDICAL_RECORD_VIEWED').expect(200);
      expect(logs.body.total).toBeGreaterThan(0);
    });

    it('scopes prescriptions the same way and validates the linked record', async () => {
      const prescription = await doctorA.agent.post('/api/prescriptions').send({
        patientId: patient1.profileId, medicalRecordId: recordId, medication: 'Lisinopril', dosage: '10mg', frequency: 'Daily', duration: '30 days',
      }).expect(201);
      await patient1.agent.get(`/api/prescriptions/${prescription.body.id}`).expect(200);
      await patient2.agent.get(`/api/prescriptions/${prescription.body.id}`).expect(404);
      await doctorB.agent.post('/api/prescriptions').send({
        patientId: patient1.profileId, medicalRecordId: recordId, medication: 'X', dosage: '1', frequency: '1', duration: '1',
      }).expect(400);
    });
  });

  describe('appointments', () => {
    let appointmentId: string;
    const slot = hoursFromNow(FUTURE_HOURS);

    it('rejects past dates and books a future slot for the signed-in patient only', async () => {
      await patient1.agent.post('/api/appointments').send({ doctorId: doctorA.profileId, scheduledAt: hoursFromNow(-2) }).expect(400);
      const created = await patient1.agent.post('/api/appointments').send({ doctorId: doctorA.profileId, scheduledAt: slot, reason: 'Checkup' }).expect(201);
      appointmentId = created.body.id;
      expect(created.body.patientId).toBe(patient1.profileId);
      expect(created.body.patient).not.toHaveProperty('address');
    });

    it('refuses double booking, including overlapping slots, and stays race-safe', async () => {
      await patient2.agent.post('/api/appointments').send({ doctorId: doctorA.profileId, scheduledAt: slot }).expect(409);
      const overlapping = new Date(new Date(slot).getTime() + 10 * 60_000).toISOString();
      await patient2.agent.post('/api/appointments').send({ doctorId: doctorA.profileId, scheduledAt: overlapping }).expect(409);

      const raceSlot = hoursFromNow(FUTURE_HOURS + 24);
      const results = await Promise.all([
        patient1.agent.post('/api/appointments').send({ doctorId: doctorB.profileId, scheduledAt: raceSlot }),
        patient2.agent.post('/api/appointments').send({ doctorId: doctorB.profileId, scheduledAt: raceSlot }),
      ]);
      expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    });

    it('scopes visibility and enforces who may change status', async () => {
      await patient2.agent.get(`/api/appointments/${appointmentId}`).expect(404);
      await doctorB.agent.patch(`/api/appointments/${appointmentId}/status`).send({ status: 'CONFIRMED' }).expect(404);
      await patient1.agent.patch(`/api/appointments/${appointmentId}/status`).send({ status: 'CONFIRMED' }).expect(403);
      await doctorA.agent.patch(`/api/appointments/${appointmentId}/status`).send({ status: 'NOPE' }).expect(400);
      await doctorA.agent.patch(`/api/appointments/${appointmentId}/status`).send({ status: 'CONFIRMED' }).expect(200);
      await doctorA.agent.patch(`/api/appointments/${appointmentId}/status`).send({ status: 'PENDING' }).expect(400);
    });

    it('lets a patient cancel their own appointment only, after which the slot frees up', async () => {
      await patient2.agent.post(`/api/appointments/${appointmentId}/cancel`).expect(404);
      const cancelled = await patient1.agent.post(`/api/appointments/${appointmentId}/cancel`).expect(200);
      expect(cancelled.body.status).toBe('CANCELLED');
      await patient1.agent.post(`/api/appointments/${appointmentId}/cancel`).expect(400);
      await patient2.agent.post('/api/appointments').send({ doctorId: doctorA.profileId, scheduledAt: slot }).expect(201);
    });
  });

  describe('billing', () => {
    let invoiceId: string;

    it('creates invoices for admins only and shows patients just their own', async () => {
      await patient1.agent.post('/api/invoices').send({ patientId: patient1.profileId, description: 'Consult', amount: 100 }).expect(403);
      const created = await admin.post('/api/invoices').send({ patientId: patient1.profileId, description: 'Consultation', amount: 100 }).expect(201);
      invoiceId = created.body.id;
      expect(created.body).toMatchObject({ amount: '100.00', amountPaid: '0.00', status: 'UNPAID' });
      await patient1.agent.get(`/api/invoices/${invoiceId}`).expect(200);
      await patient2.agent.get(`/api/invoices/${invoiceId}`).expect(404);
      expect((await patient2.agent.get('/api/invoices')).body.items).toHaveLength(0);
      await doctorA.agent.get('/api/invoices').expect(403);
    });

    it('tracks partial and full payment and refuses overpayment or patient-recorded payments', async () => {
      await patient1.agent.post(`/api/invoices/${invoiceId}/payments`).send({ amount: 10, method: 'CASH' }).expect(403);
      const partial = await admin.post(`/api/invoices/${invoiceId}/payments`).send({ amount: 40.25, method: 'CASH' }).expect(201);
      expect(partial.body).toMatchObject({ amountPaid: '40.25', status: 'PARTIALLY_PAID' });
      await admin.post(`/api/invoices/${invoiceId}/payments`).send({ amount: 59.76, method: 'CARD' }).expect(400);
      const paid = await admin.post(`/api/invoices/${invoiceId}/payments`).send({ amount: 59.75, method: 'TRANSFER', reference: 'TX-1' }).expect(201);
      expect(paid.body).toMatchObject({ amountPaid: '100.00', status: 'PAID' });
      expect(paid.body.payments).toHaveLength(2);
      await admin.post(`/api/invoices/${invoiceId}/void`).expect(400);
    });

    it('never lets concurrent payments overpay an invoice', async () => {
      const created = await admin.post('/api/invoices').send({ patientId: patient2.profileId, description: 'Lab', amount: 100 }).expect(201);
      const attempts = await Promise.all([1, 2, 3].map(() =>
        admin.post(`/api/invoices/${created.body.id}/payments`).send({ amount: 70, method: 'CASH' })));
      expect(attempts.filter((attempt) => attempt.status === 201)).toHaveLength(1);
      const final = await admin.get(`/api/invoices/${created.body.id}`).expect(200);
      expect(final.body.amountPaid).toBe('70.00');
      expect(final.body.payments).toHaveLength(1);
    });

    it('voids unpaid invoices and blocks payment afterwards', async () => {
      const created = await admin.post('/api/invoices').send({ patientId: patient1.profileId, description: 'Mistake', amount: 5 }).expect(201);
      await admin.post(`/api/invoices/${created.body.id}/void`).expect(200);
      await admin.post(`/api/invoices/${created.body.id}/payments`).send({ amount: 5, method: 'CASH' }).expect(400);
    });
  });

  describe('soft deletion and reporting', () => {
    it('soft-deletes a patient, hides them, keeps history readable, and frees the email', async () => {
      const temp = await admin.post('/api/patients').send({ firstName: 'Temp', lastName: 'Patient', email: 'temp.patient@example.com', phone: '08031234567', gender: 'MALE' }).expect(201);
      await admin.delete(`/api/patients/${temp.body.id}`).expect(204);
      await admin.get(`/api/patients/${temp.body.id}`).expect(404);
      await admin.post('/api/patients').send({ firstName: 'Temp', lastName: 'Again', email: 'temp.patient@example.com', phone: '08031234567', gender: 'MALE' }).expect(201);
    });

    it('keeps appointments readable after their doctor is deactivated', async () => {
      const doctor = await admin.post('/api/doctors').send({ firstName: 'Gone', lastName: 'Doc', email: 'gone.doc@example.com', specialty: 'ENT' }).expect(201);
      const booked = await admin.post('/api/appointments').send({
        patientId: patient1.profileId, doctorId: doctor.body.id, scheduledAt: hoursFromNow(FUTURE_HOURS + 72),
      }).expect(201);
      await admin.delete(`/api/doctors/${doctor.body.id}`).expect(204);
      const fetched = await admin.get(`/api/appointments/${booked.body.id}`).expect(200);
      expect(fetched.body.doctor.lastName).toBe('Doc');
      await patient1.agent.post('/api/appointments').send({ doctorId: doctor.body.id, scheduledAt: hoursFromNow(FUTURE_HOURS + 96) }).expect(404);
    });

    it('returns role-appropriate dashboard summaries', async () => {
      const adminSummary = (await admin.get('/api/dashboard/summary').expect(200)).body;
      const patientSummary = (await patient1.agent.get('/api/dashboard/summary').expect(200)).body;
      const doctorSummary = (await doctorA.agent.get('/api/dashboard/summary').expect(200)).body;
      expect(adminSummary).toHaveProperty('patients');
      expect(patientSummary).not.toHaveProperty('patients');
      expect(patientSummary).toHaveProperty('outstandingInvoices');
      expect(doctorSummary).not.toHaveProperty('outstandingInvoices');
    });

    it('records privileged actions in the audit trail with filtering', async () => {
      const response = await admin.get('/api/audit-logs?action=PAYMENT_RECORDED').expect(200);
      expect(response.body.total).toBeGreaterThanOrEqual(3);
      expect(response.body.items.every((entry: { action: string }) => entry.action === 'PAYMENT_RECORDED')).toBe(true);
    });
  });
});
