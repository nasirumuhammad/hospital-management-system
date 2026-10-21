import type { Doctor, MedicalRecord, Paginated, Patient } from '@healthcare/types';
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

export function recordOptionsFetcher(patientId: string) {
  return async (term: string): Promise<ComboOption[]> => {
    const result = await api<Paginated<MedicalRecord>>('/medical-records', { query: { patientId, q: term || undefined, limit: OPTION_PAGE_SIZE } });
    return result.items.map((record) => ({ value: record.id, label: record.diagnosis, description: formatDate(record.createdAt) }));
  };
}
