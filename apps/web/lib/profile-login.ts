import { api } from './api-client';
import type { FormValues } from './form';

export type LoginProfileType = 'PATIENT' | 'DOCTOR';

const LOGIN_CHOICE_FIELD = 'createLogin';
const CHECKED_VALUE = 'on';

/** Creates the account for an existing patient/doctor record, e-mails an invitation and links it. */
export function createLoginFor(profileType: LoginProfileType, profileId: string): Promise<unknown> {
  return api('/users/from-profile', { method: 'POST', body: { profileType, profileId } });
}

/** Separates the "give this person a login" checkbox from the record fields sent to the API. */
export function splitLoginChoice(values: FormValues): { wantsLogin: boolean; recordValues: FormValues } {
  const { [LOGIN_CHOICE_FIELD]: choice, ...recordValues } = values;
  return { wantsLogin: choice === CHECKED_VALUE, recordValues };
}
