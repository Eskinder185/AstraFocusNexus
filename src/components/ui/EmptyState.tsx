import React from 'react';
import { cn } from '../../lib/utils';
import { DesignTokens, Typography } from '../../design-system/tokens';


interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  className,
  onAction,
  actionLabel = 'Get Started',
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-12 text-center', className)}>
      {icon && (
        <div className="mb-4 text-5xl">
          {icon}
        </div>
      )}
      {title && (
        <h3 className={cn('text-2xl font-bold mb-2', Typography.fontSize['2xl'])}>
          {title}
        </h3>
      )}
      {description && (
        <p className={cn('text-muted mb-6 max-w-md', Typography.fontSize.base)}>
          {description}
        </p>
      )}
      {onAction && (
        <button
          onClick={onAction}
          className={cn('px-6 py-2 rounded-md bg-brand text-white hover:bg-brand/80 transition-colors')}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
