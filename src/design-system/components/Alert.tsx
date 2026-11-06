import React from 'react';
import { cn } from '../../lib/utils';

interface AlertProps {
  variant?: 'success' | 'error' | 'warning' | 'info';
  icon?: React.ReactNode;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
}

const AlertIcon = {
  success: (
    <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.268 12c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'info', icon, onClose, children, className }, ref) => {
    const variantStyles = {
      success: 'border-success/20 bg-success/10 text-fg',
      error: 'border-error/20 bg-error/10 text-fg',
      warning: 'border-warning/20 bg-warning/10 text-fg',
      info: 'border-brand/20 bg-brand/10 text-fg'
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'rounded-lg border p-4 flex items-start gap-3 relative',
          variantStyles[variant],
          className
        )}
      >
        {icon && <span className="mt-0.5 flex-shrink-0">{icon}</span>}
        <div className="flex-1">
          {children}
        </div>
        
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-fg transition-colors p-1 rounded-full hover:bg-white/5"
            aria-label="Close alert"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export { Alert };