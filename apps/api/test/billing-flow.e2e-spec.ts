import { Agent } from 'supertest';
import { ADMIN, createTestApp, loginAgent, STRONG_PASSWORD, TestContext } from './utils/test-app';

const NEXT_YEAR = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);

describe('Prescription and laboratory billing flow (e2e)', () => {
  let ctx: TestContext;
  let admin: Agent;
  let doctor: Agent;
  let pharmacist: Agent;
  let cashier: Agent;
  let lab: Agent;
  let nurse: Agent;
  let patientId: string;
  let visitId: string;
  let recordId: string;
  let drugId: string;
  let testId: string;

  async function staff(role: string): Promise<Agent> {
    const email = `${role.toLowerCase()}@example.com`;
    await admin.post('/api/users').send({ email, name: `${role} Person`, password: STRONG_PASSWORD, role }).expect(201);
    return loginAgent(ctx.app, email, STRONG_PASSWORD);
  }

  async function prescribe(quantity = 20): Promise<string> {
    const response = await doctor.post('/api/prescriptions').send({
      patientId, medicalRecordId: recordId, medication: 'Amoxicillin 500 mg', dosage: '1 capsule', frequency: 'Three times daily', duration: '7 days', drugId, quantityPrescribed: quantity,
    }).expect(201);
    return response.body.id;
  }

  beforeAll(async () => {
    ctx = await createTestApp();
    admin = await loginAgent(ctx.app, ADMIN.email, ADMIN.password);
    const profile = await admin.post('/api/doctors').send({ firstName: 'Tunde', lastName: 'Bello', email: 'doctor@example.com', specialty: 'General practice' }).expect(201);
    const account = await admin.post('/api/users').send({ email: 'doctor@example.com', name: 'Dr Bello', password: STRONG_PASSWORD, role: 'DOCTOR' }).expect(201);
    await admin.post('/api/users/link-profile').send({ userId: account.body.id, profileType: 'DOCTOR', profileId: profile.body.id }).expect(200);
    doctor = await loginAgent(ctx.app, 'doctor@example.com', STRONG_PASSWORD);
    pharmacist = await staff('PHARMACIST');
    cashier = await staff('CASHIER');
    lab = await staff('LAB');
    nurse = await staff('NURSE');

    patientId = (await admin.post('/api/patients').send({ firstName: 'Ada', lastName: 'Okafor', phone: '08031234567', gender: 'FEMALE' }).expect(201)).body.id;
    visitId = (await nurse.post('/api/visits').send({ patientId, source: 'WALK_IN' }).expect(201)).body.id;
    recordId = (await doctor.post('/api/medical-records').send({ patientId, visitId, diagnosis: 'Tonsillitis', notes: 'Sore throat for three days' }).expect(201)).body.id;

    drugId = (await pharmacist.post('/api/pharmacy/drugs').send({ genericName: 'Amoxicillin', form: 'CAPSULE', strength: '500 mg', dispensingUnit: 'capsule', unitPrice: 150 }).expect(201)).body.id;
    await pharmacist.post(`/api/pharmacy/drugs/${drugId}/batches`).send({ batchNumber: 'B-001', expiryDate: NEXT_YEAR, quantityReceived: 100 }).expect(201);
    testId = (await lab.post('/api/lab/tests').send({ code: 'FBC', name: 'Full blood count', category: 'Haematology', specimen: 'Blood', price: 2500 }).expect(201)).body.id;
    await lab.post(`/api/lab/tests/${testId}/parameters`).send({ name: 'Haemoglobin', unit: 'g/dL' }).expect(201);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('pharmacy', () => {
    let prescriptionId: string;
    let invoiceId: string;

    it('lets the doctor prescribe but not bill, collect payment or dispense', async () => {
      prescriptionId = await prescribe();
      await doctor.post(`/api/pharmacy/prescriptions/${prescriptionId}/invoice`).expect(403);
      await doctor.post(`/api/pharmacy/prescriptions/${prescriptionId}/dispense`).send({ quantity: 20 }).expect(403);
    });

    it('will not dispense before an invoice exists', async () => {
      const response = await pharmacist.post(`/api/pharmacy/prescriptions/${prescriptionId}/dispense`).send({ quantity: 20 }).expect(409);
      expect(response.body.message).toMatch(/generate the invoice/i);
    });

    it('has the pharmacy generate the invoice from the catalogue price', async () => {
      const response = await pharmacist.post(`/api/pharmacy/prescriptions/${prescriptionId}/invoice`).expect(201);
      invoiceId = response.body.invoice.id;
      expect(response.body.status).toBe('AWAITING_PAYMENT');
      expect(response.body.invoice).toMatchObject({ amount: '3000.00', status: 'UNPAID', patientId });
      await pharmacist.post(`/api/pharmacy/prescriptions/${prescriptionId}/invoice`).expect(409);
    });

    it('will not dispense until the cashier has been paid, and the pharmacy cannot take payment itself', async () => {
      const blocked = await pharmacist.post(`/api/pharmacy/prescriptions/${prescriptionId}/dispense`).send({ quantity: 20 }).expect(409);
      expect(blocked.body.message).toMatch(/cashier/i);
      await pharmacist.post(`/api/invoices/${invoiceId}/payments`).send({ amount: 3000, method: 'CASH' }).expect(403);
    });

    it('keeps the prescription locked after a part payment, then releases it when the cashier is fully paid', async () => {
      await cashier.post(`/api/invoices/${invoiceId}/payments`).send({ amount: 1000, method: 'CASH' }).expect(201);
      await pharmacist.post(`/api/pharmacy/prescriptions/${prescriptionId}/dispense`).send({ quantity: 20 }).expect(409);
      await cashier.post(`/api/invoices/${invoiceId}/payments`).send({ amount: 2000, method: 'CASH' }).expect(201);
      const queue = await pharmacist.get('/api/pharmacy/queue').expect(200);
      expect(queue.body.find((item: { id: string }) => item.id === prescriptionId)).toMatchObject({ status: 'PAID', invoiceStatus: 'PAID' });
    });

    it('lets the pharmacy dispense once paid, and the cashier cannot dispense', async () => {
      await cashier.post(`/api/pharmacy/prescriptions/${prescriptionId}/dispense`).send({ quantity: 20 }).expect(403);
      const response = await pharmacist.post(`/api/pharmacy/prescriptions/${prescriptionId}/dispense`).send({ quantity: 20 }).expect(201);
      expect(response.body).toMatchObject({ status: 'DISPENSED', quantityRemaining: 0 });
      const drugs = await pharmacist.get('/api/pharmacy/drugs').expect(200);
      expect(drugs.body.find((drug: { id: string }) => drug.id === drugId).availableStock).toBe(80);
    });

    it('returns an unpaid prescription to the pharmacy when its invoice is voided', async () => {
      const second = await prescribe(10);
      const generated = await pharmacist.post(`/api/pharmacy/prescriptions/${second}/invoice`).expect(201);
      await admin.post(`/api/invoices/${generated.body.invoice.id}/void`).expect(200);
      const queue = await pharmacist.get('/api/pharmacy/queue').expect(200);
      expect(queue.body.find((item: { id: string }) => item.id === second)).toMatchObject({ status: 'PENDING', invoiceId: null });
    });

    it('refuses to invoice a drug that has no price', async () => {
      const unpriced = (await pharmacist.post('/api/pharmacy/drugs').send({ genericName: 'Paracetamol', form: 'TABLET', dispensingUnit: 'tablet' }).expect(201)).body.id;
      await pharmacist.post(`/api/pharmacy/drugs/${unpriced}/batches`).send({ batchNumber: 'P-1', expiryDate: NEXT_YEAR, quantityReceived: 50 }).expect(201);
      const response = await doctor.post('/api/prescriptions').send({
        patientId, medicalRecordId: recordId, medication: 'Paracetamol', dosage: '1 tablet', frequency: 'Twice daily', duration: '3 days', drugId: unpriced, quantityPrescribed: 6,
      }).expect(201);
      const refused = await pharmacist.post(`/api/pharmacy/prescriptions/${response.body.id}/invoice`).expect(400);
      expect(refused.body.message).toMatch(/set a price/i);
      await pharmacist.patch(`/api/pharmacy/drugs/${unpriced}/price`).send({ price: 50 }).expect(200);
      await pharmacist.post(`/api/pharmacy/prescriptions/${response.body.id}/invoice`).expect(201);
    });
  });

  describe('laboratory', () => {
    let orderId: string;
    let itemId: string;
    let invoiceId: string;

    it('lets the doctor order tests but not bill or collect', async () => {
      const response = await doctor.post('/api/lab/orders').send({ visitId, medicalRecordId: recordId, labTestIds: [testId] }).expect(201);
      orderId = response.body.id;
      itemId = response.body.items[0].id;
      await doctor.post(`/api/lab/orders/${orderId}/invoice`).expect(403);
      await doctor.post(`/api/lab/order-items/${itemId}/collect`).expect(403);
    });

    it('will not collect a specimen before an invoice exists', async () => {
      const response = await lab.post(`/api/lab/order-items/${itemId}/collect`).expect(409);
      expect(response.body.message).toMatch(/generate the invoice/i);
    });

    it('has the lab generate the invoice, which the cashier then collects', async () => {
      const response = await lab.post(`/api/lab/orders/${orderId}/invoice`).expect(201);
      invoiceId = response.body.invoice.id;
      expect(response.body.invoice).toMatchObject({ amount: '2500.00', status: 'UNPAID' });
      await lab.post(`/api/lab/orders/${orderId}/invoice`).expect(409);
      await lab.post(`/api/invoices/${invoiceId}/payments`).send({ amount: 2500, method: 'CASH' }).expect(403);
      const blocked = await lab.post(`/api/lab/order-items/${itemId}/collect`).expect(409);
      expect(blocked.body.message).toMatch(/cashier/i);
      const listed = (await lab.get('/api/lab/orders').expect(200)).body.find((order: { id: string }) => order.id === orderId);
      expect(listed).toMatchObject({ invoiceStatus: 'UNPAID', invoiceAmount: '2500.00' });
    });

    it('lets the lab work once the cashier has been paid, and nobody else can', async () => {
      await cashier.post(`/api/invoices/${invoiceId}/payments`).send({ amount: 2500, method: 'TRANSFER', reference: 'TRF-1' }).expect(201);
      await cashier.post(`/api/lab/order-items/${itemId}/collect`).expect(403);
      await lab.post(`/api/lab/order-items/${itemId}/collect`).expect(201);
      await lab.post(`/api/lab/order-items/${itemId}/results`).send({ results: [{ parameterName: 'Haemoglobin', value: '13.2' }] }).expect(201);
      const listed = (await doctor.get('/api/lab/orders').expect(200)).body.find((order: { id: string }) => order.id === orderId);
      expect(listed.items[0].status).toBe('RESULTED');
    });
  });
});
