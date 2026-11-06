import React from 'react';
import { cn } from '../../lib/utils';
import { Radius, Shadows } from '../tokens';

interface AvatarProps {
  src?: string;
  alt: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  offline?: boolean;
  className?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, fallback, size = 'md', online, offline, className }, ref) => {
    const sizeMap: Record<string, number> = {
      sm: 32,
      md: 40,
      lg: 48,
      xl: 64
    };
    
    const fallbackInitials = fallback?.charAt(0).toUpperCase() || '?';
    const avatarContent = src ? (
      <img 
        src={src} 
        alt={alt} 
        className="w-full h-full object-cover rounded-full"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    ) : (
      <span 
        ref={ref}
        className="text-center font-medium text-bg0/60"
        style={{ fontSize: `${(sizeMap[size] || 40) * 0.5}px` }}
      >
        {fallbackInitials}
      </span>
    );

    return (
      <div
        className={cn(
          'relative inline-flex',
          size === 'xl' && `w-16 h-16`,
          size === 'lg' && `w-12 h-12`,
          size === 'md' && `w-10 h-10`,
          size === 'sm' && `w-8 h-8`,
          className
        )}
      >
        <div 
          className={cn(
            'relative w-full h-full rounded-full bg-bg3 overflow-hidden',
            online && 'ring-2 ring-success/50 shadow-lg',
            offline && 'opacity-75'
          )}
        >
          {avatarContent}
        </div>
        
        {(online || offline) && (
          <span 
            className={cn(
              'absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-bg0',
              online ? 'bg-success' : 'bg-muted'
            )}
            aria-hidden="true"
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export { Avatar };