import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePatientDto } from '../../patients/dto/create-patient.dto';
import { CreateInvoiceDto } from '../../invoices/dto/create-invoice.dto';
import { CreateAppointmentDto } from '../../appointments/dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from '../../appointments/dto/list-appointments-query.dto';
import { CreateDoctorDto } from '../../doctors/dto/create-doctor.dto';

describe('strict input validation', () => {
  const patient = (dateOfBirth: string) => plainToInstance(CreatePatientDto, {
    firstName: 'Amina', lastName: 'Bello', email: 'amina@example.com', dateOfBirth,
  });

  it('rejects a date of birth in the future', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const value = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    const errors = await validate(patient(value));
    expect(errors.some((error) => error.property === 'dateOfBirth')).toBe(true);
  });

  it.each(['2025-02-29', '2024-13-01', '2024-04-31', 'tomorrow'])('rejects invalid calendar date %s', async (dateOfBirth) => {
    const errors = await validate(patient(dateOfBirth));
    expect(errors.some((error) => error.property === 'dateOfBirth')).toBe(true);
  });

  it('accepts a valid past date of birth', async () => {
    const errors = await validate(patient('1998-07-14'));
    expect(errors.some((error) => error.property === 'dateOfBirth')).toBe(false);
  });

  it.each(['2025-02-29', '2024-13-01', '2024-04-31'])('rejects invalid invoice due date %s', async (dueDate) => {
    const dto = plainToInstance(CreateInvoiceDto, {
      patientId: 'a2d4c5f0-5c3e-4a5d-9a2d-9a2c4d6f8a10', description: 'Consultation', amount: 100, dueDate,
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'dueDate')).toBe(true);
  });

  it.each(['123', 'not a phone', '12345678901234567890'])('rejects malformed phone number %s', async (phone) => {
    const dto = plainToInstance(CreateDoctorDto, { firstName: 'Amina', lastName: 'Bello', email: 'amina@example.com', specialty: 'General', phone });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'phone')).toBe(true);
  });

  it('rejects query date ranges where from is later than to', async () => {
    const dto = plainToInstance(ListAppointmentsQueryDto, { from: '2026-10-22T12:00:00.000Z', to: '2026-10-21T12:00:00.000Z' });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'to')).toBe(true);
  });

  it('rejects appointment timestamps in the past', async () => {
    const dto = plainToInstance(CreateAppointmentDto, {
      doctorId: 'a2d4c5f0-5c3e-4a5d-9a2d-9a2c4d6f8a10', scheduledAt: '2020-01-01T10:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'scheduledAt')).toBe(true);
  });
});
