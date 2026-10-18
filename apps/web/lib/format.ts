const LOCALE = 'en-NG';
/** Fixed zone so server and browser render identical times (the server runs in UTC). */
const TIME_ZONE = 'Africa/Lagos';
const CURRENCY = 'NGN';
const INITIALS_LENGTH = 2;
const NOON_HOUR = 12;
const EVENING_HOUR = 18;

export const initials = (name: string): string =>
  name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, INITIALS_LENGTH).toUpperCase();

export const fullName = (person?: { firstName: string; lastName: string } | null): string =>
  person ? `${person.firstName} ${person.lastName}` : 'Unknown';

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE });

export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });

export const formatDateTime = (iso: string): string => `${formatDate(iso)}, ${formatTime(iso)}`;

export const formatMoney = (amount: string | number): string =>
  new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).format(Number(amount));

export const titleCase = (value: string): string =>
  value.toLowerCase().split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

export const toIsoFromLocalInput = (value: string): string => new Date(value).toISOString();

const hourInHospital = (now: Date): number =>
  Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: TIME_ZONE }).format(now));

export const greeting = (now: Date = new Date()): string => {
  const hour = hourInHospital(now);
  if (hour < NOON_HOUR) return 'Good morning';
  if (hour < EVENING_HOUR) return 'Good afternoon';
  return 'Good evening';
};

export const formatLongDate = (now: Date = new Date()): string =>
  now.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', timeZone: TIME_ZONE });
