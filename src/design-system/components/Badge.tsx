import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  variant?: 'success' | 'error' | 'warning' | 'info' | 'brand' | 'neutral';
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ variant = 'neutral', children, className, size = 'md' }, ref) => {
    const variants = {
      success: 'bg-success/15 text-accent border-success/20',
      error: 'bg-error/15 text-error border-error/20',
      warning: 'bg-warning/15 text-warning border-warning/20',
      info: 'bg-brand/15 text-brand border-brand/20',
      brand: 'bg-brand/10 text-brand/80 border-brand/30',
      neutral: 'bg-white/5 text-muted border-line'
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm'
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium rounded-full border',
          variants[variant],
          sizes[size],
          className
        )}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };