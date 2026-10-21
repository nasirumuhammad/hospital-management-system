import { Injectable } from '@nestjs/common';
import { AppointmentsService } from '../appointments/appointments.service';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { DoctorsService } from '../doctors/doctors.service';
import { InvoicesService } from '../invoices/invoices.service';
import { PatientsService } from '../patients/patients.service';

export interface DashboardSummary {
  patients?: number;
  doctors: number;
  appointments: number;
  pendingAppointments: number;
  upcomingAppointments: number;
  outstandingInvoices?: number;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly patients: PatientsService,
    private readonly doctors: DoctorsService,
    private readonly appointments: AppointmentsService,
    private readonly invoices: InvoicesService,
  ) {}

  async summary(user: AuthenticatedUser): Promise<DashboardSummary> {
    const now = new Date();
    const [doctors, appointments, pendingAppointments, upcomingAppointments] = await Promise.all([
      this.doctors.countActive(user),
      this.appointments.count(user),
      this.appointments.count(user, { status: AppointmentStatus.PENDING }),
      this.appointments.count(user, { upcomingFrom: now }),
    ]);
    return {
      doctors,
      appointments,
      pendingAppointments,
      upcomingAppointments,
      ...(user.role !== UserRole.PATIENT && { patients: await this.patients.count(user) }),
      ...(user.role !== UserRole.DOCTOR && { outstandingInvoices: await this.invoices.countOutstanding(user) }),
    };
  }
}
