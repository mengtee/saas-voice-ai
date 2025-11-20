'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { MainLayout } from '@/components/Layout/MainLayout';
import { useAppStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Mail, 
  Phone,
  Users,
  Filter,
  Search,
  Settings,
  Plus,
  ChevronDown,
  Circle,
  Flame,
  DollarSign,
  UserCheck,
  PhoneCall
} from 'lucide-react';

interface InboxMessage {
  id: string;
  contact_id: string;
  contact_name: string;
  message: string;
  type: 'sms' | 'email' | 'whatsapp' | 'call';
  timestamp: string;
  read: boolean;
  priority?: 'high' | 'medium' | 'low';
  status?: 'new' | 'replied' | 'closed';
}

interface InboxFilter {
  label: string;
  count: number;
  active: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function InboxPage() {
  const { setCurrentPage } = useAppStore();
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('chats');
  const [filters, setFilters] = useState<InboxFilter[]>([
    { label: 'All', count: 0, active: true, icon: Users },
    { label: 'Mine', count: 0, active: false, icon: UserCheck },
    { label: 'Unassigned', count: 0, active: false, icon: Circle },
    { label: 'Incoming Calls', count: 0, active: false, icon: Phone }
  ]);

  useEffect(() => {
    setCurrentPage('inbox');
    fetchInboxData();
  }, [setCurrentPage]);

  const fetchInboxData = async () => {
    try {
      setLoading(true);
      // Mock inbox data for now - replace with actual API call
      const mockInboxMessages: InboxMessage[] = [
        {
          id: '1',
          contact_id: 'contact1',
          contact_name: 'John Doe',
          message: 'Hi, I\'m interested in your services. Can we schedule a call?',
          type: 'whatsapp',
          timestamp: new Date().toISOString(),
          read: false,
          priority: 'high',
          status: 'new'
        },
        {
          id: '2',
          contact_id: 'contact2',
          contact_name: 'Jane Smith',
          message: 'Thank you for reaching out. I have some questions about pricing.',
          type: 'sms',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: true,
          priority: 'medium',
          status: 'replied'
        },
        {
          id: '3',
          contact_id: 'contact3',
          contact_name: 'Mike Johnson',
          message: 'Could you send me more information about your product features?',
          type: 'email',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          read: false,
          priority: 'medium',
          status: 'new'
        },
        {
          id: '4',
          contact_id: 'contact4',
          contact_name: 'Sarah Wilson',
          message: 'Missed call - interested in premium package',
          type: 'call',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          read: false,
          priority: 'high',
          status: 'new'
        },
        {
          id: '5',
          contact_id: 'contact5',
          contact_name: 'David Brown',
          message: 'Thanks for the detailed proposal. I need some time to review it.',
          type: 'email',
          timestamp: new Date(Date.now() - 14400000).toISOString(),
          read: true,
          priority: 'low',
          status: 'replied'
        }
      ];
      setInboxMessages(mockInboxMessages);
      
      // Update filter counts
      const totalMessages = mockInboxMessages.length;
      const unreadMessages = mockInboxMessages.filter(msg => !msg.read).length;
      const callMessages = mockInboxMessages.filter(msg => msg.type === 'call').length;
      
      setFilters(prev => prev.map(filter => ({
        ...filter,
        count: filter.label === 'All' ? totalMessages :
               filter.label === 'Mine' ? unreadMessages :
               filter.label === 'Unassigned' ? 3 :
               filter.label === 'Incoming Calls' ? callMessages : 0,
        active: filter.label.toLowerCase() === activeFilter
      })));
    } catch (error) {
      console.error('Failed to fetch inbox data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'sms':
        return <MessageCircle className="h-4 w-4 text-blue-600" />;
      case 'email':
        return <Mail className="h-4 w-4 text-purple-600" />;
      case 'whatsapp':
        return <MessageCircle className="h-4 w-4 text-green-600" />;
      case 'call':
        return <PhoneCall className="h-4 w-4 text-orange-600" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'high':
        return <Flame className="h-3 w-3 text-red-500" />;
      case 'medium':
        return <Circle className="h-3 w-3 text-yellow-500" />;
      case 'low':
        return <Circle className="h-3 w-3 text-green-500" />;
      default:
        return null;
    }
  };

  const markAsRead = (messageId: string) => {
    setInboxMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, read: true } : msg
      )
    );
  };

  const filteredMessages = inboxMessages.filter(msg => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'mine') return !msg.read;
    if (activeFilter === 'unassigned') return msg.status === 'new';
    if (activeFilter === 'incoming calls') return msg.type === 'call';
    return true;
  });

  return (
    <AuthGuard>
      <MainLayout>
        <div className="flex h-[calc(100vh-120px)] gap-6">
          {/* Left Sidebar */}
          <div className="w-64 flex flex-col space-y-4">
            {/* Header with Search */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Inbox</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  <Search className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-muted rounded-sm p-0.5">
              <button
                onClick={() => setActiveTab('chats')}
                className={`flex-1 flex items-center justify-center gap-0.5 px-1.5 py-1 text-[10px] font-medium rounded-sm transition-colors ${
                  activeTab === 'chats' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageCircle className="h-2.5 w-2.5" />
                Chats
              </button>
              <button
                onClick={() => setActiveTab('calls')}
                className={`flex-1 flex items-center justify-center gap-0.5 px-1.5 py-1 text-[10px] font-medium rounded-sm transition-colors ${
                  activeTab === 'calls' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Phone className="h-2.5 w-2.5" />
                Calls
              </button>
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" className="justify-start h-auto p-2 text-sm">
                <ChevronDown className="h-4 w-4 mr-2" />
                Open, Newest
              </Button>
              <div className="flex items-center gap-2">
                <Circle className="h-3 w-3" />
                <span className="text-xs text-muted-foreground">Unreplied</span>
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-1">
              {filters.map((filter) => {
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.label}
                    onClick={() => setActiveFilter(filter.label.toLowerCase())}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left text-sm transition-colors ${
                      activeFilter === filter.label.toLowerCase() ? 'bg-muted text-foreground font-medium' : 'hover:bg-muted/50'
                    }`}
                  >
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    <span className="flex-1">{filter.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {filter.count}
                    </Badge>
                  </button>
                );
              })}
            </div>

            {/* Lifecycle Section */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Lifecycle</h3>
                <Button variant="ghost" size="sm">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="space-y-1">
                {[
                  { label: 'New Lead', icon: Circle, color: 'text-blue-600' },
                  { label: 'Hot Lead', icon: Flame, color: 'text-red-600' },
                  { label: 'Payment', icon: DollarSign, color: 'text-green-600' },
                  { label: 'Customer', icon: UserCheck, color: 'text-purple-600' }
                ].map((item) => (
                  <button
                    key={item.label}
                    className="w-full flex items-center gap-3 p-2 rounded-lg text-left text-sm hover:bg-muted/50 transition-colors"
                  >
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    <span className="flex-1">{item.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {item.label === 'New Lead' ? 1 : item.label === 'Hot Lead' ? 2 : 0}
                    </Badge>
                  </button>
                ))}
              </div>

              <div className="pt-2 text-center">
                <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto">
                  <Plus className="h-3 w-3" />
                  No inboxes created
                </button>
                <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto mt-1">
                  <Plus className="h-3 w-3" />
                  Custom Inbox
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Message Table */}
            <Card className="flex-1">
              <CardContent className="p-0">
                {filteredMessages.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="mx-auto w-48 h-36 bg-muted rounded-lg flex items-center justify-center mb-6">
                      <MessageCircle className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">You Have No Channels Connected</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      You can connect all your business messaging accounts in one place. 
                      We call these accounts channels. Let's connect a channel.
                    </p>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Connect Channel
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
                      <div className="col-span-1">
                        <input type="checkbox" className="rounded" />
                      </div>
                      <div className="col-span-3">Contact</div>
                      <div className="col-span-4">Message</div>
                      <div className="col-span-1">Type</div>
                      <div className="col-span-1">Priority</div>
                      <div className="col-span-1">Status</div>
                      <div className="col-span-1">Time</div>
                    </div>
                    
                    {/* Table Body */}
                    <div className="divide-y">
                      {loading ? (
                        Array.from({ length: 8 }).map((_, index) => (
                          <div key={index} className="grid grid-cols-12 gap-4 p-4 animate-pulse">
                            <div className="col-span-1">
                              <div className="h-4 w-4 bg-muted rounded"></div>
                            </div>
                            <div className="col-span-3">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-muted rounded-full"></div>
                                <div className="h-4 bg-muted rounded w-24"></div>
                              </div>
                            </div>
                            <div className="col-span-4">
                              <div className="h-4 bg-muted rounded w-full"></div>
                            </div>
                            <div className="col-span-1">
                              <div className="h-6 bg-muted rounded w-12"></div>
                            </div>
                            <div className="col-span-1">
                              <div className="h-4 bg-muted rounded w-8"></div>
                            </div>
                            <div className="col-span-1">
                              <div className="h-6 bg-muted rounded w-12"></div>
                            </div>
                            <div className="col-span-1">
                              <div className="h-4 bg-muted rounded w-16"></div>
                            </div>
                          </div>
                        ))
                      ) : (
                        filteredMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`grid grid-cols-12 gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer ${
                              !message.read ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                            }`}
                          >
                            <div className="col-span-1 flex items-center">
                              <input type="checkbox" className="rounded" />
                            </div>
                            <div className="col-span-3 flex items-center gap-3">
                              <div className="relative">
                                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium">
                                    {message.contact_name.split(' ').map(n => n[0]).join('')}
                                  </span>
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5">
                                  {getMessageIcon(message.type)}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{message.contact_name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {message.contact_id}
                                </div>
                              </div>
                            </div>
                            <div className="col-span-4 flex items-center">
                              <p className="text-sm text-muted-foreground line-clamp-2 leading-5">
                                {message.message}
                              </p>
                            </div>
                            <div className="col-span-1 flex items-center">
                              <Badge variant="outline" className="text-xs">
                                {message.type.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="col-span-1 flex items-center">
                              {getPriorityIcon(message.priority)}
                            </div>
                            <div className="col-span-1 flex items-center">
                              {!message.read ? (
                                <Badge variant="destructive" className="text-xs px-2 py-0">
                                  New
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs px-2 py-0">
                                  Read
                                </Badge>
                              )}
                            </div>
                            <div className="col-span-1 flex items-center">
                              <span className="text-xs text-muted-foreground">
                                {new Date(message.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}