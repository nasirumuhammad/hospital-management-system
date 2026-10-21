interface BaseProps {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string | null;
}

export function Checkbox({ label, hint, name }: { label: string; hint?: string; name: string }) {
  return (
    <label className="check-field">
      <input type="checkbox" name={name} />
      <span>{label}{hint && <small>{hint}</small>}</span>
    </label>
  );
}

export function Field({ label, name, type = 'text', required = false, defaultValue, ...rest }: BaseProps & { type?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'defaultValue' | 'name' | 'type' | 'required'>) {
  return (
    <label className="field">
      <span>{label}{required ? ' *' : ''}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue ?? ''} {...rest} />
    </label>
  );
}

export function TextArea({ label, name, required = false, defaultValue, rows = 3 }: BaseProps & { rows?: number }) {
  return (
    <label className="field">
      <span>{label}{required ? ' *' : ''}</span>
      <textarea name={name} rows={rows} required={required} defaultValue={defaultValue ?? ''} />
    </label>
  );
}

export interface Option {
  value: string;
  label: string;
}

export function Select({ label, name, options, required = false, defaultValue, placeholder, onChange }: BaseProps & {
  options: Option[];
  placeholder?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}{required ? ' *' : ''}</span>
      <select name={name} required={required} defaultValue={defaultValue ?? ''} onChange={(event) => onChange?.(event.target.value)}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
