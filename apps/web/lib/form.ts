export type FormValues = Record<string, string>;

export function readForm(form: HTMLFormElement): FormValues {
  const values: FormValues = {};
  new FormData(form).forEach((value, key) => {
    if (typeof value === 'string') values[key] = value.trim();
  });
  return values;
}

/** Create: omit blank optional fields. Update: send null so blanked fields are cleared. */
export function toPayload(values: FormValues, optionalKeys: string[], mode: 'create' | 'update'): Record<string, string | null> {
  const payload: Record<string, string | null> = {};
  Object.entries(values).forEach(([key, value]) => {
    if (value !== '') payload[key] = value;
    else if (optionalKeys.includes(key) && mode === 'update') payload[key] = null;
  });
  return payload;
}
