import type { Doctor, Drug, StaffMember, MedicalRecord, Paginated, Patient, Visit } from '@healthcare/types';
import type { ComboOption } from '@/components/ui/ComboboxField';
import { api } from './api-client';
import { formatDate, fullName } from './format';

const OPTION_PAGE_SIZE = 20;
const SHORT_ID_LENGTH = 8;

/** Patients matching a name, email, phone or id fragment. Only one small page is ever loaded. */
export async function fetchPatientOptions(term: string): Promise<ComboOption[]> {
  const result = await api<Paginated<Patient>>('/patients', { query: { q: term || undefined, limit: OPTION_PAGE_SIZE, sortBy: 'name', order: 'asc' } });
  return result.items.map((patient) => ({
    value: patient.id,
    label: fullName(patient),
    description: [patient.email, patient.phone, `ID ${patient.id.slice(0, SHORT_ID_LENGTH)}`].filter(Boolean).join(' · '),
  }));
}

export async function fetchDoctorOptions(term: string): Promise<ComboOption[]> {
  const result = await api<Paginated<Doctor>>('/doctors', { query: { q: term || undefined, limit: OPTION_PAGE_SIZE } });
  return result.items.map((doctor) => ({
    value: doctor.id,
    label: `Dr. ${fullName(doctor)}`,
    description: `${doctor.specialty} · ${doctor.email}`,
  }));
}

/** Staff records of one role (an account can only be linked to a staff record with the same role). */
export function staffOptionsFetcher(role: string) {
  return async (term: string): Promise<ComboOption[]> => {
    const result = await api<Paginated<StaffMember>>('/staff', { query: { q: term || undefined, role, limit: OPTION_PAGE_SIZE } });
    return result.items.map((member) => ({ value: member.id, label: fullName(member), description: [member.jobTitle, member.email].filter(Boolean).join(' · ') }));
  };
}

export function recordOptionsFetcher(patientId: string) {
  return async (term: string): Promise<ComboOption[]> => {
    const result = await api<Paginated<MedicalRecord>>('/medical-records', { query: { patientId, q: term || undefined, limit: OPTION_PAGE_SIZE } });
    return result.items.map((record) => ({ value: record.id, label: record.diagnosis, description: formatDate(record.createdAt) }));
  };
}

export async function fetchDrugOptions(term: string): Promise<ComboOption[]> {
  const result = await api<Drug[]>('/pharmacy/drugs', { query: { q: term || undefined } });
  return result.map((drug) => ({ value: drug.id, label: drug.genericName, description: [drug.brandName, drug.strength, `${drug.availableStock} ${drug.dispensingUnit ?? 'units'} available`].filter(Boolean).join(' · ') }));
}

export async function fetchVisitOptions(term: string): Promise<ComboOption[]> {
  const visits = await api<Visit[]>('/visits', { query: { q: term || undefined } });
  return visits.map((visit) => ({ value: visit.id, label: `Queue #${visit.visitNumber} · ${[visit.firstName, visit.middleName, visit.lastName].filter(Boolean).join(' ')}`, description: `${visit.hospitalNumber} · ${visit.status.replaceAll('_', ' ')}` }));
}

export async function fetchBedOptions(term: string): Promise<ComboOption[]> {
  type BedOption = { id: string; bedNumber: string; wardName: string; status: string };
  const beds = await api<BedOption[]>('/inpatient/beds');
  return beds.filter((bed) => `${bed.wardName} ${bed.bedNumber} ${bed.status} ${bed.id}`.toLowerCase().includes(term.toLowerCase())).map((bed) => ({ value: bed.id, label: `${bed.wardName} · ${bed.bedNumber}`, description: `${bed.status} · ${bed.id}` }));
}
