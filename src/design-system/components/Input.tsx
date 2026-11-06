import React, { useId } from 'react';
import { cn } from '../../lib/utils';
import { DesignTokens, Radius, Transitions } from '../tokens';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    const id = useId();
    const inputId = `input-${id}`;

    const baseStyles = cn(
      'flex w-full flex-col gap-1.5 rounded-lg border bg-bg1 px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand/50 disabled:opacity-50 disabled:pointer-events-none transition-all',
      Transitions.default
    );

    const inputBaseStyles = cn(
      'w-full rounded-md border border-line bg-bg0 px-3 py-1.5 text-fg placeholder:text-muted focus:border-brand focus:ring-1 focus:ring-brand/50',
      Radius.lg
    );

    const errorStyles = error ? 'border-error focus:border-error focus:ring-error/50' : '';

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId} 
            className="text-xs font-medium text-muted"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(inputBaseStyles, errorStyles, className)}
          {...props}
        />
        {error && <p className="text-xs text-error mt-0.5">{error}</p>}
        {helperText && <p className="text-xs text-muted mt-0.5">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
