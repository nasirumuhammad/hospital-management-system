import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitStatusDto } from './dto/update-visit-status.dto';
import { CreateTriageDto } from './dto/create-triage.dto';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { RecordLabResultsDto } from './dto/record-lab-results.dto';
import { CreateDrugDto } from './dto/create-drug.dto';
import { ReceiveDrugBatchDto } from './dto/receive-drug-batch.dto';
import { DispensePrescriptionDto, StockAdjustmentDto, WalkInDispenseDto } from './dto/dispense.dto';
import { AddInvoiceItemDto, AntenatalVisitDto, CloseShiftDto, CreateAntenatalDto, CreateBedDto, CreateClaimDto, CreateServiceDto, CreateServicePriceDto, CreateWardDto, DischargePatientDto, FamilyPlanningDto, ImmunizationDto, AdmitPatientDto, NursingObservationDto, OpenShiftDto, UpdateClaimDto, CreateAllergyDto, ReviewAllergiesDto, CreatePayerDto, CreateCoverageDto, CreateAuthorizationDto, CreateLabTestDto, CreateLabParameterDto, CreateLabRangeDto, CreateDiagnosisDto } from './dto/operations-extra.dto';

@Injectable()
export class OperationsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createVisit(dto: CreateVisitDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    if ((dto.source === 'APPOINTMENT') !== Boolean(dto.appointmentId)) throw new BadRequestException('Appointment visits require appointmentId, and non-appointment visits must not provide it');
    return this.dataSource.transaction(async (manager) => {
      const patient = await this.one(manager, `SELECT "id" FROM "patients" WHERE "id"=$1 AND "hospitalId"=$2 AND "deletedAt" IS NULL FOR SHARE`, [dto.patientId, hospitalId]);
      if (!patient) throw new NotFoundException('Patient not found');
      if (dto.appointmentId) {
        const appointment = await this.one(manager, `SELECT "id" FROM "appointments" WHERE "id"=$1 AND "hospitalId"=$2 AND "patientId"=$3 AND "status" IN ('PENDING','CONFIRMED') AND "deletedAt" IS NULL`, [dto.appointmentId, hospitalId, dto.patientId]);
        if (!appointment) throw new BadRequestException('Appointment must be active and belong to this patient and hospital');
        if (await this.one(manager, `SELECT "id" FROM "visits" WHERE "appointmentId"=$1 AND "hospitalId"=$2`, [dto.appointmentId,hospitalId])) throw new ConflictException('This appointment already has a registered visit');
      }
      if (dto.payerId) {
        if (!(await this.one(manager, `SELECT "id" FROM "payers" WHERE "id"=$1 AND "hospitalId"=$2 AND "isActive"=true`, [dto.payerId, hospitalId]))) throw new BadRequestException('Payer not found or inactive');
        if (!(await this.one(manager, `SELECT "id" FROM "patient_coverages" WHERE "patientId"=$1 AND "payerId"=$2 AND "hospitalId"=$3 AND "isActive"=true AND ("expiresAt" IS NULL OR "expiresAt">=(now() AT TIME ZONE 'Africa/Lagos')::date)`, [dto.patientId,dto.payerId,hospitalId]))) throw new BadRequestException('Patient has no active coverage with this payer');
      }
      if (dto.doctorId && !(await this.one(manager, `SELECT "id" FROM "doctors" WHERE "id"=$1 AND "hospitalId"=$2 AND "isActive"=true AND "deletedAt" IS NULL`, [dto.doctorId, hospitalId]))) throw new BadRequestException('Doctor not found or inactive');
      const [counter] = await manager.query(`SELECT "lastVisitDate", "lastVisitNumber" FROM "hospitals" WHERE "id"=$1 AND "isActive"=true FOR UPDATE`, [hospitalId]);
      if (!counter) throw new NotFoundException('Hospital not found or inactive');
      const visitDate = this.nigeriaDate();
      const visitNumber = counter.lastVisitDate === visitDate ? Number(counter.lastVisitNumber) + 1 : 1;
      await manager.query(`UPDATE "hospitals" SET "lastVisitDate"=$2, "lastVisitNumber"=$3, "updatedAt"=now() WHERE "id"=$1`, [hospitalId, visitDate, visitNumber]);
      const rows = await manager.query(`INSERT INTO "visits" ("hospitalId","patientId","visitNumber","visitDate","source","appointmentId","payerId","doctorId","priority","registeredById") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [hospitalId, dto.patientId, visitNumber, visitDate, dto.source, dto.appointmentId ?? null, dto.payerId ?? null, dto.doctorId ?? null, dto.priority ?? 'NORMAL', actor.id]);
      await this.writeAudit(manager, hospitalId, actor.id, 'VISIT_CREATED', 'visit', rows[0].id, { patientId: dto.patientId, visitNumber });
      return rows[0];
    });
  }

  async listVisits(actor: AuthenticatedUser, query: { date?: string; status?: string; q?: string }) {
    const hospitalId = this.hospital(actor);
    const date = query.date ?? this.nigeriaDate();
    const params: unknown[] = [hospitalId, date];
    let where = `v."hospitalId"=$1 AND v."visitDate"=$2`;
    if (query.status) { params.push(query.status); where += ` AND v."status"=$${params.length}`; }
    if (query.q?.trim()) { params.push(`%${query.q.trim().replace(/[\\%_]/g, '\\$&')}%`); where += ` AND (p."firstName" ILIKE $${params.length} OR p."lastName" ILIKE $${params.length} OR p."hospitalNumber" ILIKE $${params.length} OR p."phone" ILIKE $${params.length})`; }
    return this.dataSource.query(`SELECT v.*, p."firstName", p."middleName", p."lastName", p."hospitalNumber", p."phone", d."firstName" AS "doctorFirstName", d."lastName" AS "doctorLastName" FROM "visits" v JOIN "patients" p ON p."id"=v."patientId" AND p."hospitalId"=v."hospitalId" LEFT JOIN "doctors" d ON d."id"=v."doctorId" AND d."hospitalId"=v."hospitalId" WHERE ${where} ORDER BY CASE WHEN v."priority"='URGENT' THEN 0 ELSE 1 END, v."visitNumber" ASC`, params);
  }

  async updateVisitStatus(id: string, dto: UpdateVisitStatusDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    const allowed: Record<string, string[]> = {
      WAITING: ['IN_TRIAGE','CANCELLED'], IN_TRIAGE: ['WITH_DOCTOR','CANCELLED'], WITH_DOCTOR: ['AWAITING_SERVICES','COMPLETED','CANCELLED'],
      AWAITING_SERVICES: ['COMPLETED','CANCELLED'], COMPLETED: [], CANCELLED: [],
    };
    return this.dataSource.transaction(async (manager) => {
      const [visit] = await manager.query(`SELECT * FROM "visits" WHERE "id"=$1 AND "hospitalId"=$2 FOR UPDATE`, [id, hospitalId]);
      if (!visit) throw new NotFoundException('Visit not found');
      if (!allowed[visit.status]?.includes(dto.status)) throw new ConflictException(`Visit cannot transition from ${visit.status} to ${dto.status}`);
      const roleTransitions: Partial<Record<string, string[]>> = {
        RECEPTIONIST: ['CANCELLED'],
        NURSE: visit.status === 'WAITING' ? ['IN_TRIAGE','CANCELLED'] : [],
        DOCTOR: visit.status === 'IN_TRIAGE' ? ['WITH_DOCTOR','CANCELLED'] : visit.status === 'WITH_DOCTOR' ? ['AWAITING_SERVICES','COMPLETED','CANCELLED'] : visit.status === 'AWAITING_SERVICES' ? ['COMPLETED','CANCELLED'] : [],
        CASHIER: [],
      };
      if (actor.role !== 'ADMIN' && !roleTransitions[actor.role]?.includes(dto.status)) throw new ConflictException('Your role cannot make this visit status transition');
      if (dto.status === 'COMPLETED') {
        const [pendingLabs] = await manager.query(`SELECT COUNT(*)::int AS total FROM "lab_orders" o JOIN "lab_order_items" i ON i."labOrderId"=o."id" AND i."hospitalId"=o."hospitalId" WHERE o."visitId"=$1 AND o."hospitalId"=$2 AND i."status" NOT IN ('RESULTED','CANCELLED')`, [id,hospitalId]);
        const [pendingPrescriptions] = await manager.query(`SELECT COUNT(*)::int AS total FROM "medical_records" m JOIN "prescriptions" p ON p."medicalRecordId"=m."id" AND p."hospitalId"=m."hospitalId" WHERE m."visitId"=$1 AND m."hospitalId"=$2 AND p."status" NOT IN ('DISPENSED','CANCELLED')`, [id,hospitalId]);
        const [unpaidInvoices] = await manager.query(`SELECT COUNT(*)::int AS total FROM "invoices" i WHERE i."hospitalId"=$1 AND i."visitId"=$2 AND i."status" IN ('UNPAID','PARTIALLY_PAID')`, [hospitalId,id]);
        if (Number(pendingLabs.total) || Number(pendingPrescriptions.total) || Number(unpaidInvoices.total)) throw new ConflictException('Visit has pending lab results, prescriptions or payment; keep it awaiting services');
      }
      const [updated] = await manager.query(`UPDATE "visits" SET "status"=$3, "closedAt"=CASE WHEN $3 IN ('COMPLETED','CANCELLED') THEN now() ELSE NULL END, "updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2 RETURNING *`, [id, hospitalId, dto.status]);
      await this.writeAudit(manager, hospitalId, actor.id, 'VISIT_STATUS_CHANGED', 'visit', id, { from: visit.status, to: dto.status });
      return updated;
    });
  }

  async createTriage(visitId: string, dto: CreateTriageDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      const [visit] = await manager.query(`SELECT * FROM "visits" WHERE "id"=$1 AND "hospitalId"=$2 FOR UPDATE`, [visitId, hospitalId]);
      if (!visit) throw new NotFoundException('Visit not found');
      if (!['WAITING','IN_TRIAGE'].includes(visit.status)) throw new ConflictException('Triage can only be recorded for a waiting or triage visit');
      const [triage] = await manager.query(`INSERT INTO "triage_records" ("hospitalId","visitId","recordedById","chiefComplaint","temperatureC","pulseBpm","respiratoryRate","systolicBp","diastolicBp","spo2","weightKg","heightCm","notes") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT ("visitId") DO UPDATE SET "recordedById"=EXCLUDED."recordedById", "recordedAt"=now(), "chiefComplaint"=EXCLUDED."chiefComplaint", "temperatureC"=EXCLUDED."temperatureC", "pulseBpm"=EXCLUDED."pulseBpm", "respiratoryRate"=EXCLUDED."respiratoryRate", "systolicBp"=EXCLUDED."systolicBp", "diastolicBp"=EXCLUDED."diastolicBp", "spo2"=EXCLUDED."spo2", "weightKg"=EXCLUDED."weightKg", "heightCm"=EXCLUDED."heightCm", "notes"=EXCLUDED."notes", "updatedAt"=now() RETURNING *`, [hospitalId, visitId, actor.id, dto.chiefComplaint, dto.temperatureC ?? null, dto.pulseBpm ?? null, dto.respiratoryRate ?? null, dto.systolicBp ?? null, dto.diastolicBp ?? null, dto.spo2 ?? null, dto.weightKg ?? null, dto.heightCm ?? null, dto.notes ?? null]);
      await manager.query(`UPDATE "visits" SET "status"='IN_TRIAGE', "priority"=CASE WHEN $3='URGENT' THEN 'URGENT' ELSE "priority" END, "updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2`, [visitId, hospitalId, dto.priority ?? 'NORMAL']);
      await this.writeAudit(manager, hospitalId, actor.id, 'TRIAGE_RECORDED', 'triage_record', triage.id, { visitId });
      return { ...triage, bmi: dto.weightKg && dto.heightCm ? Number((dto.weightKg / ((dto.heightCm / 100) ** 2)).toFixed(1)) : null };
    });
  }

  async createLabOrder(dto: CreateLabOrderDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      const [visit] = await manager.query(`SELECT "id","patientId" FROM "visits" WHERE "id"=$1 AND "hospitalId"=$2 FOR SHARE`, [dto.visitId, hospitalId]);
      if (!visit) throw new NotFoundException('Visit not found');
      if (dto.medicalRecordId && !(await this.one(manager, `SELECT "id" FROM "medical_records" WHERE "id"=$1 AND "hospitalId"=$2 AND "patientId"=$3`, [dto.medicalRecordId, hospitalId, visit.patientId]))) throw new BadRequestException('Medical record must belong to the visit patient');
      const tests = await manager.query(`SELECT "id","name" FROM "lab_tests" WHERE "hospitalId"=$1 AND "isActive"=true AND "id" = ANY($2::uuid[])`, [hospitalId, dto.labTestIds]);
      if (tests.length !== new Set(dto.labTestIds).size) throw new BadRequestException('One or more lab tests are unavailable');
      const [order] = await manager.query(`INSERT INTO "lab_orders" ("hospitalId","visitId","patientId","medicalRecordId","orderedById","clinicalNote") VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [hospitalId, dto.visitId, visit.patientId, dto.medicalRecordId ?? null, actor.id, dto.clinicalNote ?? null]);
      const items = [];
      for (const test of tests) {
        const [item] = await manager.query(`INSERT INTO "lab_order_items" ("hospitalId","labOrderId","labTestId","testName") VALUES ($1,$2,$3,$4) RETURNING *`, [hospitalId, order.id, test.id, test.name]);
        items.push(item);
      }
      await manager.query(`UPDATE "visits" SET "status"='AWAITING_SERVICES', "updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2 AND "status" NOT IN ('COMPLETED','CANCELLED')`, [dto.visitId, hospitalId]);
      await this.writeAudit(manager, hospitalId, actor.id, 'LAB_ORDER_CREATED', 'lab_order', order.id, { itemCount: items.length, visitId: dto.visitId });
      return { ...order, items };
    });
  }

  async listLabOrders(actor: AuthenticatedUser, status?: string) {
    const hospitalId = this.hospital(actor);
    const params: unknown[] = [hospitalId];
    let filter = 'o."hospitalId"=$1';
    if (status) { params.push(status); filter += ` AND i."status"=$${params.length}`; }
    return this.dataSource.query(`SELECT o.*, p."hospitalNumber", p."firstName", p."lastName", inv."status" AS "invoiceStatus", inv."amount" AS "invoiceAmount", json_agg(json_build_object('id',i."id",'testName',i."testName",'status',i."status")) AS items FROM "lab_orders" o JOIN "patients" p ON p."id"=o."patientId" AND p."hospitalId"=o."hospitalId" LEFT JOIN "invoices" inv ON inv."id"=o."invoiceId" AND inv."hospitalId"=o."hospitalId" JOIN "lab_order_items" i ON i."labOrderId"=o."id" AND i."hospitalId"=o."hospitalId" WHERE ${filter} GROUP BY o."id",p."hospitalNumber",p."firstName",p."lastName",inv."status",inv."amount" ORDER BY o."orderedAt" DESC`, params);
  }

  async recordLabResults(itemId: string, dto: RecordLabResultsDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    if (!Array.isArray(dto.results) || dto.results.length === 0) throw new BadRequestException('At least one result is required');
    return this.dataSource.transaction(async (manager) => {
      const [item] = await manager.query(`SELECT i.*,o."patientId",p."gender",p."dateOfBirth" FROM "lab_order_items" i JOIN "lab_orders" o ON o."id"=i."labOrderId" AND o."hospitalId"=i."hospitalId" JOIN "patients" p ON p."id"=o."patientId" AND p."hospitalId"=o."hospitalId" WHERE i."id"=$1 AND i."hospitalId"=$2 FOR UPDATE OF i`, [itemId, hospitalId]);
      if (!item) throw new NotFoundException('Lab order item not found');
      if (item.status !== 'COLLECTED') throw new ConflictException('Collect the specimen before recording results');
      const parameters = await manager.query(`SELECT * FROM "lab_test_parameters" WHERE "labTestId"=$1 AND "hospitalId"=$2`, [item.labTestId, hospitalId]);
      for (const result of dto.results) {
        const parameter = parameters.find((p: { name: string }) => p.name.toLowerCase() === result.parameterName.toLowerCase());
        if (!parameter) throw new BadRequestException(`Unknown parameter: ${result.parameterName}`);
        const age = item.dateOfBirth ? this.ageAt(item.dateOfBirth) : null;
        const ranges = (item.gender == null || age == null)
          ? await manager.query(`SELECT * FROM "lab_parameter_ranges" WHERE "parameterId"=$1 AND "hospitalId"=$2 AND "sex" IS NULL AND "minAgeYears" IS NULL AND "maxAgeYears" IS NULL`, [parameter.id, hospitalId])
          : await manager.query(`SELECT * FROM "lab_parameter_ranges" WHERE "parameterId"=$1 AND "hospitalId"=$2 AND ("sex"=$3 OR "sex" IS NULL) AND ("minAgeYears" IS NULL OR "minAgeYears" <= $4) AND ("maxAgeYears" IS NULL OR "maxAgeYears" >= $4) ORDER BY ("sex" IS NOT NULL) DESC, (COALESCE("maxAgeYears",130)-COALESCE("minAgeYears",0)) ASC, ("minAgeYears" IS NOT NULL) DESC`, [parameter.id, hospitalId, item.gender, age]);
        const range = ranges[0];
        const valueNumber = Number(result.value);
        let flag: string | null = null;
        if (range && result.value.trim() !== '' && Number.isFinite(valueNumber)) {
          if (range.refLow !== null && valueNumber < Number(range.refLow)) flag = 'LOW';
          else if (range.refHigh !== null && valueNumber > Number(range.refHigh)) flag = 'HIGH';
          else flag = 'NORMAL';
        }
        await manager.query(`INSERT INTO "lab_results" ("hospitalId","orderItemId","parameterName","value","unit","refLow","refHigh","flag") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [hospitalId, itemId, parameter.name, result.value, parameter.unit ?? null, range?.refLow ?? null, range?.refHigh ?? null, flag]);
      }
      await manager.query(`UPDATE "lab_order_items" SET "status"='RESULTED', "resultedAt"=now(), "resultedById"=$3, "updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2`, [itemId, hospitalId, actor.id]);
      await this.writeAudit(manager, hospitalId, actor.id, 'LAB_RESULTS_RECORDED', 'lab_order_item', itemId, { resultCount: dto.results.length });
      return manager.query(`SELECT * FROM "lab_results" WHERE "orderItemId"=$1 AND "hospitalId"=$2 ORDER BY "createdAt"`, [itemId, hospitalId]);
    });
  }

  async createDrug(dto: CreateDrugDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      const [drug] = await manager.query(`INSERT INTO "drugs" ("hospitalId","genericName","brandName","form","strength","dispensingUnit","reorderLevel","unitPrice") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [hospitalId, dto.genericName.trim(), dto.brandName?.trim() || null, dto.form, dto.strength?.trim() || null, dto.dispensingUnit.trim(), dto.reorderLevel ?? 0, dto.unitPrice === undefined ? null : dto.unitPrice.toFixed(2)]);
      await this.writeAudit(manager, hospitalId, actor.id, 'DRUG_CREATED', 'drug', drug.id, { genericName: drug.genericName });
      return drug;
    });
  }

  async listDrugs(actor: AuthenticatedUser, q?: string) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.query(`SELECT d.*, COALESCE(SUM(b."quantityOnHand") FILTER (WHERE b."expiryDate" >= (now() AT TIME ZONE 'Africa/Lagos')::date),0)::int AS "availableStock" FROM "drugs" d LEFT JOIN "drug_batches" b ON b."drugId"=d."id" AND b."hospitalId"=d."hospitalId" WHERE d."hospitalId"=$1 AND d."isActive"=true AND ($2::text IS NULL OR d."genericName" ILIKE '%' || $2 || '%' OR d."brandName" ILIKE '%' || $2 || '%') GROUP BY d."id" ORDER BY d."genericName"`, [hospitalId, q?.trim() || null]);
  }

  async receiveBatch(drugId: string, dto: ReceiveDrugBatchDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      if (!(await this.one(manager, `SELECT "id" FROM "drugs" WHERE "id"=$1 AND "hospitalId"=$2 AND "isActive"=true`, [drugId, hospitalId]))) throw new NotFoundException('Drug not found');
      const [batch] = await manager.query(`INSERT INTO "drug_batches" ("hospitalId","drugId","batchNumber","expiryDate","quantityReceived","quantityOnHand","supplier","receivedById") VALUES ($1,$2,$3,$4,$5,$5,$6,$7) RETURNING *`, [hospitalId, drugId, dto.batchNumber.trim(), dto.expiryDate, dto.quantityReceived, dto.supplier?.trim() || null, actor.id]);
      await this.writeAudit(manager, hospitalId, actor.id, 'DRUG_BATCH_RECEIVED', 'drug_batch', batch.id, { quantityReceived: dto.quantityReceived });
      return batch;
    });
  }

  async dispensePrescription(prescriptionId: string, dto: DispensePrescriptionDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      const [prescription] = await manager.query(`SELECT * FROM "prescriptions" WHERE "id"=$1 AND "hospitalId"=$2 FOR UPDATE`, [prescriptionId, hospitalId]);
      if (!prescription) throw new NotFoundException('Prescription not found');
      if (!prescription.drugId || !prescription.quantityPrescribed) throw new BadRequestException('Prescription needs a catalog drug and prescribed quantity before dispensing');
      if (prescription.status === 'CANCELLED' || prescription.status === 'DISPENSED') throw new ConflictException('Prescription is not dispensable');
      if (prescription.status === 'PENDING') throw new ConflictException('Generate the invoice for this prescription first, then have the patient pay at the cashier');
      if (prescription.status === 'AWAITING_PAYMENT') throw new ConflictException('Payment has not been received. Send the patient to the cashier to pay the invoice');
      if (prescription.invoiceId) {
        const [invoice] = await manager.query(`SELECT "status" FROM "invoices" WHERE "id"=$1 AND "hospitalId"=$2`, [prescription.invoiceId, hospitalId]);
        if (invoice?.status !== 'PAID') throw new ConflictException('The invoice for this prescription is not fully paid');
      }
      const already = await manager.query(`SELECT COALESCE(SUM("quantity"),0)::int AS total FROM "dispensings" WHERE "prescriptionId"=$1 AND "hospitalId"=$2`, [prescriptionId, hospitalId]);
      const remaining = Number(prescription.quantityPrescribed) - Number(already[0].total);
      if (dto.quantity > remaining) throw new BadRequestException(`Only ${remaining} units remain to be dispensed`);
      await this.dispenseFromBatches(manager, hospitalId, prescription.drugId, dto.quantity, prescriptionId, null, actor.id);
      const total = Number(already[0].total) + dto.quantity;
      const status = total >= Number(prescription.quantityPrescribed) ? 'DISPENSED' : 'PARTIAL';
      await manager.query(`UPDATE "prescriptions" SET "status"=$3 WHERE "id"=$1 AND "hospitalId"=$2`, [prescriptionId, hospitalId, status]);
      await this.writeAudit(manager, hospitalId, actor.id, 'PRESCRIPTION_DISPENSED', 'prescription', prescriptionId, { quantity: dto.quantity, status });
      return { prescriptionId, quantityDispensedNow: dto.quantity, totalDispensed: total, quantityRemaining: Number(prescription.quantityPrescribed) - total, status };
    });
  }

  async dispenseWalkIn(dto: WalkInDispenseDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      if (!(await this.one(manager, `SELECT "id" FROM "drugs" WHERE "id"=$1 AND "hospitalId"=$2 AND "isActive"=true`, [dto.drugId, hospitalId]))) throw new NotFoundException('Drug not found');
      const items = await this.dispenseFromBatches(manager, hospitalId, dto.drugId, dto.quantity, null, dto.customerName?.trim() || null, actor.id);
      await this.writeAudit(manager, hospitalId, actor.id, 'WALK_IN_DISPENSED', 'drug', dto.drugId, { quantity: dto.quantity, batchCount: items.length });
      return { drugId: dto.drugId, quantity: dto.quantity, batches: items };
    });
  }

  async adjustStock(batchId: string, dto: StockAdjustmentDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    if (!dto.quantityDelta || !['WRITE_OFF','RETURN','CORRECTION','DAMAGE','EXPIRED','RECALL'].includes(dto.reason)) throw new BadRequestException('A non-zero adjustment and valid reason are required');
    return this.dataSource.transaction(async (manager) => {
      const [batch] = await manager.query(`SELECT * FROM "drug_batches" WHERE "id"=$1 AND "hospitalId"=$2 FOR UPDATE`, [batchId, hospitalId]);
      if (!batch) throw new NotFoundException('Drug batch not found');
      const newQuantity = Number(batch.quantityOnHand) + dto.quantityDelta;
      if (newQuantity < 0) throw new BadRequestException('Stock adjustment would make inventory negative');
      await manager.query(`UPDATE "drug_batches" SET "quantityOnHand"=$3, "updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2`, [batchId, hospitalId, newQuantity]);
      const [adjustment] = await manager.query(`INSERT INTO "stock_adjustments" ("hospitalId","drugBatchId","quantityDelta","reason","notes","adjustedById") VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [hospitalId, batchId, dto.quantityDelta, dto.reason, dto.notes ?? null, actor.id]);
      await this.writeAudit(manager, hospitalId, actor.id, 'STOCK_ADJUSTED', 'drug_batch', batchId, { quantityDelta: dto.quantityDelta, reason: dto.reason });
      return { adjustment, quantityOnHand: newQuantity };
    });
  }

  private async dispenseFromBatches(manager: EntityManager, hospitalId: string, drugId: string, quantity: number, prescriptionId: string | null, customerName: string | null, actorId: string) {
    const batches = await manager.query(`SELECT * FROM "drug_batches" WHERE "hospitalId"=$1 AND "drugId"=$2 AND "quantityOnHand">0 AND "expiryDate">=(now() AT TIME ZONE 'Africa/Lagos')::date ORDER BY "expiryDate" ASC, "receivedAt" ASC FOR UPDATE`, [hospitalId, drugId]);
    const available = batches.reduce((sum: number, batch: { quantityOnHand: number }) => sum + Number(batch.quantityOnHand), 0);
    if (available < quantity) throw new BadRequestException(`Insufficient unexpired stock. Available: ${available}`);
    let remaining = quantity;
    const result = [];
    for (const batch of batches) {
      if (remaining <= 0) break;
      const drawn = Math.min(remaining, Number(batch.quantityOnHand));
      await manager.query(`UPDATE "drug_batches" SET "quantityOnHand"="quantityOnHand"-$3, "updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2`, [batch.id, hospitalId, drawn]);
      const [dispensing] = await manager.query(`INSERT INTO "dispensings" ("hospitalId","prescriptionId","drugBatchId","quantity","customerName","dispensedById") VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [hospitalId, prescriptionId, batch.id, drawn, customerName, actorId]);
      result.push(dispensing);
      remaining -= drawn;
    }
    return result;
  }

  async getPatientPrintCard(patientId: string, actor: AuthenticatedUser) {
    const hospitalId=this.hospital(actor);
    const rows=await this.dataSource.query(`SELECT p."id",p."hospitalNumber",p."firstName",p."middleName",p."lastName",p."dateOfBirth",p."gender",p."phone",h."name" AS "hospitalName",h."phone" AS "hospitalPhone",h."address" AS "hospitalAddress" FROM "patients" p JOIN "hospitals" h ON h."id"=p."hospitalId" WHERE p."id"=$1 AND p."hospitalId"=$2 AND p."deletedAt" IS NULL`,[patientId,hospitalId]);
    if(!rows.length)throw new NotFoundException('Patient not found');
    return rows[0];
  }

  async getReceiptPrintData(paymentId: string, actor: AuthenticatedUser) {
    const hospitalId=this.hospital(actor);
    const rows=await this.dataSource.query(`SELECT p."id" AS "paymentId",p."amount" AS "paymentAmount",p."method",p."reference",p."createdAt" AS "paidAt",i."id" AS "invoiceId",i."description",i."amount" AS "invoiceAmount",i."amountPaid",i."status" AS "invoiceStatus",pt."id" AS "patientId",pt."hospitalNumber",pt."firstName",pt."middleName",pt."lastName",pt."phone",h."name" AS "hospitalName",h."phone" AS "hospitalPhone",h."address" AS "hospitalAddress" FROM "payments" p JOIN "invoices" i ON i."id"=p."invoiceId" AND i."hospitalId"=p."hospitalId" JOIN "patients" pt ON pt."id"=i."patientId" AND pt."hospitalId"=i."hospitalId" JOIN "hospitals" h ON h."id"=p."hospitalId" WHERE p."id"=$1 AND p."hospitalId"=$2 AND ($3::boolean=false OR pt."userId"=$4)`,[paymentId,hospitalId,actor.role==='PATIENT',actor.id]);
    if(!rows.length)throw new NotFoundException('Payment not found');
    return rows[0];
  }

  async getLabReportPrintData(itemId: string, actor: AuthenticatedUser) {
    const hospitalId=this.hospital(actor);
    const rows=await this.dataSource.query(`SELECT i."id" AS "orderItemId",i."testName",i."status",i."collectedAt",i."resultedAt",o."orderedAt",o."clinicalNote",pt."hospitalNumber",pt."firstName",pt."middleName",pt."lastName",pt."dateOfBirth",pt."gender",h."name" AS "hospitalName",h."phone" AS "hospitalPhone",h."address" AS "hospitalAddress",COALESCE(json_agg(json_build_object('parameterName',r."parameterName",'value',r."value",'unit',r."unit",'refLow',r."refLow",'refHigh',r."refHigh",'flag',r."flag")) FILTER (WHERE r."id" IS NOT NULL),'[]'::json) AS results FROM "lab_order_items" i JOIN "lab_orders" o ON o."id"=i."labOrderId" AND o."hospitalId"=i."hospitalId" JOIN "patients" pt ON pt."id"=o."patientId" AND pt."hospitalId"=o."hospitalId" JOIN "hospitals" h ON h."id"=i."hospitalId" LEFT JOIN "lab_results" r ON r."orderItemId"=i."id" AND r."hospitalId"=i."hospitalId" WHERE i."id"=$1 AND i."hospitalId"=$2 GROUP BY i."id",o."orderedAt",o."clinicalNote",pt."hospitalNumber",pt."firstName",pt."middleName",pt."lastName",pt."dateOfBirth",pt."gender",h."name",h."phone",h."address"`,[itemId,hospitalId]);
    if(!rows.length)throw new NotFoundException('Lab report not found');
    return rows[0];
  }

  async listLabTests(actor: AuthenticatedUser, q?: string) {
    return this.dataSource.query(`SELECT t.*, COALESCE(json_agg(json_build_object('id',p."id",'name',p."name",'unit',p."unit",'sortOrder',p."sortOrder")) FILTER (WHERE p."id" IS NOT NULL),'[]'::json) AS parameters FROM "lab_tests" t LEFT JOIN "lab_test_parameters" p ON p."labTestId"=t."id" AND p."hospitalId"=t."hospitalId" WHERE t."hospitalId"=$1 AND t."isActive"=true AND ($2::text IS NULL OR t."name" ILIKE '%'||$2||'%' OR t."code" ILIKE '%'||$2||'%') GROUP BY t."id" ORDER BY t."category",t."name"`, [this.hospital(actor),q?.trim()||null]);
  }

  async createLabTest(dto: CreateLabTestDto, actor: AuthenticatedUser) {
    const hospitalId=this.hospital(actor);
    return this.dataSource.transaction(async(manager)=>{
      const [test]=await manager.query(`INSERT INTO "lab_tests" ("hospitalId","code","name","category","specimen","price") VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,[hospitalId,dto.code.trim().toUpperCase(),dto.name.trim(),dto.category.trim(),dto.specimen??null,dto.price===undefined?null:dto.price.toFixed(2)]);
      await this.writeAudit(manager,hospitalId,actor.id,'LAB_TEST_CREATED','lab_test',test.id);
      return test;
    });
  }

  async createLabParameter(testId: string, dto: CreateLabParameterDto, actor: AuthenticatedUser) {
    const hospitalId=this.hospital(actor);
    return this.dataSource.transaction(async(manager)=>{
      if(!(await this.one(manager,`SELECT "id" FROM "lab_tests" WHERE "id"=$1 AND "hospitalId"=$2 AND "isActive"=true`,[testId,hospitalId])))throw new NotFoundException('Lab test not found');
      const [parameter]=await manager.query(`INSERT INTO "lab_test_parameters" ("hospitalId","labTestId","name","unit","sortOrder") VALUES ($1,$2,$3,$4,$5) RETURNING *`,[hospitalId,testId,dto.name.trim(),dto.unit??null,dto.sortOrder??0]);
      await this.writeAudit(manager,hospitalId,actor.id,'LAB_PARAMETER_CREATED','lab_parameter',parameter.id,{testId});
      return parameter;
    });
  }

  async createLabRange(parameterId: string, dto: CreateLabRangeDto, actor: AuthenticatedUser) {
    const hospitalId=this.hospital(actor);
    if(dto.minAgeYears!==undefined && dto.maxAgeYears!==undefined && dto.minAgeYears>dto.maxAgeYears)throw new BadRequestException('minAgeYears cannot exceed maxAgeYears');
    if(dto.refLow!==undefined && dto.refHigh!==undefined && dto.refLow>dto.refHigh)throw new BadRequestException('refLow cannot exceed refHigh');
    return this.dataSource.transaction(async(manager)=>{
      if(!(await this.one(manager,`SELECT "id" FROM "lab_test_parameters" WHERE "id"=$1 AND "hospitalId"=$2`,[parameterId,hospitalId])))throw new NotFoundException('Lab parameter not found');
      const [range]=await manager.query(`INSERT INTO "lab_parameter_ranges" ("hospitalId","parameterId","sex","minAgeYears","maxAgeYears","refLow","refHigh") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[hospitalId,parameterId,dto.sex??null,dto.minAgeYears??null,dto.maxAgeYears??null,dto.refLow??null,dto.refHigh??null]);
      await this.writeAudit(manager,hospitalId,actor.id,'LAB_REFERENCE_RANGE_CREATED','lab_parameter_range',range.id,{parameterId});
      return range;
    });
  }

  async collectLabItem(itemId: string, actor: AuthenticatedUser) {
    const hospitalId=this.hospital(actor);
    return this.dataSource.transaction(async(manager)=>{
      const [item]=await manager.query(`SELECT * FROM "lab_order_items" WHERE "id"=$1 AND "hospitalId"=$2 FOR UPDATE`,[itemId,hospitalId]);
      if(!item)throw new NotFoundException('Lab order item not found');
      if(item.status!=='ORDERED')throw new ConflictException('Only ordered tests can be marked collected');
      const [billing]=await manager.query(`SELECT o."invoiceId", inv."status" AS "invoiceStatus" FROM "lab_orders" o LEFT JOIN "invoices" inv ON inv."id"=o."invoiceId" AND inv."hospitalId"=o."hospitalId" WHERE o."id"=$1 AND o."hospitalId"=$2`,[item.labOrderId,hospitalId]);
      if(!billing?.invoiceId)throw new ConflictException('Generate the invoice for this lab order first, then have the patient pay at the cashier');
      if(billing.invoiceStatus!=='PAID')throw new ConflictException('Payment has not been received. Send the patient to the cashier to pay the invoice');
      const [updated]=await manager.query(`UPDATE "lab_order_items" SET "status"='COLLECTED',"collectedAt"=now(),"collectedById"=$3,"updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2 RETURNING *`,[itemId,hospitalId,actor.id]);
      await this.writeAudit(manager,hospitalId,actor.id,'LAB_SPECIMEN_COLLECTED','lab_order_item',itemId);
      return updated;
    });
  }

  async searchIcd10(q?: string) {
    return this.dataSource.query(`SELECT "code","description" FROM "icd10_codes" WHERE ($1::text IS NULL OR "code" ILIKE '%'||$1||'%' OR "description" ILIKE '%'||$1||'%') ORDER BY "code" LIMIT 50`,[q?.trim()||null]);
  }

  async addConsultationDiagnosis(recordId: string, dto: CreateDiagnosisDto, actor: AuthenticatedUser) {
    const hospitalId=this.hospital(actor);
    return this.dataSource.transaction(async(manager)=>{
      if(!(await this.one(manager,`SELECT "id" FROM "medical_records" WHERE "id"=$1 AND "hospitalId"=$2`,[recordId,hospitalId])))throw new NotFoundException('Consultation not found');
      let description=dto.description.trim();
      if(dto.icd10Code){const [code]=await manager.query(`SELECT "description" FROM "icd10_codes" WHERE "code"=$1`,[dto.icd10Code.trim().toUpperCase()]);if(!code)throw new BadRequestException('Unknown ICD-10 code');description=code.description;}
      const [diagnosis]=await manager.query(`INSERT INTO "consultation_diagnoses" ("hospitalId","medicalRecordId","icd10Code","description","type") VALUES ($1,$2,$3,$4,$5) RETURNING *`,[hospitalId,recordId,dto.icd10Code?.trim().toUpperCase()??null,description,dto.type]);
      await this.writeAudit(manager,hospitalId,actor.id,'CONSULTATION_DIAGNOSIS_ADDED','consultation_diagnosis',diagnosis.id,{recordId,type:dto.type});
      return diagnosis;
    });
  }

  async listConsultationDiagnoses(recordId: string, actor: AuthenticatedUser) {
    const hospitalId=this.hospital(actor);
    if(!(await this.dataSource.query(`SELECT "id" FROM "medical_records" WHERE "id"=$1 AND "hospitalId"=$2`,[recordId,hospitalId])).length)throw new NotFoundException('Consultation not found');
    return this.dataSource.query(`SELECT * FROM "consultation_diagnoses" WHERE "medicalRecordId"=$1 AND "hospitalId"=$2 ORDER BY CASE WHEN "type"='PRIMARY' THEN 0 ELSE 1 END,"createdAt"`,[recordId,hospitalId]);
  }

  async listPayers(actor: AuthenticatedUser) {
    return this.dataSource.query(`SELECT * FROM "payers" WHERE "hospitalId"=$1 ORDER BY "name"`, [this.hospital(actor)]);
  }

  async createPayer(dto: CreatePayerDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      const [payer] = await manager.query(`INSERT INTO "payers" ("hospitalId","name","type") VALUES ($1,$2,$3) RETURNING *`, [hospitalId,dto.name.trim(),dto.type]);
      await this.writeAudit(manager,hospitalId,actor.id,'PAYER_CREATED','payer',payer.id);
      return payer;
    });
  }

  async listPatientCoverages(patientId: string, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    if (!(await this.dataSource.query(`SELECT "id" FROM "patients" WHERE "id"=$1 AND "hospitalId"=$2 AND "deletedAt" IS NULL`, [patientId,hospitalId])).length) throw new NotFoundException('Patient not found');
    return this.dataSource.query(`SELECT c.*,p."name" AS "payerName",p."type" AS "payerType" FROM "patient_coverages" c JOIN "payers" p ON p."id"=c."payerId" AND p."hospitalId"=c."hospitalId" WHERE c."hospitalId"=$1 AND c."patientId"=$2 ORDER BY c."createdAt" DESC`, [hospitalId,patientId]);
  }

  async createPatientCoverage(patientId: string, dto: CreateCoverageDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      if (!(await this.one(manager, `SELECT "id" FROM "patients" WHERE "id"=$1 AND "hospitalId"=$2 AND "deletedAt" IS NULL`, [patientId,hospitalId]))) throw new NotFoundException('Patient not found');
      if (!(await this.one(manager, `SELECT "id" FROM "payers" WHERE "id"=$1 AND "hospitalId"=$2 AND "isActive"=true`, [dto.payerId,hospitalId]))) throw new NotFoundException('Payer not found');
      const [coverage] = await manager.query(`INSERT INTO "patient_coverages" ("hospitalId","patientId","payerId","enrolleeNumber","planName","principalName","expiresAt") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [hospitalId,patientId,dto.payerId,dto.enrolleeNumber.trim(),dto.planName ?? null,dto.principalName ?? null,dto.expiresAt ?? null]);
      await this.writeAudit(manager,hospitalId,actor.id,'PATIENT_COVERAGE_CREATED','patient_coverage',coverage.id,{patientId,payerId:dto.payerId});
      return coverage;
    });
  }

  async listPatientAllergies(patientId: string, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    const [patient] = await this.dataSource.query(`SELECT "id","allergiesReviewedAt" FROM "patients" WHERE "id"=$1 AND "hospitalId"=$2 AND "deletedAt" IS NULL`, [patientId,hospitalId]);
    if (!patient) throw new NotFoundException('Patient not found');
    const allergies = await this.dataSource.query(`SELECT * FROM "patient_allergies" WHERE "patientId"=$1 AND "hospitalId"=$2 ORDER BY "isActive" DESC,"createdAt" DESC`, [patientId,hospitalId]);
    return { patientId, allergiesReviewedAt: patient.allergiesReviewedAt, status: patient.allergiesReviewedAt ? (allergies.some((a: {isActive:boolean})=>a.isActive) ? 'ALLERGIES_RECORDED' : 'NONE_KNOWN') : 'NOT_REVIEWED', allergies };
  }

  async createPatientAllergy(patientId: string, dto: CreateAllergyDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      if (!(await this.one(manager, `SELECT "id" FROM "patients" WHERE "id"=$1 AND "hospitalId"=$2 AND "deletedAt" IS NULL`, [patientId,hospitalId]))) throw new NotFoundException('Patient not found');
      const [allergy] = await manager.query(`INSERT INTO "patient_allergies" ("hospitalId","patientId","allergen","reaction","severity","recordedById") VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [hospitalId,patientId,dto.allergen.trim(),dto.reaction ?? null,dto.severity ?? null,actor.id]);
      await manager.query(`UPDATE "patients" SET "allergiesReviewedAt"=now(),"updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2`, [patientId,hospitalId]);
      await this.writeAudit(manager,hospitalId,actor.id,'PATIENT_ALLERGY_RECORDED','patient_allergy',allergy.id,{patientId});
      return allergy;
    });
  }

  async markAllergiesReviewed(patientId: string, _dto: ReviewAllergiesDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    const rows = await this.dataSource.query(`UPDATE "patients" SET "allergiesReviewedAt"=now(),"updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2 AND "deletedAt" IS NULL RETURNING "id","allergiesReviewedAt"`, [patientId,hospitalId]);
    if (!rows.length) throw new NotFoundException('Patient not found');
    await this.dataSource.query(`INSERT INTO "audit_logs" ("hospitalId","actorId","action","targetType","targetId","metadata") VALUES ($1,$2,$3,$4,$5,$6::jsonb)`, [hospitalId,actor.id,'PATIENT_ALLERGIES_REVIEWED','patient',patientId,JSON.stringify({reviewedAt:rows[0].allergiesReviewedAt})]);
    return this.listPatientAllergies(patientId,actor);
  }

  async createVisitAuthorization(visitId: string, dto: CreateAuthorizationDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      if (!(await this.one(manager, `SELECT "id" FROM "visits" WHERE "id"=$1 AND "hospitalId"=$2`, [visitId,hospitalId]))) throw new NotFoundException('Visit not found');
      if (!(await this.one(manager, `SELECT "id" FROM "payers" WHERE "id"=$1 AND "hospitalId"=$2 AND "isActive"=true`, [dto.payerId,hospitalId]))) throw new NotFoundException('Payer not found');
      const [visit] = await manager.query(`SELECT "patientId" FROM "visits" WHERE "id"=$1 AND "hospitalId"=$2`, [visitId,hospitalId]);
      if (!(await this.one(manager, `SELECT "id" FROM "patient_coverages" WHERE "patientId"=$1 AND "payerId"=$2 AND "hospitalId"=$3 AND "isActive"=true AND ("expiresAt" IS NULL OR "expiresAt">=(now() AT TIME ZONE 'Africa/Lagos')::date)`, [visit.patientId,dto.payerId,hospitalId]))) throw new BadRequestException('Patient has no active coverage with this payer');
      const [authorization] = await manager.query(`INSERT INTO "visit_authorizations" ("hospitalId","visitId","payerId","scope","code","note","requestedById") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [hospitalId,visitId,dto.payerId,dto.scope.trim(),dto.code ?? null,dto.note ?? null,actor.id]);
      await this.writeAudit(manager,hospitalId,actor.id,'VISIT_AUTHORIZATION_REQUESTED','visit_authorization',authorization.id,{visitId,scope:dto.scope});
      return authorization;
    });
  }

  async updateVisitAuthorization(authorizationId: string, status: string, code: string | undefined, note: string | undefined, actor: AuthenticatedUser) {
    if (!['APPROVED','DENIED','EXPIRED'].includes(status)) throw new BadRequestException('Invalid authorization response status');
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      const [existing] = await manager.query(`SELECT * FROM "visit_authorizations" WHERE "id"=$1 AND "hospitalId"=$2 FOR UPDATE`, [authorizationId,hospitalId]);
      if (!existing) throw new NotFoundException('Visit authorization not found');
      if (existing.status !== 'REQUESTED') throw new ConflictException('Only requested authorizations can be answered');
      const [row] = await manager.query(`UPDATE "visit_authorizations" SET "status"=$3,"code"=COALESCE($4,"code"),"note"=COALESCE($5,"note"),"respondedAt"=now(),"updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2 RETURNING *`, [authorizationId,hospitalId,status,code ?? null,note ?? null]);
      await this.writeAudit(manager,hospitalId,actor.id,'VISIT_AUTHORIZATION_RESPONDED','visit_authorization',authorizationId,{status});
      return row;
    });
  }

  async listWards(actor: AuthenticatedUser) {
    return this.dataSource.query(`SELECT w.*, COUNT(b."id")::int AS "bedCount", COUNT(b."id") FILTER (WHERE b."status"='AVAILABLE')::int AS "availableBeds" FROM "wards" w LEFT JOIN "beds" b ON b."wardId"=w."id" AND b."hospitalId"=w."hospitalId" WHERE w."hospitalId"=$1 GROUP BY w."id" ORDER BY w."name"`, [this.hospital(actor)]);
  }

  async listBeds(actor: AuthenticatedUser) {
    return this.dataSource.query(`SELECT b.*,w."name" AS "wardName" FROM "beds" b JOIN "wards" w ON w."id"=b."wardId" AND w."hospitalId"=b."hospitalId" WHERE b."hospitalId"=$1 ORDER BY w."name",b."bedNumber"`, [this.hospital(actor)]);
  }

  async createWard(dto: CreateWardDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      const [ward] = await manager.query(`INSERT INTO "wards" ("hospitalId","name","wardType") VALUES ($1,$2,$3) RETURNING *`, [hospitalId, dto.name.trim(), dto.wardType?.trim() || 'GENERAL']);
      await this.writeAudit(manager, hospitalId, actor.id, 'WARD_CREATED', 'ward', ward.id);
      return ward;
    });
  }

  async createBed(wardId: string, dto: CreateBedDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      if (!(await this.one(manager, `SELECT "id" FROM "wards" WHERE "id"=$1 AND "hospitalId"=$2 AND "isActive"=true`, [wardId, hospitalId]))) throw new NotFoundException('Ward not found');
      const [bed] = await manager.query(`INSERT INTO "beds" ("hospitalId","wardId","bedNumber") VALUES ($1,$2,$3) RETURNING *`, [hospitalId, wardId, dto.bedNumber.trim()]);
      await this.writeAudit(manager, hospitalId, actor.id, 'BED_CREATED', 'bed', bed.id, { wardId });
      return bed;
    });
  }

  async listAdmissions(actor: AuthenticatedUser, status?: string) {
    const params: unknown[] = [this.hospital(actor)]; let filter = 'a."hospitalId"=$1';
    if (status) { params.push(status); filter += ` AND a."status"=$${params.length}`; }
    return this.dataSource.query(`SELECT a.*, p."hospitalNumber", p."firstName", p."lastName", b."bedNumber", w."name" AS "wardName" FROM "admissions" a JOIN "patients" p ON p."id"=a."patientId" AND p."hospitalId"=a."hospitalId" JOIN "beds" b ON b."id"=a."bedId" AND b."hospitalId"=a."hospitalId" JOIN "wards" w ON w."id"=b."wardId" AND w."hospitalId"=a."hospitalId" WHERE ${filter} ORDER BY a."admittedAt" DESC`, params);
  }

  async admitPatient(dto: AdmitPatientDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      const [visit] = await manager.query(`SELECT * FROM "visits" WHERE "id"=$1 AND "hospitalId"=$2 FOR SHARE`, [dto.visitId, hospitalId]);
      if (!visit) throw new NotFoundException('Visit not found');
      const [bed] = await manager.query(`SELECT * FROM "beds" WHERE "id"=$1 AND "hospitalId"=$2 FOR UPDATE`, [dto.bedId, hospitalId]);
      if (!bed || bed.status !== 'AVAILABLE') throw new ConflictException('Bed is not available');
      const [admission] = await manager.query(`INSERT INTO "admissions" ("hospitalId","visitId","patientId","bedId","admittedById","diagnosis") VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [hospitalId, dto.visitId, visit.patientId, dto.bedId, actor.id, dto.diagnosis ?? null]);
      await manager.query(`UPDATE "beds" SET "status"='OCCUPIED',"updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2`, [dto.bedId, hospitalId]);
      await this.writeAudit(manager, hospitalId, actor.id, 'PATIENT_ADMITTED', 'admission', admission.id, { visitId: dto.visitId, bedId: dto.bedId });
      return admission;
    });
  }

  async dischargePatient(admissionId: string, dto: DischargePatientDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      const [admission] = await manager.query(`SELECT * FROM "admissions" WHERE "id"=$1 AND "hospitalId"=$2 FOR UPDATE`, [admissionId, hospitalId]);
      if (!admission) throw new NotFoundException('Admission not found');
      if (admission.status !== 'ADMITTED') throw new ConflictException('Admission is not active');
      const [updated] = await manager.query(`UPDATE "admissions" SET "status"='DISCHARGED',"dischargedAt"=now(),"dischargedById"=$3,"dischargeSummary"=$4,"updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2 RETURNING *`, [admissionId, hospitalId, actor.id, dto.dischargeSummary ?? null]);
      await manager.query(`UPDATE "beds" SET "status"='AVAILABLE',"updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2`, [admission.bedId, hospitalId]);
      await this.writeAudit(manager, hospitalId, actor.id, 'PATIENT_DISCHARGED', 'admission', admissionId);
      return updated;
    });
  }

  async addNursingObservation(admissionId: string, dto: NursingObservationDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      if (!(await this.one(manager, `SELECT "id" FROM "admissions" WHERE "id"=$1 AND "hospitalId"=$2 AND "status"='ADMITTED'`, [admissionId, hospitalId]))) throw new NotFoundException('Active admission not found');
      const [row] = await manager.query(`INSERT INTO "nursing_observations" ("hospitalId","admissionId","recordedById","temperatureC","pulseBpm","respiratoryRate","systolicBp","diastolicBp","spo2","painScore","notes") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [hospitalId, admissionId, actor.id, dto.temperatureC ?? null, dto.pulseBpm ?? null, dto.respiratoryRate ?? null, dto.systolicBp ?? null, dto.diastolicBp ?? null, dto.spo2 ?? null, dto.painScore ?? null, dto.notes ?? null]);
      await this.writeAudit(manager, hospitalId, actor.id, 'NURSING_OBSERVATION_RECORDED', 'nursing_observation', row.id, { admissionId });
      return row;
    });
  }

  async listAntenatal(actor: AuthenticatedUser) {
    return this.dataSource.query(`SELECT a.*,p."hospitalNumber",p."firstName",p."lastName" FROM "antenatal_records" a JOIN "patients" p ON p."id"=a."patientId" AND p."hospitalId"=a."hospitalId" WHERE a."hospitalId"=$1 ORDER BY a."createdAt" DESC`, [this.hospital(actor)]);
  }

  async createAntenatal(dto: CreateAntenatalDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      if (!(await this.one(manager, `SELECT "id" FROM "patients" WHERE "id"=$1 AND "hospitalId"=$2 AND "deletedAt" IS NULL`, [dto.patientId, hospitalId]))) throw new NotFoundException('Patient not found');
      const [record] = await manager.query(`INSERT INTO "antenatal_records" ("hospitalId","patientId","enrolledById","lmpDate","eddDate","gravida","para","bloodGroup","riskNotes") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [hospitalId,dto.patientId,actor.id,dto.lmpDate ?? null,dto.eddDate ?? null,dto.gravida ?? null,dto.para ?? null,dto.bloodGroup ?? null,dto.riskNotes ?? null]);
      await this.writeAudit(manager, hospitalId, actor.id, 'ANTENATAL_RECORD_CREATED', 'antenatal_record', record.id, { patientId: dto.patientId });
      return record;
    });
  }

  async addAntenatalVisit(recordId: string, dto: AntenatalVisitDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      if (!(await this.one(manager, `SELECT "id" FROM "antenatal_records" WHERE "id"=$1 AND "hospitalId"=$2 AND "status"='ACTIVE'`, [recordId, hospitalId]))) throw new NotFoundException('Active antenatal record not found');
      const [row] = await manager.query(`INSERT INTO "antenatal_visits" ("hospitalId","antenatalRecordId","visitDate","gestationalWeeks","weightKg","bloodPressure","foetalHeartRate","notes","recordedById") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [hospitalId,recordId,dto.visitDate,dto.gestationalWeeks ?? null,dto.weightKg ?? null,dto.bloodPressure ?? null,dto.foetalHeartRate ?? null,dto.notes ?? null,actor.id]);
      await this.writeAudit(manager, hospitalId, actor.id, 'ANTENATAL_VISIT_RECORDED', 'antenatal_visit', row.id, { antenatalRecordId: recordId });
      return row;
    });
  }

  async createImmunization(dto: ImmunizationDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      if (!(await this.one(manager, `SELECT "id" FROM "patients" WHERE "id"=$1 AND "hospitalId"=$2 AND "deletedAt" IS NULL`, [dto.patientId,hospitalId]))) throw new NotFoundException('Patient not found');
      const [row] = await manager.query(`INSERT INTO "immunization_records" ("hospitalId","patientId","vaccineName","dose","administeredAt","batchNumber","administeredById","notes") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [hospitalId,dto.patientId,dto.vaccineName,dto.dose ?? null,dto.administeredAt,dto.batchNumber ?? null,actor.id,dto.notes ?? null]);
      await this.writeAudit(manager, hospitalId, actor.id, 'IMMUNIZATION_RECORDED', 'immunization_record', row.id, { patientId: dto.patientId });
      return row;
    });
  }

  async createFamilyPlanning(dto: FamilyPlanningDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      if (!(await this.one(manager, `SELECT "id" FROM "patients" WHERE "id"=$1 AND "hospitalId"=$2 AND "deletedAt" IS NULL`, [dto.patientId,hospitalId]))) throw new NotFoundException('Patient not found');
      const [row] = await manager.query(`INSERT INTO "family_planning_records" ("hospitalId","patientId","method","startedAt","reviewAt","counselledById","notes") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [hospitalId,dto.patientId,dto.method,dto.startedAt,dto.reviewAt ?? null,actor.id,dto.notes ?? null]);
      await this.writeAudit(manager, hospitalId, actor.id, 'FAMILY_PLANNING_RECORDED', 'family_planning_record', row.id, { patientId: dto.patientId });
      return row;
    });
  }

  async listServices(actor: AuthenticatedUser) {
    return this.dataSource.query(`SELECT s.*, json_agg(json_build_object('id',p."id",'payerId',p."payerId",'amount',p."amount",'currency',p."currency",'effectiveFrom',p."effectiveFrom",'effectiveTo',p."effectiveTo")) FILTER (WHERE p."id" IS NOT NULL) AS prices FROM "service_catalog" s LEFT JOIN "service_prices" p ON p."serviceId"=s."id" AND p."hospitalId"=s."hospitalId" WHERE s."hospitalId"=$1 AND s."isActive"=true GROUP BY s."id" ORDER BY s."category",s."name"`, [this.hospital(actor)]);
  }

  async createService(dto: CreateServiceDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      const [row] = await manager.query(`INSERT INTO "service_catalog" ("hospitalId","code","name","category") VALUES ($1,$2,$3,$4) RETURNING *`, [hospitalId,dto.code.trim().toUpperCase(),dto.name.trim(),dto.category.trim().toUpperCase()]);
      await this.writeAudit(manager,hospitalId,actor.id,'SERVICE_CREATED','service',row.id);
      return row;
    });
  }

  async createServicePrice(serviceId: string, dto: CreateServicePriceDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      if (!(await this.one(manager, `SELECT "id" FROM "service_catalog" WHERE "id"=$1 AND "hospitalId"=$2 AND "isActive"=true`, [serviceId,hospitalId]))) throw new NotFoundException('Service not found');
      if (dto.payerId && !(await this.one(manager, `SELECT "id" FROM "payers" WHERE "id"=$1 AND "hospitalId"=$2 AND "isActive"=true`, [dto.payerId,hospitalId]))) throw new NotFoundException('Payer not found');
      const [row] = await manager.query(`INSERT INTO "service_prices" ("hospitalId","serviceId","payerId","amount","effectiveFrom","effectiveTo") VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [hospitalId,serviceId,dto.payerId ?? null,dto.amount.toFixed(2),dto.effectiveFrom ?? this.nigeriaDate(),dto.effectiveTo ?? null]);
      await this.writeAudit(manager,hospitalId,actor.id,'SERVICE_PRICE_CREATED','service_price',row.id,{serviceId});
      return row;
    });
  }

  async addInvoiceItem(invoiceId: string, dto: AddInvoiceItemDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      const [invoice] = await manager.query(`SELECT * FROM "invoices" WHERE "id"=$1 AND "hospitalId"=$2 FOR UPDATE`, [invoiceId,hospitalId]);
      if (!invoice) throw new NotFoundException('Invoice not found');
      if (invoice.status === 'PAID' || invoice.status === 'VOID') throw new ConflictException('Cannot add items to a paid or void invoice');
      if (dto.serviceId && !(await this.one(manager, `SELECT "id" FROM "service_catalog" WHERE "id"=$1 AND "hospitalId"=$2`, [dto.serviceId,hospitalId]))) throw new NotFoundException('Service not found');
      const lineTotal = Number((dto.quantity * dto.unitPrice).toFixed(2));
      const [item] = await manager.query(`INSERT INTO "invoice_items" ("hospitalId","invoiceId","serviceId","description","quantity","unitPrice","lineTotal") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [hospitalId,invoiceId,dto.serviceId ?? null,dto.description.trim(),dto.quantity,dto.unitPrice.toFixed(2),lineTotal.toFixed(2)]);
      const amount = (Number(invoice.amount) + lineTotal).toFixed(2);
      const amountPaid = Number(invoice.amountPaid);
      const status = amountPaid > 0 ? (amountPaid >= Number(amount) ? 'PAID' : 'PARTIALLY_PAID') : 'UNPAID';
      await manager.query(`UPDATE "invoices" SET "amount"=$3,"status"=$4,"updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2`, [invoiceId,hospitalId,amount,status]);
      await this.writeAudit(manager,hospitalId,actor.id,'INVOICE_ITEM_ADDED','invoice_item',item.id,{invoiceId,lineTotal});
      return item;
    });
  }

  async listClaims(actor: AuthenticatedUser, status?: string) {
    const hospitalId=this.hospital(actor); const params: unknown[]=[hospitalId]; let where='c."hospitalId"=$1';
    if(status){params.push(status);where+=` AND c."status"=$${params.length}`;}
    return this.dataSource.query(`SELECT c.*,p."name" AS "payerName",i."patientId",pt."hospitalNumber",pt."firstName",pt."lastName" FROM "hmo_claims" c JOIN "payers" p ON p."id"=c."payerId" AND p."hospitalId"=c."hospitalId" JOIN "invoices" i ON i."id"=c."invoiceId" AND i."hospitalId"=c."hospitalId" JOIN "patients" pt ON pt."id"=i."patientId" AND pt."hospitalId"=i."hospitalId" WHERE ${where} ORDER BY c."createdAt" DESC`,params);
  }

  async listCashierShifts(actor: AuthenticatedUser) {
    const hospitalId=this.hospital(actor);
    return this.dataSource.query(`SELECT s.*,u."name" AS "cashierName" FROM "cashier_shifts" s JOIN "staff_users" u ON u."id"=s."cashierId" AND u."hospitalId"=s."hospitalId" WHERE s."hospitalId"=$1 AND ($2::boolean=true OR s."cashierId"=$3) ORDER BY s."openedAt" DESC LIMIT 100`,[hospitalId,actor.role==='ADMIN',actor.id]);
  }

  async createClaim(dto: CreateClaimDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      if (!(await this.one(manager, `SELECT "id" FROM "payers" WHERE "id"=$1 AND "hospitalId"=$2 AND "isActive"=true`, [dto.payerId,hospitalId]))) throw new NotFoundException('Payer not found');
      const [invoice] = await manager.query(`SELECT "id","patientId" FROM "invoices" WHERE "id"=$1 AND "hospitalId"=$2`, [dto.invoiceId,hospitalId]);
      if (!invoice) throw new NotFoundException('Invoice not found');
      const [invoiceAmounts] = await manager.query(`SELECT \"amount\" FROM \"invoices\" WHERE \"id\"=$1 AND \"hospitalId\"=$2`, [dto.invoiceId,hospitalId]);
      if (dto.amountClaimed > Number(invoiceAmounts.amount)) throw new BadRequestException('Claim amount cannot exceed invoice amount');
      const [coverage] = await manager.query(`SELECT "id" FROM "patient_coverages" WHERE "patientId"=$1 AND "payerId"=$2 AND "hospitalId"=$3 AND "isActive"=true AND ("expiresAt" IS NULL OR "expiresAt">=CURRENT_DATE)`, [invoice.patientId,dto.payerId,hospitalId]);
      if (!coverage) throw new BadRequestException('Patient does not have active coverage with this payer');
      const [claim] = await manager.query(`INSERT INTO "hmo_claims" ("hospitalId","payerId","invoiceId","claimNumber","claimType","amountClaimed") VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [hospitalId,dto.payerId,dto.invoiceId,dto.claimNumber ?? null,dto.claimType,dto.amountClaimed.toFixed(2)]);
      await this.writeAudit(manager,hospitalId,actor.id,'HMO_CLAIM_CREATED','hmo_claim',claim.id,{invoiceId:dto.invoiceId});
      return claim;
    });
  }

  async updateClaim(claimId: string, dto: UpdateClaimDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      const [claim] = await manager.query(`SELECT * FROM "hmo_claims" WHERE "id"=$1 AND "hospitalId"=$2 FOR UPDATE`, [claimId,hospitalId]);
      if (!claim) throw new NotFoundException('Claim not found');
      const allowed: Record<string,string[]> = { DRAFT:['SUBMITTED'], SUBMITTED:['ACCEPTED','PARTIAL','REJECTED'], ACCEPTED:['PAID','PARTIAL','REJECTED'], PARTIAL:['PAID','REJECTED'], REJECTED:[], PAID:[] };
      if (!allowed[claim.status]?.includes(dto.status)) throw new ConflictException(`Claim cannot transition from ${claim.status} to ${dto.status}`);
      if (dto.amountApproved !== undefined && dto.amountApproved > Number(claim.amountClaimed)) throw new BadRequestException('Approved amount cannot exceed the claimed amount');
      const [updated] = await manager.query(`UPDATE "hmo_claims" SET "status"=$3,"amountApproved"=COALESCE($4,"amountApproved"),"notes"=COALESCE($5,"notes"),"submittedAt"=CASE WHEN $3='SUBMITTED' THEN now() ELSE "submittedAt" END,"paidAt"=CASE WHEN $3='PAID' THEN now() ELSE "paidAt" END,"updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2 RETURNING *`, [claimId,hospitalId,dto.status,dto.amountApproved?.toFixed(2) ?? null,dto.notes ?? null]);
      await this.writeAudit(manager,hospitalId,actor.id,'HMO_CLAIM_STATUS_CHANGED','hmo_claim',claimId,{from:claim.status,to:dto.status});
      return updated;
    });
  }

  async openCashierShift(dto: OpenShiftDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      if (await this.one(manager, `SELECT "id" FROM "cashier_shifts" WHERE "hospitalId"=$1 AND "cashierId"=$2 AND "closedAt" IS NULL`, [hospitalId,actor.id])) throw new ConflictException('A cashier shift is already open');
      const [shift] = await manager.query(`INSERT INTO "cashier_shifts" ("hospitalId","cashierId","openingFloat") VALUES ($1,$2,$3) RETURNING *`, [hospitalId,actor.id,dto.openingFloat.toFixed(2)]);
      await this.writeAudit(manager,hospitalId,actor.id,'CASHIER_SHIFT_OPENED','cashier_shift',shift.id);
      return shift;
    });
  }

  async closeCashierShift(shiftId: string, dto: CloseShiftDto, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      const [shift] = await manager.query(`SELECT * FROM "cashier_shifts" WHERE "id"=$1 AND "hospitalId"=$2 AND ("cashierId"=$3 OR $4::boolean=true) FOR UPDATE`, [shiftId,hospitalId,actor.id,actor.role==='ADMIN']);
      if (!shift) throw new NotFoundException('Cashier shift not found');
      if (shift.closedAt) throw new ConflictException('Cashier shift is already closed');
      const [payments] = await manager.query(`SELECT COALESCE(SUM(p."amount"),0)::numeric(12,2) AS total FROM "payments" p JOIN "invoices" i ON i."id"=p."invoiceId" AND i."hospitalId"=p."hospitalId" WHERE p."hospitalId"=$1 AND p."receivedById"=$2 AND p."method"='CASH' AND p."createdAt">=$3 AND p."createdAt"<=now()`, [hospitalId,shift.cashierId,shift.openedAt]);
      const expectedCash = Number(shift.openingFloat) + Number(payments.total);
      const variance = Number((dto.countedCash - expectedCash).toFixed(2));
      const [updated] = await manager.query(`UPDATE "cashier_shifts" SET "closedAt"=now(),"expectedCash"=$3,"countedCash"=$4,"variance"=$5,"notes"=$6,"updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2 RETURNING *`, [shiftId,hospitalId,expectedCash.toFixed(2),dto.countedCash.toFixed(2),variance.toFixed(2),dto.notes ?? null]);
      await this.writeAudit(manager,hospitalId,actor.id,'CASHIER_SHIFT_CLOSED','cashier_shift',shiftId,{expectedCash,countedCash:dto.countedCash,variance});
      return updated;
    });
  }

  async revenueReport(actor: AuthenticatedUser, from?: string, to?: string) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.query(`SELECT COALESCE(SUM(p."amount"),0)::numeric(12,2) AS "collectedTotal", COUNT(p."id")::int AS "paymentCount", p."method" FROM "payments" p WHERE p."hospitalId"=$1 AND ($2::date IS NULL OR p."createdAt">=$2::date) AND ($3::date IS NULL OR p."createdAt"<($3::date + INTERVAL '1 day')) GROUP BY p."method" ORDER BY p."method"`, [hospitalId,from ?? null,to ?? null]);
  }

  async claimsAgingReport(actor: AuthenticatedUser) {
    return this.dataSource.query(`SELECT c."status", CASE WHEN c."submittedAt" IS NULL THEN 'NOT_SUBMITTED' WHEN now()-c."submittedAt" < INTERVAL '30 days' THEN '0_29_DAYS' WHEN now()-c."submittedAt" < INTERVAL '60 days' THEN '30_59_DAYS' WHEN now()-c."submittedAt" < INTERVAL '90 days' THEN '60_89_DAYS' ELSE '90_PLUS_DAYS' END AS "ageBucket", COUNT(*)::int AS "claimCount", COALESCE(SUM(c."amountClaimed"),0)::numeric(12,2) AS "amountClaimed", COALESCE(SUM(COALESCE(c."amountApproved",0)),0)::numeric(12,2) AS "amountApproved" FROM "hmo_claims" c WHERE c."hospitalId"=$1 AND c."status"<>'PAID' GROUP BY c."status","ageBucket" ORDER BY c."status","ageBucket"`, [this.hospital(actor)]);
  }

  async stockReport(actor: AuthenticatedUser, nearExpiryDays = 90) {
    if (!Number.isInteger(nearExpiryDays) || nearExpiryDays < 0 || nearExpiryDays > 365) throw new BadRequestException('nearExpiryDays must be between 0 and 365');
    const hospitalId = this.hospital(actor);
    return this.dataSource.query(`SELECT d."id",d."genericName",d."brandName",d."form",d."strength",d."reorderLevel",COALESCE(SUM(b."quantityOnHand") FILTER (WHERE b."expiryDate">=(now() AT TIME ZONE 'Africa/Lagos')::date),0)::int AS "availableStock",COALESCE(SUM(b."quantityOnHand") FILTER (WHERE b."expiryDate">=(now() AT TIME ZONE 'Africa/Lagos')::date AND b."expiryDate"<=(now() AT TIME ZONE 'Africa/Lagos')::date + ($2::int * INTERVAL '1 day')),0)::int AS "nearExpiryStock" FROM "drugs" d LEFT JOIN "drug_batches" b ON b."drugId"=d."id" AND b."hospitalId"=d."hospitalId" WHERE d."hospitalId"=$1 GROUP BY d."id" ORDER BY d."genericName"`, [hospitalId,nearExpiryDays]);
  }

  async nhmisReport(actor: AuthenticatedUser, month: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('month must use YYYY-MM format with a valid month');
    const hospitalId = this.hospital(actor);
    const start = `${month}-01`;
    return this.dataSource.query(`SELECT $2::date AS "month",(SELECT COUNT(*)::int FROM "visits" v WHERE v."hospitalId"=$1 AND v."visitDate">=$2::date AND v."visitDate"<($2::date + INTERVAL '1 month')) AS "outpatientVisits",(SELECT COUNT(*)::int FROM "admissions" a WHERE a."hospitalId"=$1 AND a."admittedAt">=$2::date AND a."admittedAt"<($2::date + INTERVAL '1 month')) AS "admissions",(SELECT COUNT(*)::int FROM "antenatal_records" a WHERE a."hospitalId"=$1 AND a."createdAt">=$2::date AND a."createdAt"<($2::date + INTERVAL '1 month')) AS "newAntenatalEnrollments",(SELECT COUNT(*)::int FROM "immunization_records" i WHERE i."hospitalId"=$1 AND i."administeredAt">=$2::date AND i."administeredAt"<($2::date + INTERVAL '1 month')) AS "immunizations"`, [hospitalId,start]);
  }

  private async writeAudit(manager: EntityManager, hospitalId: string, actorId: string, action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}): Promise<void> {
    await manager.query(`INSERT INTO "audit_logs" ("hospitalId","actorId","action","targetType","targetId","metadata") VALUES ($1,$2,$3,$4,$5,$6::jsonb)`, [hospitalId, actorId, action, targetType, targetId, JSON.stringify(metadata)]);
  }

  private hospital(actor: AuthenticatedUser): string {
    if (!actor.hospitalId) throw new NotFoundException('A hospital must be selected for this operation');
    return actor.hospitalId;
  }

  private nigeriaDate(): string {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  private ageAt(dateOfBirth: string): number {
    const dob = new Date(`${dateOfBirth}T00:00:00Z`);
    const now = new Date();
    let age = now.getUTCFullYear() - dob.getUTCFullYear();
    if (now.getUTCMonth() < dob.getUTCMonth() || (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate())) age--;
    return age;
  }

  private async one(manager: EntityManager, sql: string, params: unknown[]): Promise<Record<string, unknown> | null> {
    const rows = await manager.query(sql, params);
    return rows[0] ?? null;
  }
}
