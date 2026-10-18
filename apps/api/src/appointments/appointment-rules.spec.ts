import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { canTransition, conflictWindow, isOpen } from './appointment-rules';

describe('appointment rules', () => {
  it.each([
    [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, true],
    [AppointmentStatus.PENDING, AppointmentStatus.CANCELLED, true],
    [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED, true],
    [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING, false],
    [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, false],
    [AppointmentStatus.CANCELLED, AppointmentStatus.CONFIRMED, false],
  ])('transition %s -> %s allowed=%s', (from, to, allowed) => {
    expect(canTransition(from, to)).toBe(allowed);
  });

  it('treats only pending and confirmed appointments as open', () => {
    expect(isOpen(AppointmentStatus.PENDING)).toBe(true);
    expect(isOpen(AppointmentStatus.CONFIRMED)).toBe(true);
    expect(isOpen(AppointmentStatus.COMPLETED)).toBe(false);
    expect(isOpen(AppointmentStatus.CANCELLED)).toBe(false);
  });

  it('builds a symmetric conflict window around the slot', () => {
    const at = new Date('2030-01-01T10:00:00Z');
    const { from, to } = conflictWindow(at);
    expect(at.getTime() - from.getTime()).toBe(to.getTime() - at.getTime());
    expect(to.getTime() - at.getTime()).toBe(30 * 60_000);
  });
});
