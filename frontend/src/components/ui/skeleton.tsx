'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted/70',
        className
      )}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4 p-4 animate-pulse">
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-4 w-8" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-4 w-8" />
      <Skeleton className="h-4 w-8" />
      <Skeleton className="h-4 w-8" />
      <Skeleton className="h-8 w-8" />
    </div>
  );
}