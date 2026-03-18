import { useAppOptions } from '@/hooks/useAppOptions';

interface AppOptionSelectProps {
  category: string;
  label: string;
  value?: number | null;
  onChange: (value?: number) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export function AppOptionSelect({
  category,
  label,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled,
  error,
}: AppOptionSelectProps) {
  const { data, isLoading } = useAppOptions(category);

  return (
    <div className="field">
      <label>{label}</label>
      <select
        className="input"
        value={value ?? ''}
        disabled={disabled || isLoading}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw ? Number(raw) : undefined);
        }}
      >
        <option value="">{isLoading ? 'Loading...' : placeholder}</option>
        {(data ?? []).map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
