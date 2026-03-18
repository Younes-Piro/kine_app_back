import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const fieldId = id ?? props.name;

    return (
      <div className="field">
        {label ? <label htmlFor={fieldId}>{label}</label> : null}
        <input ref={ref} id={fieldId} className={cn('input', className)} {...props} />
        {error ? <p className="field-error">{error}</p> : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
