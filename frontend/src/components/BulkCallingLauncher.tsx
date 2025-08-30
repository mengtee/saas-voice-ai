'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { SidebarAwareSheet } from '@/components/ui/sidebar-aware-sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Phone, 
  Users, 
  Search, 
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Rocket
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { BatchCalling } from './BatchCalling';

interface BackendLead {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  purpose?: string;
  status: 'pending' | 'called' | 'scheduled' | 'completed' | 'failed';
  notes?: string;
  created_at: string;
}

// Interface for the actual API response (snake_case from database)
interface ApiLead {
  id: string;
  tenant_id: string;
  assigned_user_id?: string;
  date: string;
  name: string;
  phone_number: string;
  email?: string;
  purpose?: string;
  status: 'pending' | 'called' | 'scheduled' | 'completed' | 'failed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface BulkCallingLauncherProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkCallingLauncher({ isOpen, onOpenChange }: BulkCallingLauncherProps) {
  const [leads, setLeads] = useState<BackendLead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [showCampaignCreation, setShowCampaignCreation] = useState(false);

  // Debounce search to avoid too many API calls
  useEffect(() => {
    if (!isOpen) return;
    
    const debounceTimer = setTimeout(() => {
      fetchLeads(searchTerm, statusFilter);
    }, searchTerm === '' && statusFilter === 'all' ? 0 : 300); // No debounce for initial load

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, statusFilter, isOpen]);

  const fetchLeads = async (search = '', status = 'all') => {
    try {
      setLoading(true);
      const response = await apiClient.getLeads(1, 100, search, status === 'all' ? '' : status);

      if (response.success && response.data) {
        const apiLeads = response.data.items || [];
        const backendLeads = Array.isArray(apiLeads) ? apiLeads
          .filter(lead => {
            const apiLead = lead as unknown as ApiLead;
            const hasRequiredFields = apiLead && apiLead.id && apiLead.name && apiLead.phone_number;
            return hasRequiredFields;
          })
          .map((lead): BackendLead => {
            const apiLead = lead as unknown as ApiLead;
            return {
              id: apiLead.id,
              name: apiLead.name,
              phone_number: apiLead.phone_number,
              email: apiLead.email,
              purpose: apiLead.purpose,
              status: apiLead.status,
              notes: apiLead.notes,
              created_at: apiLead.created_at
            };
          }) : [];
        
        setLeads(backendLeads as BackendLead[]);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = useMemo(() => {
    // Since we're now doing server-side filtering, just return the leads
    return leads.filter(lead => lead && lead.id);
  }, [leads]);

  const handleSelectLead = useCallback((leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  }, [filteredLeads]);

  const getStatusColor = (status: BackendLead['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'called': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: BackendLead['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'called': return <Phone className="h-3 w-3" />;
      case 'scheduled': return <CheckCircle className="h-3 w-3" />;
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      case 'failed': return <AlertCircle className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  const handleStartCampaign = useCallback(() => {
    if (selectedLeads.length === 0) {
      alert('Please select at least one lead to call');
      return;
    }
    setShowCampaignCreation(true);
  }, [selectedLeads.length]);

  const handleCampaignCreated = useCallback(() => {
    setShowCampaignCreation(false);
    setSelectedLeads([]);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <SidebarAwareSheet 
      open={isOpen} 
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Start Bulk Calling Campaign
        </div>
      }
      description="Select leads to include in your calling campaign. You can filter and search through your lead database."
      maxWidth="max-w-6xl"
    >
      <div className="space-y-4">
          {!showCampaignCreation ? (
            <>
              {/* Selection Summary */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {selectedLeads.length} of {filteredLeads.length} leads selected
                        </span>
                      </div>
                      {selectedLeads.length > 0 && (
                        <Badge variant="secondary">
                          Ready for calling
                        </Badge>
                      )}
                    </div>
                    <Button 
                      onClick={handleStartCampaign}
                      disabled={selectedLeads.length === 0}
                      className="flex items-center gap-2"
                    >
                      <Rocket className="h-4 w-4" />
                      Create Campaign
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Search and Filters */}
              <Card>
                <CardHeader>
                  <CardTitle>Lead Selection</CardTitle>
                  <CardDescription>
                    Choose leads to include in your calling campaign
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label htmlFor="search">Search Leads</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search"
                          placeholder="Search by name, phone, or email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="w-48">
                      <Label htmlFor="status-filter">Status Filter</Label>
                      <select
                        id="status-filter"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md"
                      >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="called">Called</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                  </div>

                  {/* Select All */}
                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <Checkbox
                      id="select-all"
                      checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all" className="text-sm font-medium">
                      Select all {filteredLeads.length} leads
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {/* Leads List */}
              <Card>
                <CardContent className="pt-6">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2">Loading leads...</span>
                    </div>
                  ) : filteredLeads.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="mx-auto h-12 w-12 mb-4" />
                      <p>No leads found matching your criteria</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-96">
                      <div className="space-y-2">
                        {filteredLeads.map((lead) => (
                          <div 
                            key={lead.id}
                            className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                              selectedLeads.includes(lead.id) 
                                ? 'bg-blue-50 border-blue-200' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <Checkbox
                              checked={selectedLeads.includes(lead.id)}
                              onCheckedChange={(checked) => 
                                handleSelectLead(lead.id, checked as boolean)
                              }
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{lead.name || 'Unnamed Lead'}</p>
                                  <p className="text-sm text-muted-foreground">{lead.phone_number || 'No phone'}</p>
                                  {lead.email && (
                                    <p className="text-xs text-muted-foreground">{lead.email}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <Badge className={`${getStatusColor(lead.status || 'pending')} mb-1`}>
                                    <div className="flex items-center gap-1">
                                      {getStatusIcon(lead.status || 'pending')}
                                      {lead.status || 'pending'}
                                    </div>
                                  </Badge>
                                  {lead.purpose && (
                                    <p className="text-xs text-blue-600">{lead.purpose}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            /* Campaign Creation */
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Creating campaign with {selectedLeads.length} leads</p>
                      <p className="text-sm text-muted-foreground">Configure your campaign settings below</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCampaignCreation(false)}
                    >
                      Back to Selection
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <BatchCalling 
                selectedLeads={selectedLeads}
                onCampaignStart={() => {
                  handleCampaignCreated();
                }}
                onCampaignComplete={() => {
                }}
              />
            </div>
          )}
      </div>
    </SidebarAwareSheet>
  );
}