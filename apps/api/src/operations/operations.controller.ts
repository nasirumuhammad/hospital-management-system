import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Patch } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { BilledOrdersService } from './billed-orders.service';
import { OperationsService } from './operations.service';
import { SetPriceDto } from './dto/set-price.dto';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitStatusDto } from './dto/update-visit-status.dto';
import { CreateTriageDto } from './dto/create-triage.dto';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { RecordLabResultsDto } from './dto/record-lab-results.dto';
import { CreateDrugDto } from './dto/create-drug.dto';
import { ReceiveDrugBatchDto } from './dto/receive-drug-batch.dto';
import { DispensePrescriptionDto, StockAdjustmentDto, WalkInDispenseDto } from './dto/dispense.dto';
import { AddInvoiceItemDto, AntenatalVisitDto, CloseShiftDto, CreateAntenatalDto, CreateBedDto, CreateClaimDto, CreateServiceDto, CreateServicePriceDto, CreateWardDto, DischargePatientDto, FamilyPlanningDto, ImmunizationDto, AdmitPatientDto, NursingObservationDto, OpenShiftDto, UpdateClaimDto, CreateAllergyDto, ReviewAllergiesDto, CreatePayerDto, CreateCoverageDto, CreateAuthorizationDto, UpdateAuthorizationDto, CreateLabTestDto, CreateLabParameterDto, CreateLabRangeDto, CreateDiagnosisDto } from './dto/operations-extra.dto';

const CLINICAL_ROLES = [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.RECEPTIONIST, UserRole.CASHIER];

@Controller()
export class OperationsController {
  constructor(private readonly operations: OperationsService, private readonly billedOrders: BilledOrdersService) {}

  @Get('visits')
  @Roles(...CLINICAL_ROLES)
  listVisits(@CurrentUser() actor: AuthenticatedUser, @Query('date') date?: string, @Query('status') status?: string, @Query('q') q?: string) {
    return this.operations.listVisits(actor, { date, status, q });
  }

