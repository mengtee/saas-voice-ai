'use client';

import * as React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './sheet';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

interface SidebarAwareSheetProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: string;
  className?: string;
  maxWidth?: string;
}

export function SidebarAwareSheet({
  children,
  open,
  onOpenChange,
  title,
  description,
  className,
  maxWidth = 'sm:max-w-4xl'
}: SidebarAwareSheetProps) {
  const { sidebarOpen } = useAppStore();

  const sheetStyle = React.useMemo(() => ({
    // Position within the main content area, taking up half the width
    // Calculate available content width and position sheet in the right half
    left: sidebarOpen 
      ? `calc(16rem + 1.5rem + (100vw - 16rem - 3rem) / 2)` // sidebar + padding + half of available content width
      : `calc(4rem + 1.5rem + (100vw - 4rem - 3rem) / 2)`, // sidebar + padding + half of available content width
    width: sidebarOpen 
      ? `calc((100vw - 16rem - 3rem) / 2)` // half the available content width
      : `calc((100vw - 4rem - 3rem) / 2)`, // half the available content width
    maxWidth: 'none'
  }), [sidebarOpen]);

  const sheetClassName = React.useMemo(() => cn(
    // Override the default width and positioning
    "w-[90vw] max-w-none p-0", // Remove default padding
    maxWidth,
    // Custom positioning that accounts for sidebar
    className
  ), [maxWidth, className]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className={sheetClassName}
        style={sheetStyle}
      >        
        {(title || description) && (
          <SheetHeader className="px-4 pt-6 pr-12">
            {title && <SheetTitle>{title}</SheetTitle>}
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
        )}
        <div className="px-4 pb-6 flex-1 overflow-y-auto">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}