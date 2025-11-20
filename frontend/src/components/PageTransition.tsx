'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [displayChildren, setDisplayChildren] = useState(children);
  const prevPathname = useRef(pathname);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // If pathname changed, start transition
    if (pathname !== prevPathname.current) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Start fade out
      setIsVisible(false);
      
      // After fade out completes, update children and fade in
      timeoutRef.current = setTimeout(() => {
        setDisplayChildren(children);
        prevPathname.current = pathname;
        
        // Small delay before fade in to prevent flash
        timeoutRef.current = setTimeout(() => {
          setIsVisible(true);
        }, 50);
      }, 150); // Match CSS transition duration
    } else {
      // Same pathname, just update children
      setDisplayChildren(children);
      setIsVisible(true);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [children, pathname]);

  return (
    <div 
      className={cn(
        'transition-opacity duration-150 ease-in-out',
        isVisible ? 'opacity-100' : 'opacity-0',
        className
      )}
      style={{
        minHeight: 'calc(100vh - 120px)', // Prevent layout shift
      }}
    >
      {displayChildren}
    </div>
  );
}