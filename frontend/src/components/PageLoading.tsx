'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PageLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  minHeight?: string;
  skeletonCount?: number;
}

export function PageLoading({ 
  loading, 
  children, 
  minHeight = 'min-h-[400px]',
  skeletonCount = 6 
}: PageLoadingProps) {
  const [showContent, setShowContent] = useState(!loading);

  useEffect(() => {
    if (!loading) {
      // Small delay to allow smooth transition
      const timer = setTimeout(() => setShowContent(true), 50);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className={cn('animate-fade-in', minHeight)}>
        <PageSkeleton count={skeletonCount} />
      </div>
    );
  }

  return (
    <div className={cn(
      'transition-opacity duration-300',
      showContent ? 'opacity-100 animate-fade-in' : 'opacity-0'
    )}>
      {children}
    </div>
  );
}

function PageSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}