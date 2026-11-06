import React from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface FeatureCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  delay?: number;
}

const FeatureCard = React.forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ title, description, icon, delay = 0 }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(
          "relative group p-8 rounded-xl bg-bg2 border border-line hover:border-brand/40 transition-all duration-300",
          "hover:translate-y-[-4px] hover:shadow-lg hover:shadow-brand/5 cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-brand/50"
        )}
        style={{ 
          transitionDelay: `${delay}ms`
        }}
      >
        {/* Hover glow effect */}
        <div 
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(0, 229, 255, 0.1), transparent 70%)'
          }}
        />
        
        <div className="relative z-10">
          {icon ? (
            <div 
              className={cn(
                "mb-4 w-12 h-12 rounded-lg flex items-center justify-center",
                "bg-brand/10 text-brand group-hover:bg-brand/20 transition-colors"
              )}
            >
              {icon}
            </div>
          ) : (
            <div 
              className="mb-4 w-12 h-12 rounded-lg flex items-center justify-center bg-brand/10 text-brand"
            >
              <Sparkles className="w-6 h-6" />
            </div>
          )}
          
          <h3 
            className={cn(
              "text-xl font-semibold mb-2.5",
              "bg-gradient-to-r from-fg to-brand bg-clip-text text-transparent group-hover:to-purple-300 transition-all duration-300"
            )}
          >
            {title}
          </h3>
          
          <p 
            className={cn(
              "text-base text-muted leading-relaxed",
              "group-hover:text-fg/95 transition-colors duration-300"
            )}
          >
            {description}
          </p>
          
          <div 
            className={cn(
              "mt-4 inline-flex items-center gap-1.5 text-sm font-medium",
              "text-brand group-hover:gap-2 transition-all duration-300"
            )}
          >
            Learn more
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }
);

FeatureCard.displayName = 'FeatureCard';

export { FeatureCard };