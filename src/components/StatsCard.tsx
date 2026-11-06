import React from 'react';
import { ArrowUpRight, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatsCardProps {
  title: string;
  value?: string | number;
  change?: number; // percentage
  isPositive?: boolean;
  icon?: React.ReactNode;
  description?: string;
}

const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ title, value, change, isPositive = true, icon, description }, ref) => {
    const ChangeIndicator = () => (
      <span 
        className={cn(
          "inline-flex items-center gap-0.5 text-xs font-medium",
          change !== undefined && `(${change}%)`,
          change !== undefined && (isPositive ? 'text-success' : 'text-error')
        )}
      >
        {change !== undefined && isPositive ? (
          <svg className="w-3.5 h-3.5 flex-shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 flex-shrink-0 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        )}
        {change !== undefined && (isPositive ? '+': '-')}
      </span>
    );

    return (
      <div 
        ref={ref}
        className="relative group"
      >
        {/* Glow effect on hover */}
        <div 
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(0, 229, 255, 0.1), transparent 70%)'
          }}
        />
        
        <div className="relative p-6 rounded-lg bg-bg2 border border-line hover:border-brand/40 transition-colors duration-300 h-full">
          {icon && (
            <div className="mb-4 text-brand opacity-80">
              {icon}
            </div>
          )}
          
          {(value !== undefined || change !== undefined) && (
            <div className="text-center mb-3">
              <span 
                className={cn(
                  "text-3xl md:text-4xl font-bold bg-gradient-to-br from-fg to-brand bg-clip-text text-transparent",
                  "group-hover:to-purple-300 transition-all duration-300"
                )}
              >
                {value}
              </span>
              {(change !== undefined) && <ChangeIndicator />}
            </div>
          )}
          
          <h3 
            className={cn(
              "text-center font-semibold mb-1.5",
              value ? 'text-base' : 'text-lg'
            )}
          >
            {title}
          </h3>
          
          {description && (
            <p 
              className={cn(
                "text-center text-sm text-muted leading-relaxed",
                description
              )}
            />
          )}
        </div>
      </div>
    );
  }
);

StatsCard.displayName = 'StatsCard';

export { StatsCard };