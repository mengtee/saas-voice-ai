'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { MainLayout } from '@/components/Layout/MainLayout';
import { useAppStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Radio,
  Search,
  Calendar,
  Plus,
  MoreHorizontal,
  Circle,
  Clock,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronDown,
  Phone,
  MessageSquare,
  Mail,
  Send
} from 'lucide-react';
import { CampaignCreator } from '@/components/CampaignCreator';
import { PageTransition } from '@/components/PageTransition';

interface Broadcast {
  id: string;
  type: 'voice_call' | 'sms' | 'whatsapp' | 'email';
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'failed';
  broadcast_time?: string;
  name: string;
  labels?: string[];
  channel: string;
  segment: string;
  recipients: number;
  total_messages: number;
  created_at: string;
}

interface BroadcastFilter {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  active?: boolean;
}

export default function BroadcastsPage() {
  const { setCurrentPage } = useAppStore();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'voice_call' | 'sms' | 'whatsapp' | 'email'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [campaignCreatorOpen, setCampaignCreatorOpen] = useState(false);
  
  const [filters] = useState<BroadcastFilter[]>([
    { id: 'all', name: 'All', icon: Radio, count: 0 },
    { id: 'draft', name: 'Draft', icon: Circle, count: 0 },
    { id: 'scheduled', name: 'Scheduled', icon: Clock, count: 0 },
    { id: 'in_progress', name: 'In Progress', icon: Play, count: 0 },
    { id: 'completed', name: 'Completed', icon: CheckCircle, count: 0 },
    { id: 'failed', name: 'Failed', icon: XCircle, count: 0 }
  ]);

  const typeFilters = [
    { id: 'all', name: 'All Types', icon: Radio },
    { id: 'voice_call', name: 'Voice Calls', icon: Phone },
    { id: 'sms', name: 'SMS', icon: MessageSquare },
    { id: 'whatsapp', name: 'WhatsApp', icon: Send },
    { id: 'email', name: 'Email', icon: Mail }
  ];

  useEffect(() => {
    setCurrentPage('broadcasts');
    fetchBroadcasts();
  }, [setCurrentPage]);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockBroadcasts: Broadcast[] = [
        {
          id: '1',
          type: 'voice_call',
          status: 'scheduled',
          broadcast_time: new Date(Date.now() + 3600000).toISOString(),
          name: 'Customer Outreach Campaign',
          labels: ['sales', 'follow-up'],
          channel: 'Voice Call',
          segment: 'Hot Leads',
          recipients: 150,
          total_messages: 150,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          type: 'email',
          status: 'scheduled',
          broadcast_time: new Date(Date.now() + 86400000).toISOString(),
          name: 'Product Launch Announcement',
          labels: ['marketing', 'launch'],
          channel: 'Email',
          segment: 'Active Customers',
          recipients: 1250,
          total_messages: 1250,
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: '3',
          type: 'email',
          status: 'completed',
          broadcast_time: new Date(Date.now() - 7200000).toISOString(),
          name: 'Weekly Newsletter',
          labels: ['newsletter'],
          channel: 'Email',
          segment: 'All Subscribers',
          recipients: 5200,
          total_messages: 5200,
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '4',
          type: 'sms',
          status: 'in_progress',
          broadcast_time: new Date().toISOString(),
          name: 'Flash Sale Alert',
          labels: ['promotion', 'urgent'],
          channel: 'SMS',
          segment: 'VIP Customers',
          recipients: 890,
          total_messages: 890,
          created_at: new Date(Date.now() - 1800000).toISOString()
        },
        {
          id: '5',
          type: 'voice_call',
          status: 'completed',
          broadcast_time: new Date(Date.now() - 14400000).toISOString(),
          name: 'Appointment Reminders',
          labels: ['reminder', 'appointment'],
          channel: 'Voice Call',
          segment: 'Scheduled Customers',
          recipients: 45,
          total_messages: 45,
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      
      setBroadcasts(mockBroadcasts);
    } catch (error) {
      console.error('Failed to fetch broadcasts:', error);
    } finally {
      setLoading(false);
    }
  };


  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={`text-xs ${colors[status as keyof typeof colors] || colors.draft}`}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const filteredBroadcasts = broadcasts.filter(broadcast => {
    const statusMatch = activeFilter === 'all' || broadcast.status === activeFilter;
    const typeMatch = activeTypeFilter === 'all' || broadcast.type === activeTypeFilter;
    return statusMatch && typeMatch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'voice_call': return <Phone className="h-3 w-3" />;
      case 'sms': return <MessageSquare className="h-3 w-3" />;
      case 'whatsapp': return <Send className="h-3 w-3" />;
      case 'email': return <Mail className="h-3 w-3" />;
      default: return <Radio className="h-3 w-3" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      voice_call: 'bg-blue-100 text-blue-800',
      sms: 'bg-green-100 text-green-800',
      whatsapp: 'bg-emerald-100 text-emerald-800',
      email: 'bg-purple-100 text-purple-800'
    };
    
    return (
      <Badge className={`text-xs ${colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        <span className="flex items-center gap-1">
          {getTypeIcon(type)}
          {type.replace('_', ' ')}
        </span>
      </Badge>
    );
  };

  return (
    <AuthGuard>
      <MainLayout>
        <PageTransition>
        <div className="flex h-[calc(100vh-120px)] gap-6">
          {/* Left Sidebar */}
          <div className="w-64 flex flex-col space-y-4">

            {/* Campaign Type Filters */}
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-2">Campaign Type</h3>
              {typeFilters.map((typeFilter) => {
                const Icon = typeFilter.icon;
                const count = activeTypeFilter === typeFilter.id ? 
                  filteredBroadcasts.length : 
                  broadcasts.filter(b => typeFilter.id === 'all' || b.type === typeFilter.id).length;
                
                return (
                  <button
                    key={typeFilter.id}
                    onClick={() => setActiveTypeFilter(typeFilter.id as any)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left text-sm transition-colors ${
                      activeTypeFilter === typeFilter.id ? 'bg-muted text-foreground font-medium' : 'hover:bg-muted/50'
                    }`}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{typeFilter.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>

            {/* Status Filters */}
            <div className="space-y-1 mt-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-2">Status</h3>
              {filters.map((filter) => {
                const Icon = filter.icon;
                const count = activeFilter === filter.id ? 
                  filteredBroadcasts.length : 
                  broadcasts.filter(b => {
                    const statusMatch = filter.id === 'all' || b.status === filter.id;
                    const typeMatch = activeTypeFilter === 'all' || b.type === activeTypeFilter;
                    return statusMatch && typeMatch;
                  }).length;
                
                return (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left text-sm transition-colors ${
                      activeFilter === filter.id ? 'bg-muted text-foreground font-medium' : 'hover:bg-muted/50'
                    }`}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{filter.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search"
                    className="pl-10 pr-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex bg-muted rounded-md p-0.5">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
                      viewMode === 'table' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
                      viewMode === 'calendar' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                    Calendar
                  </button>
                </div>
                
                <Button size="sm" onClick={() => setCampaignCreatorOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
            </div>

            {/* Broadcast Table */}
            <Card className="flex-1">
              <CardContent className="p-0">
                {filteredBroadcasts.length === 0 ? (
                  <div className="p-12 text-center">
                    <Radio className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No broadcasts found</h3>
                    <p className="text-muted-foreground">Create your first broadcast to get started</p>
                  </div>
                ) : (
                  <>
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
                      <div className="col-span-1">Type</div>
                      <div className="col-span-1">Status</div>
                      <div className="col-span-1">
                        Broadcast Time
                        <ChevronDown className="h-3 w-3 inline ml-1" />
                      </div>
                      <div className="col-span-2">
                        Name
                        <ChevronDown className="h-3 w-3 inline ml-1" />
                      </div>
                      <div className="col-span-2">Labels</div>
                      <div className="col-span-1">Segment</div>
                      <div className="col-span-2">Recipients</div>
                      <div className="col-span-2">Actions</div>
                    </div>
                    
                    {/* Table Body */}
                    <div className="divide-y">
                      {loading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <div key={index} className="grid grid-cols-12 gap-4 p-4 animate-pulse">
                            <div className="col-span-1">
                              <div className="h-6 bg-muted rounded w-16"></div>
                            </div>
                            <div className="col-span-1">
                              <div className="h-6 bg-muted rounded w-16"></div>
                            </div>
                            <div className="col-span-1">
                              <div className="h-4 bg-muted rounded w-8"></div>
                            </div>
                            <div className="col-span-2">
                              <div className="h-4 bg-muted rounded w-24"></div>
                            </div>
                            <div className="col-span-2">
                              <div className="h-6 bg-muted rounded w-16"></div>
                            </div>
                            <div className="col-span-1">
                              <div className="h-4 bg-muted rounded w-8"></div>
                            </div>
                            <div className="col-span-2">
                              <div className="h-4 bg-muted rounded w-8"></div>
                            </div>
                            <div className="col-span-2">
                              <div className="h-8 bg-muted rounded w-8"></div>
                            </div>
                          </div>
                        ))
                      ) : (
                        filteredBroadcasts.map((broadcast) => (
                          <div key={broadcast.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/30 transition-colors">
                            <div className="col-span-1 flex items-center">
                              {getTypeBadge(broadcast.type)}
                            </div>
                            <div className="col-span-1 flex items-center">
                              {getStatusBadge(broadcast.status)}
                            </div>
                            <div className="col-span-1 flex items-center text-muted-foreground text-sm">
                              {broadcast.broadcast_time ? 
                                new Date(broadcast.broadcast_time).toLocaleDateString() : '-'
                              }
                            </div>
                            <div className="col-span-2 flex items-center font-medium">
                              {broadcast.name}
                            </div>
                            <div className="col-span-2 flex items-center">
                              <div className="flex gap-1">
                                {broadcast.labels?.map((label) => (
                                  <Badge key={label} variant="outline" className="text-xs">
                                    {label}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="col-span-1 flex items-center text-muted-foreground text-sm">
                              {broadcast.segment}
                            </div>
                            <div className="col-span-2 flex items-center text-muted-foreground text-sm">
                              {broadcast.recipients.toLocaleString()} recipients
                            </div>
                            <div className="col-span-2 flex items-center gap-2">
                              {broadcast.type === 'voice_call' ? (
                                <Button size="sm" variant="outline">
                                  <Phone className="h-3 w-3 mr-1" />
                                  Monitor
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline">
                                  View Details
                                </Button>
                              )}
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
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
        
        <CampaignCreator 
          isOpen={campaignCreatorOpen}
          onOpenChange={setCampaignCreatorOpen}
          onCampaignCreated={() => {
            fetchBroadcasts(); // Refresh the list
          }}
        />
        </PageTransition>
      </MainLayout>
    </AuthGuard>
  );
}
