import React from 'react';
import { cn } from '../../lib/utils';
import { DesignTokens, Typography } from '../../design-system/tokens';


interface InputProps {
  label?: string;
  error?: string;
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search' | 'checkbox' | 'radio';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled,
  size = 'md',
  className,
}) => {
  const baseStyles = cn(
    'w-full rounded-md border border-white/10 bg-bg1 px-3 py-2 text-fg focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all',
    'disabled:opacity-50 disabled:bg-bg0 disabled:cursor-not-allowed',
    type === 'password' && 'placeholder-transparent',
    className
  );

  const sizeStyles = {
    sm: 'px-2 py-1.5 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-3 text-lg',
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className={cn('text-sm font-medium', Typography.fontWeight.medium, Typography.fontSize.sm)}>
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(baseStyles, sizeStyles[size], error && 'border-red-500 focus:ring-red-500/50')}
      />
      {error && (
        <span className={cn('text-xs', Typography.fontSize.xs, 'text-red-500')}>
          {error}
        </span>
      )}
    </div>
  );
};

export default Input;