  @Post('visits')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.NURSE)
  createVisit(@Body() dto: CreateVisitDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createVisit(dto, actor); }

  @Patch('visits/:id/status')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.RECEPTIONIST)
  updateVisitStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVisitStatusDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.updateVisitStatus(id, dto, actor); }

  @Post('visits/:id/triage')
  @Roles(UserRole.ADMIN, UserRole.NURSE, UserRole.DOCTOR)
  createTriage(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateTriageDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createTriage(id, dto, actor); }

  @Get('lab/tests')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.LAB)
  listLabTests(@CurrentUser() actor: AuthenticatedUser, @Query('q') q?: string) { return this.operations.listLabTests(actor, q); }

  @Post('lab/tests')
  @Roles(UserRole.ADMIN, UserRole.LAB)
  createLabTest(@Body() dto: CreateLabTestDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createLabTest(dto, actor); }

  @Post('lab/tests/:id/parameters')
  @Roles(UserRole.ADMIN, UserRole.LAB)
  createLabParameter(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateLabParameterDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createLabParameter(id, dto, actor); }

  @Post('lab/parameters/:id/ranges')
  @Roles(UserRole.ADMIN, UserRole.LAB)
  createLabRange(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateLabRangeDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createLabRange(id, dto, actor); }

  @Get('print/patient-card/:id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.RECEPTIONIST)
  getPatientPrintCard(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) { return this.operations.getPatientPrintCard(id, actor); }

  @Get('print/receipt/:paymentId')
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.PATIENT)
  getReceiptPrintData(@Param('paymentId', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) { return this.operations.getReceiptPrintData(id, actor); }

  @Get('print/lab-report/:itemId')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.LAB)
  getLabReportPrintData(@Param('itemId', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) { return this.operations.getLabReportPrintData(id, actor); }

  @Get('clinical/icd10')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  searchIcd10(@Query('q') q?: string) { return this.operations.searchIcd10(q); }

  @Get('medical-records/:id/diagnoses')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  listConsultationDiagnoses(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) { return this.operations.listConsultationDiagnoses(id, actor); }

  @Post('medical-records/:id/diagnoses')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  addConsultationDiagnosis(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateDiagnosisDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.addConsultationDiagnosis(id, dto, actor); }

  @Post('lab/orders')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  createLabOrder(@Body() dto: CreateLabOrderDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createLabOrder(dto, actor); }

  @Get('lab/orders')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.LAB)
  listLabOrders(@CurrentUser() actor: AuthenticatedUser, @Query('status') status?: string) { return this.operations.listLabOrders(actor, status); }

  @Post('lab/order-items/:id/collect')
  @Roles(UserRole.ADMIN, UserRole.LAB)
  collectLabItem(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) { return this.operations.collectLabItem(id, actor); }

  @Post('lab/order-items/:id/results')
  @Roles(UserRole.ADMIN, UserRole.LAB)
  recordLabResults(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RecordLabResultsDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.recordLabResults(id, dto, actor); }

  @Get('pharmacy/drugs')
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST, UserRole.DOCTOR)
  listDrugs(@CurrentUser() actor: AuthenticatedUser, @Query('q') q?: string) { return this.operations.listDrugs(actor, q); }

  @Post('pharmacy/drugs')
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST)
  createDrug(@Body() dto: CreateDrugDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createDrug(dto, actor); }

  @Post('pharmacy/drugs/:id/batches')
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST)
  receiveBatch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReceiveDrugBatchDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.receiveBatch(id, dto, actor); }

  @Get('pharmacy/queue')
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST)
  pharmacyQueue(@CurrentUser() actor: AuthenticatedUser, @Query('status') status?: string) { return this.billedOrders.listPharmacyQueue(actor, status); }

  @Post('pharmacy/prescriptions/:id/invoice')
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST)
  invoicePrescription(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) { return this.billedOrders.invoicePrescription(id, actor); }

  @Patch('pharmacy/drugs/:id/price')
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST)
  setDrugPrice(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetPriceDto, @CurrentUser() actor: AuthenticatedUser) { return this.billedOrders.setDrugPrice(id, dto.price, actor); }

  @Post('lab/orders/:id/invoice')
  @Roles(UserRole.ADMIN, UserRole.LAB)
  invoiceLabOrder(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) { return this.billedOrders.invoiceLabOrder(id, actor); }

  @Patch('lab/tests/:id/price')
  @Roles(UserRole.ADMIN, UserRole.LAB)
  setLabTestPrice(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetPriceDto, @CurrentUser() actor: AuthenticatedUser) { return this.billedOrders.setLabTestPrice(id, dto.price, actor); }

  @Post('pharmacy/prescriptions/:id/dispense')
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST)
  dispensePrescription(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DispensePrescriptionDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.dispensePrescription(id, dto, actor); }

  @Post('pharmacy/dispense/walk-in')
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST)
  dispenseWalkIn(@Body() dto: WalkInDispenseDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.dispenseWalkIn(dto, actor); }

  @Post('pharmacy/batches/:id/adjustments')
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST)
  adjustStock(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StockAdjustmentDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.adjustStock(id, dto, actor); }

  @Get('billing/payers')
  @Roles(UserRole.ADMIN, UserRole.HMO_DESK, UserRole.CASHIER)
  listPayers(@CurrentUser() actor: AuthenticatedUser) { return this.operations.listPayers(actor); }

  @Post('billing/payers')
  @Roles(UserRole.ADMIN, UserRole.HMO_DESK)
  createPayer(@Body() dto: CreatePayerDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createPayer(dto, actor); }

  @Get('patients/:id/coverages')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.HMO_DESK, UserRole.CASHIER)
  listPatientCoverages(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) { return this.operations.listPatientCoverages(id, actor); }

  @Post('patients/:id/coverages')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.HMO_DESK)
  createPatientCoverage(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateCoverageDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createPatientCoverage(id, dto, actor); }

  @Get('patients/:id/allergies')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  listPatientAllergies(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) { return this.operations.listPatientAllergies(id, actor); }

  @Post('patients/:id/allergies')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  createPatientAllergy(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateAllergyDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createPatientAllergy(id, dto, actor); }

  @Patch('patients/:id/allergies-reviewed')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  markAllergiesReviewed(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewAllergiesDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.markAllergiesReviewed(id, dto, actor); }

  @Post('visits/:id/authorizations')
  @Roles(UserRole.ADMIN, UserRole.HMO_DESK)
  createVisitAuthorization(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateAuthorizationDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createVisitAuthorization(id, dto, actor); }

  @Patch('visit-authorizations/:id')
  @Roles(UserRole.ADMIN, UserRole.HMO_DESK)
  updateVisitAuthorization(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAuthorizationDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.updateVisitAuthorization(id, dto.status, dto.code, dto.note, actor); }

  @Get('inpatient/wards')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.WARD_MANAGER)
  listWards(@CurrentUser() actor: AuthenticatedUser) { return this.operations.listWards(actor); }

  @Get('inpatient/beds')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.WARD_MANAGER)
  listBeds(@CurrentUser() actor: AuthenticatedUser) { return this.operations.listBeds(actor); }

  @Post('inpatient/wards')
  @Roles(UserRole.ADMIN, UserRole.WARD_MANAGER)
  createWard(@Body() dto: CreateWardDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createWard(dto, actor); }

  @Post('inpatient/wards/:id/beds')
  @Roles(UserRole.ADMIN, UserRole.WARD_MANAGER)
  createBed(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateBedDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createBed(id, dto, actor); }

  @Get('inpatient/admissions')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.WARD_MANAGER)
  listAdmissions(@CurrentUser() actor: AuthenticatedUser, @Query('status') status?: string) { return this.operations.listAdmissions(actor, status); }

  @Post('inpatient/admissions')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.WARD_MANAGER)
  admitPatient(@Body() dto: AdmitPatientDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.admitPatient(dto, actor); }

  @Post('inpatient/admissions/:id/discharge')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.WARD_MANAGER)
  dischargePatient(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DischargePatientDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.dischargePatient(id, dto, actor); }

  @Post('inpatient/admissions/:id/observations')
  @Roles(UserRole.ADMIN, UserRole.NURSE, UserRole.DOCTOR)
  addNursingObservation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: NursingObservationDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.addNursingObservation(id, dto, actor); }

  @Get('maternity/antenatal')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  listAntenatal(@CurrentUser() actor: AuthenticatedUser) { return this.operations.listAntenatal(actor); }

  @Post('maternity/antenatal')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  createAntenatal(@Body() dto: CreateAntenatalDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createAntenatal(dto, actor); }

  @Post('maternity/antenatal/:id/visits')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  addAntenatalVisit(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AntenatalVisitDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.addAntenatalVisit(id, dto, actor); }

  @Post('maternity/immunizations')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  createImmunization(@Body() dto: ImmunizationDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createImmunization(dto, actor); }

  @Post('maternity/family-planning')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  createFamilyPlanning(@Body() dto: FamilyPlanningDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createFamilyPlanning(dto, actor); }

  @Get('billing/services')
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.DOCTOR, UserRole.HMO_DESK)
  listServices(@CurrentUser() actor: AuthenticatedUser) { return this.operations.listServices(actor); }

  @Post('billing/services')
  @Roles(UserRole.ADMIN)
  createService(@Body() dto: CreateServiceDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createService(dto, actor); }

  @Post('billing/services/:id/prices')
  @Roles(UserRole.ADMIN)
  createServicePrice(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateServicePriceDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createServicePrice(id, dto, actor); }

  @Post('billing/invoices/:id/items')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  addInvoiceItem(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddInvoiceItemDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.addInvoiceItem(id, dto, actor); }

  @Get('billing/claims')
  @Roles(UserRole.ADMIN, UserRole.HMO_DESK)
  listClaims(@CurrentUser() actor: AuthenticatedUser, @Query('status') status?: string) { return this.operations.listClaims(actor, status); }

  @Post('billing/claims')
  @Roles(UserRole.ADMIN, UserRole.HMO_DESK)
  createClaim(@Body() dto: CreateClaimDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.createClaim(dto, actor); }

  @Patch('billing/claims/:id/status')
  @Roles(UserRole.ADMIN, UserRole.HMO_DESK)
  updateClaim(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClaimDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.updateClaim(id, dto, actor); }

  @Get('billing/shifts')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  listCashierShifts(@CurrentUser() actor: AuthenticatedUser) { return this.operations.listCashierShifts(actor); }

  @Post('billing/shifts/open')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  openCashierShift(@Body() dto: OpenShiftDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.openCashierShift(dto, actor); }

  @Post('billing/shifts/:id/close')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  closeCashierShift(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CloseShiftDto, @CurrentUser() actor: AuthenticatedUser) { return this.operations.closeCashierShift(id, dto, actor); }

  @Get('reports/revenue')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  revenueReport(@CurrentUser() actor: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) { return this.operations.revenueReport(actor, from, to); }

  @Get('reports/claims-aging')
  @Roles(UserRole.ADMIN, UserRole.HMO_DESK)
  claimsAgingReport(@CurrentUser() actor: AuthenticatedUser) { return this.operations.claimsAgingReport(actor); }

  @Get('reports/stock')
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST)
  stockReport(@CurrentUser() actor: AuthenticatedUser, @Query('nearExpiryDays') nearExpiryDays?: string) { return this.operations.stockReport(actor, nearExpiryDays ? Number(nearExpiryDays) : 90); }

  @Get('reports/nhmis')
  @Roles(UserRole.ADMIN)
  nhmisReport(@CurrentUser() actor: AuthenticatedUser, @Query('month') month: string) { return this.operations.nhmisReport(actor, month); }
}
