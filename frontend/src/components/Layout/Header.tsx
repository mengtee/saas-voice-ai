'use client';

import Image from 'next/image';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Bell, Search, LogOut, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/services/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, currentPage, setUser } = useAppStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint
      await apiClient.logout();
      
      // Clear local storage and state
      localStorage.removeItem('auth_token');
      setUser(null);
      
      // Redirect to login page
      router.push('/login');
    } catch {
      // Even if backend fails, clear local auth
      localStorage.removeItem('auth_token');
      setUser(null);
      router.push('/login');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return 'Dashboard';
      case 'contacts':
        return 'Contacts';
      case 'agents':
        return 'AI Agents';
      case 'broadcasts':
        return 'Broadcasts';
      case 'leads':
        return 'Lead Management';
      case 'calls':
        return 'Call Center';
      case 'calendar':
        return 'Appointments';
      case 'analytics':
        return 'Analytics';
      case 'whatsapp':
        return 'WhatsApp Follow-ups';
      case 'channels':
        return 'Channels';
      case 'integrations':
        return 'Integrations';
      case 'settings':
        return 'Settings';
      default:
        return 'Customer Service';
    }
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">{getPageTitle()}</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9"
            />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-auto p-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {user?.avatar_url ? (
                    <Image 
                      src={user.avatar_url} 
                      alt={user.name} 
                      width={32} 
                      height={32} 
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-primary">
                      {getInitials(user?.name)}
                    </span>
                  )}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.role || 'Agent'}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
