import { titleCase } from '@/lib/format';

const TONE: Record<string, string> = {
  PENDING: 'pending', CONFIRMED: 'confirmed', COMPLETED: 'completed', CANCELLED: 'cancelled',
  UNPAID: 'pending', PARTIALLY_PAID: 'completed', PAID: 'confirmed', VOID: 'cancelled',
  ACTIVE: 'confirmed', INACTIVE: 'cancelled', DISABLED: 'cancelled',
};

export function StatusBadge({ value }: { value: string }) {
  return <span className={`status ${TONE[value] ?? 'completed'}`}>{titleCase(value)}</span>;
}
