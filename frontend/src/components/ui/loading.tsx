'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function Loading({ size = 'md', className, text }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses[size])} />
      {text && <span className="ml-2 text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

export function LoadingOverlay({ children, loading, text }: { 
  children: React.ReactNode; 
  loading: boolean; 
  text?: string;
}) {
  return (
    <div className="relative">
      {children}
      {loading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-md">
          <Loading text={text} />
        </div>
      )}
    </div>
  );
}

interface ButtonLoadingProps {
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ButtonLoading({ loading, children, className }: ButtonLoadingProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </div>
  );
}