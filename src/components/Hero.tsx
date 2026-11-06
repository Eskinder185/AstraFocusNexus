import React from 'react';
import { ArrowRight, Star, Zap, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeroProps {
  title: string;
  subtitle?: string;
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
  };
  stats?: Array<{
    value: string | number;
    label: string;
    icon: React.ReactNode;
  }>;
}

const Hero = ({
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  stats,
}: HeroProps) => {
  return (
    <section className="relative py-20 md:py-32">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h1 
          className={cn(
            "text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6",
            "bg-gradient-to-r from-fg via-brand to-purple-300 bg-clip-text text-transparent"
          )}
        >
          {title}
        </h1>
        
        {subtitle && (
          <p 
            className={cn(
              "text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed",
              "mb-10 opacity-90"
            )}
          >
            {subtitle}
          </p>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          {primaryAction && (
            <a 
              href={primaryAction.href}
              onClick={(e) => {
                if (primaryAction.onClick) {
                  e.preventDefault();
                  primaryAction.onClick();
                }
              }}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 font-medium text-bg0 rounded-lg bg-brand hover:bg-brand/90 active:bg-brand/95 transition-colors shadow-lg shadow-brand/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/50"
            >
              {primaryAction.label}
              <ArrowRight className="w-4 h-4" />
            </a>
          )}
          
          {secondaryAction && (
            <a 
              href={secondaryAction.href}
              className="inline-flex items-center justify-center px-8 py-3.5 font-medium text-fg rounded-lg border border-line bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            >
              {secondaryAction.label}
            </a>
          )}
        </div>
        
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="p-4 rounded-lg bg-white/5 border border-line backdrop-blur-sm"
              >
                <div 
                  className="flex items-center gap-3 mb-1.5 text-brand font-semibold"
                >
                  {stat.icon}
                  <span>{stat.value}</span>
                </div>
                <p className="text-sm text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export { Hero };