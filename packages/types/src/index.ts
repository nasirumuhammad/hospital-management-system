export const USER_ROLES = ['ADMIN', 'DOCTOR', 'PATIENT'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const INVOICE_STATUSES = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOID'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_METHODS = ['CASH', 'CARD', 'TRANSFER', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const GENDERS = ['Female', 'Male', 'Other', 'Prefer not to say'] as const;

export const AUDIT_TARGETS = ['user', 'patient', 'doctor', 'appointment', 'medical_record', 'prescription', 'invoice', 'payment'] as const;
export type AuditTarget = (typeof AUDIT_TARGETS)[number];

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  userId: string | null;
}

export interface PatientSummary {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string | null;
}

export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  specialty: string;
  qualification: string | null;
  isActive: boolean;
  userId: string | null;
}

export interface DoctorSummary {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  status: AppointmentStatus;
  reason: string | null;
  patient: PatientSummary;
  doctor: DoctorSummary;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId: string | null;
  diagnosis: string;
  notes: string;
  allergies: string | null;
  treatmentPlan: string | null;
  createdAt: string;
  patient: PatientSummary;
  doctor: DoctorSummary;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  medicalRecordId: string | null;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  createdAt: string;
  patient: PatientSummary;
  doctor: DoctorSummary;
}

export interface Payment {
  id: string;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  patientId: string;
  appointmentId: string | null;
  description: string;
  amount: string;
  amountPaid: string;
  status: InvoiceStatus;
  dueDate: string | null;
  createdAt: string;
  patient: PatientSummary;
  payments?: Payment[];
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface DashboardSummary {
  patients?: number;
  doctors: number;
  appointments: number;
  pendingAppointments: number;
  upcomingAppointments: number;
  outstandingInvoices?: number;
}
