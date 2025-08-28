'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className={cn(
        "flex flex-1 flex-col overflow-hidden transition-all duration-300",
        sidebarOpen ? "ml-64" : "ml-16"
      )}>
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="container mx-auto p-6 space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}