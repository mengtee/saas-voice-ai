'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { sidebarOpen } = useAppStore();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Handle page transitions
  useEffect(() => {
    if (pathname !== prevPathname) {
      // Start navigation immediately
      setIsNavigating(true);
      setPrevPathname(pathname);
      
      // Use longer delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [pathname, prevPathname]);

  // Prevent layout shift by ensuring minimum height
  useEffect(() => {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.style.minHeight = '100vh';
    }
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className={cn(
        "flex flex-1 flex-col overflow-hidden content-transition",
        sidebarOpen ? "ml-64" : "ml-16"
      )}>
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-muted/30 relative nav-container">
          <div className={cn(
            "container mx-auto p-6 space-y-6 page-container",
            isNavigating ? "opacity-0" : "opacity-100"
          )}>
            {children}
          </div>
          
          {/* Navigation loading overlay */}
          {isNavigating && (
            <div className="absolute inset-0 bg-muted/30 z-10 flex items-center justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Loading...</span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}