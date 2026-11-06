import React from 'react';
import { cn } from '../../lib/utils';
import { DesignTokens, Radius, Transitions } from '../tokens';

/**
 * Button component with multiple variants
 * @param variant - 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
 * @param size - 'sm' | 'md' | 'lg'
 * @param fullWidth - When true, button takes full width
 */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    fullWidth = false, 
    isLoading = false,
    className,
    children,
    disabled,
    ...props 
  }, ref) => {
    
    const baseStyles = `inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-50 disabled:pointer-events-none ${Transitions.default}`;
    
    // Size variants
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5'
    };
    
    // Variant styling with hover effects
    const variantStyles = {
      primary: `
        bg-brand text-bg0 
        hover:bg-brand/85 
        active:bg-brand/90
        shadow-sm
        border-transparent
      `,
      secondary: `
        bg-white/10 text-fg
        hover:bg-white/15 
        active:bg-white/20
        border border-line
      `,
      ghost: `
        bg-transparent text-fg
        hover:bg-white/5 
        active:bg-white/8
        border-transparent
      `,
      danger: `
        bg-error text-bg0
        hover:bg-error/85
        active:bg-error/90
        shadow-sm
        border-transparent
      `,
      outline: `
        bg-transparent border border-line text-fg
        hover:border-brand/50 hover:text-brand
        active:border-brand/70
      `
    };
    
    const buttonSize = sizeStyles[size] || sizeStyles.md;
    const buttonVariant = variantStyles[variant] || variantStyles.primary;
    
    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          buttonSize,
          buttonVariant,
          fullWidth && 'w-full',
          isLoading && 'opacity-80 cursor-wait',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
