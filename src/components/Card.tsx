import React from 'react';
import { cn } from '../lib/utils';
import { DesignTokens, Typography } from '../design-system/tokens';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outline';
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className,
  variant = 'default',
}) => {
  const baseStyles = cn(
    'relative overflow-hidden rounded-xl border border-white/10 bg-bg2 p-6',
    'transition-all duration-200',
    variant === 'elevated' && 'shadow-lg border-white/20',
    variant === 'outline' && 'bg-transparent border-white/5',
    className,
  );

  return (
    <div className={baseStyles}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className={cn(
              'text-xl font-bold mb-1',
              Typography.fontSize['xl']
            )}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className={cn(
              'text-sm opacity-70',
              Typography.fontSize['sm']
            )}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};