const MINOR_UNITS_PER_MAJOR = 100;
const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;

export function toMinorUnits(amount: string): number {
  if (!DECIMAL_PATTERN.test(amount)) throw new RangeError(`Invalid monetary amount: ${amount}`);
  const [whole, fraction = ''] = amount.split('.');
  return Number(whole) * MINOR_UNITS_PER_MAJOR + Number(fraction.padEnd(2, '0'));
}

export function fromMinorUnits(minorUnits: number): string {
  const whole = Math.floor(minorUnits / MINOR_UNITS_PER_MAJOR);
  const fraction = String(minorUnits % MINOR_UNITS_PER_MAJOR).padStart(2, '0');
  return `${whole}.${fraction}`;
}
