import React from 'react';
import { cn } from '../../lib/utils';
import { DesignTokens, Radius, Shadows } from '../tokens';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  titleClassName?: string;
  description?: string;
  descriptionClassName?: string;
  hover?: boolean; // Enable lift animation on hover
  interactive?: boolean; // Make entire card clickable
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  className,
  title,
  titleClassName,
  description,
  descriptionClassName,
  hover = false,
  interactive = false,
  onClick,
}) => {
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-bg2 overflow-hidden',
        hover && 'transition-transform duration-200 hover:translate-y-[-2px]',
        interactive && 'cursor-pointer active:translate-y-[1px]',
        onClick && 'focus-within:outline-none focus-within:ring-2 focus-within:ring-brand/50',
        className
      )}
      onClick={interactive ? onClick : undefined}
      role="article"
    >
      {(title || description) && (
        <div className="p-6">
          {title && (
            <h3 
              className={cn(
                'text-lg font-semibold mb-2 flex items-center gap-2',
                titleClassName
              )}
            >
              {title}
            </h3>
          )}
          {description && (
            <p 
              className={cn(
                'text-fg-muted text-sm opacity-80 leading-relaxed',
                descriptionClassName
              )}
            >
              {description}
            </p>
          )}
        </div>
      )}
      
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export { Card };