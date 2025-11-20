'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { MainLayout } from '@/components/Layout/MainLayout';
import { useAppStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Users, 
  Search, 
  Filter,
  MoreHorizontal,
  ChevronDown,
  Upload,
  UserPlus,
  Flame,
  DollarSign,
  UserCheck,
  Circle,
  Download
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { ApiResponse, PaginatedResponse } from '@/types';
import { LeadUpload } from '@/components/LeadUpload';
import { SidebarAwareSheet } from '@/components/ui/sidebar-aware-sheet';
import { AddLead } from '@/components/AddLead';

interface ContactStats {
  totalContacts: number;
  newThisWeek: number;
  conversionRate: number;
}

interface BackendContact {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  purpose?: string;
  status: 'pending' | 'called' | 'scheduled' | 'completed' | 'failed';
  notes?: string;
  created_at: string;
  updated_at: string;
  country?: string;
  language?: string;
  tags?: string[];
  lifecycle_stage?: 'new_lead' | 'hot_lead' | 'payment' | 'customer' | 'cold_lead';
  channel?: string[];
}

interface ContactSegment {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  color?: string;
}


export default function ContactsPage() {
  const { setCurrentPage } = useAppStore();
  const [contacts, setContacts] = useState<BackendContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<BackendContact[]>([]);
  const [stats, setStats] = useState<ContactStats>({
    totalContacts: 0,
    newThisWeek: 0,
    conversionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [segments] = useState<ContactSegment[]>([
    { id: 'all', name: 'All', icon: Users, count: 0 },
    { id: 'new_lead', name: 'New Lead', icon: Circle, count: 0, color: 'text-blue-600' },
    { id: 'hot_lead', name: 'Hot Lead', icon: Flame, count: 0, color: 'text-red-600' },
    { id: 'payment', name: 'Payment', icon: DollarSign, count: 0, color: 'text-green-600' },
    { id: 'customer', name: 'Customer', icon: UserCheck, count: 0, color: 'text-purple-600' },
    { id: 'cold_lead', name: 'Cold Lead', icon: Circle, count: 0, color: 'text-gray-500' }
  ]);

  useEffect(() => {
    setCurrentPage('contacts');
    fetchContactsData();
  }, [setCurrentPage]);

  const fetchContactsData = async () => {
    try {
      setLoading(true);
      
      const [contactsResponse, statsResponse] = await Promise.all([
        apiClient.getLeads(1, 100) as unknown as ApiResponse<PaginatedResponse<BackendContact>>,
        apiClient.getLeadStats()
      ]);
      
      if (contactsResponse && contactsResponse.data) {
        const paginatedData = contactsResponse.data;
        let backendContacts = paginatedData.items || [];
        
        // Add mock data for demo purposes
        backendContacts = backendContacts.map((contact, index) => ({
          ...contact,
          lifecycle_stage: ['new_lead', 'hot_lead', 'payment', 'customer', 'cold_lead'][index % 5] as any,
          country: ['US', 'UK', 'CA', 'AU', 'DE'][index % 5],
          language: ['English', 'Spanish', 'French', 'German'][index % 4],
          tags: [['VIP'], ['Urgent'], ['Follow-up'], ['Premium'], []][index % 5],
          channel: [['Phone'], ['Email'], ['WhatsApp'], ['SMS']][index % 4]
        }));
        
        setContacts(backendContacts);
      }
      
      if (statsResponse.success && statsResponse.data) {
        setStats({
          totalContacts: statsResponse.data.totalLeads,
          newThisWeek: statsResponse.data.newThisWeek,
          conversionRate: statsResponse.data.conversionRate
        });
      }
    } catch (error) {
      console.error('Failed to fetch contacts data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter contacts based on segment and search
  useEffect(() => {
    let filtered = contacts;
    
    // Filter by segment
    if (selectedSegment !== 'all') {
      filtered = filtered.filter(contact => contact.lifecycle_stage === selectedSegment);
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone_number.includes(searchQuery)
      );
    }
    
    setFilteredContacts(filtered);
  }, [contacts, selectedSegment, searchQuery]);

  const getLifecycleColor = (stage?: string) => {
    switch (stage) {
      case 'new_lead': return 'bg-blue-100 text-blue-800';
      case 'hot_lead': return 'bg-red-100 text-red-800';
      case 'payment': return 'bg-green-100 text-green-800';
      case 'customer': return 'bg-purple-100 text-purple-800';
      case 'cold_lead': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };


  return (
    <AuthGuard>
      <MainLayout>
        <div className="flex h-[calc(100vh-120px)] gap-6">
          {/* Left Sidebar */}
          <div className="w-64 flex flex-col space-y-4">
            {/* Create AI Agent */}
            <Button variant="outline" className="justify-start text-sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Create AI Agent
              <Badge variant="secondary" className="ml-auto text-xs">Beta</Badge>
            </Button>

            {/* Lifecycle Stages */}
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Lifecycle</h3>
                <Button variant="ghost" size="sm">
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Lifecycle Stages</h4>
                {segments.map((segment) => {
                  const Icon = segment.icon;
                  const contactCount = selectedSegment === segment.id ? 
                    filteredContacts.length : 
                    contacts.filter(c => segment.id === 'all' || c.lifecycle_stage === segment.id).length;
                  
                  return (
                    <button
                      key={segment.id}
                      onClick={() => setSelectedSegment(segment.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg text-left text-sm transition-colors ${
                        selectedSegment === segment.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${segment.color || 'text-muted-foreground'}`} />
                      <span className="flex-1">{segment.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {contactCount}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Segments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Segments</h3>
                <Button variant="ghost" size="sm">
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Contacts created &lt;7 days</p>
                <p className="text-muted-foreground">Contacts inactive &gt;30 days</p>
                <p className="text-muted-foreground">Contacts with tags</p>
                <p className="text-muted-foreground">Country known</p>
                <p className="text-muted-foreground">Language known</p>
              </div>
              
              <Button variant="ghost" className="w-full justify-start text-sm text-muted-foreground">
                Blocked Contacts
              </Button>
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
                    placeholder="Search Contacts"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button size="sm" onClick={() => setAddContactOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add contact
                </Button>
                <Button variant="outline" size="sm">
                  Add segment
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Contact Table */}
            <Card className="flex-1">
              <CardContent className="p-0">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
                  <div className="col-span-1">
                    <input type="checkbox" className="rounded" />
                  </div>
                  <div className="col-span-2">Name</div>
                  <div className="col-span-2">Channel(s)</div>
                  <div className="col-span-1">Lifecycle</div>
                  <div className="col-span-2">Email</div>
                  <div className="col-span-1">Phone</div>
                  <div className="col-span-1">Tags</div>
                  <div className="col-span-1">Country</div>
                  <div className="col-span-1">Language</div>
                </div>
                
                {/* Table Body */}
                <div className="divide-y">
                  {loading ? (
                    Array.from({ length: 10 }).map((_, index) => (
                      <div key={index} className="grid grid-cols-12 gap-4 p-4 animate-pulse">
                        <div className="col-span-1">
                          <div className="h-4 w-4 bg-muted rounded"></div>
                        </div>
                        <div className="col-span-2">
                          <div className="h-4 bg-muted rounded w-24"></div>
                        </div>
                        <div className="col-span-2">
                          <div className="h-4 bg-muted rounded w-16"></div>
                        </div>
                        <div className="col-span-1">
                          <div className="h-6 bg-muted rounded w-20"></div>
                        </div>
                        <div className="col-span-2">
                          <div className="h-4 bg-muted rounded w-32"></div>
                        </div>
                        <div className="col-span-1">
                          <div className="h-4 bg-muted rounded w-24"></div>
                        </div>
                        <div className="col-span-1">
                          <div className="h-6 bg-muted rounded w-16"></div>
                        </div>
                        <div className="col-span-1">
                          <div className="h-4 bg-muted rounded w-8"></div>
                        </div>
                        <div className="col-span-1">
                          <div className="h-4 bg-muted rounded w-16"></div>
                        </div>
                      </div>
                    ))
                  ) : filteredContacts.length > 0 ? (
                    filteredContacts.map((contact) => (
                      <div key={contact.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/30 transition-colors">
                        <div className="col-span-1 flex items-center">
                          <input type="checkbox" className="rounded" />
                        </div>
                        <div className="col-span-2 font-medium">
                          {contact.name}
                        </div>
                        <div className="col-span-2">
                          <div className="flex gap-1">
                            {contact.channel?.map((ch) => (
                              <Badge key={ch} variant="outline" className="text-xs">
                                {ch}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="col-span-1">
                          <Badge className={`text-xs ${getLifecycleColor(contact.lifecycle_stage)}`}>
                            {contact.lifecycle_stage?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="col-span-2 text-muted-foreground">
                          {contact.email || '-'}
                        </div>
                        <div className="col-span-1 text-muted-foreground">
                          {contact.phone_number}
                        </div>
                        <div className="col-span-1">
                          <div className="flex gap-1">
                            {contact.tags?.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="col-span-1 text-muted-foreground">
                          {contact.country || '-'}
                        </div>
                        <div className="col-span-1 text-muted-foreground">
                          {contact.language || '-'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Available Data</h3>
                      <p className="text-muted-foreground">No contacts match your current filters</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Contact Modal */}
        <SidebarAwareSheet
          open={addContactOpen}
          onOpenChange={setAddContactOpen}
          title="Add New Contact"
          description="Enter contact information to add them to your database"
          maxWidth="max-w-2xl"
        >
          <AddLead 
            onSuccess={() => {
              fetchContactsData();
              setAddContactOpen(false);
            }}
            onCancel={() => setAddContactOpen(false)}
          />
        </SidebarAwareSheet>

        {/* Upload Modal */}
        <SidebarAwareSheet
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          title="Import Contacts"
          description="Upload contacts from CSV or Excel files"
          maxWidth="max-w-xl"
        >
          <LeadUpload 
            onSuccess={() => {
              fetchContactsData();
              setUploadOpen(false);
            }}
          />
        </SidebarAwareSheet>
      </MainLayout>
    </AuthGuard>
  );
}
