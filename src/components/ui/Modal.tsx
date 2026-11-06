import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { DesignTokens, Typography } from '../../design-system/tokens';


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className={cn(
          'bg-bg2 border border-white/10 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative',
          className
        )}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted hover:text-fg"
        >
          ✕
        </button>
        {title && (
          <h2 className={cn('text-xl font-bold mb-4', Typography.fontSize['xl'])}>
            {title}
          </h2>
        )}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
