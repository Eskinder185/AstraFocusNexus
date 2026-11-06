import React from 'react';
import { cn } from '../lib/utils';
import { DesignTokens, Typography } from '../design-system/tokens';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled,
  className,
}) => {
  const baseStyles = cn(
    'inline-flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer whitespace-nowrap px-5 py-2.5 font-semibold text-base',
    'active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
    variant === 'primary' && 'bg-gradient-to-br from-brand to-brand2 text-white shadow-[0_0_10px_rgba(0,229,255,0.3)]',
    variant === 'secondary' && 'bg-bg2 text-fg border border-white/10',
    variant === 'outline' && 'bg-transparent text-fg border border-white/20',
    variant === 'ghost' && 'bg-transparent text-fg p-1',
    variant === 'danger' && 'bg-red-900/20 text-red-500 border border-red-900/30',
  );

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(baseStyles, sizeStyles[size], className)}
    >
      {children}
    </button>
  );
};