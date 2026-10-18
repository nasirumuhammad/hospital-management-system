import { APPOINTMENT_SLOT_MINUTES } from '../common/constants/appointment.constants';
import { MS_PER_MINUTE } from '../common/constants/auth.constants';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';

export const OPEN_STATUSES: readonly AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

const ALLOWED_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  [AppointmentStatus.PENDING]: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.CONFIRMED]: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isOpen(status: AppointmentStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

export function conflictWindow(scheduledAt: Date): { from: Date; to: Date } {
  const slotMs = APPOINTMENT_SLOT_MINUTES * MS_PER_MINUTE;
  return { from: new Date(scheduledAt.getTime() - slotMs), to: new Date(scheduledAt.getTime() + slotMs) };
}
