'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { MainLayout } from '@/components/Layout/MainLayout';
import { useAppStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, FileText } from 'lucide-react';
import { apiClient } from '@/services/api';
import { ApiResponse, PaginatedResponse } from '@/types';
import { LeadUpload } from '@/components/LeadUpload';
import { LeadsTable } from '@/components/LeadsTable';

interface LeadStats {
  totalLeads: number;
  newThisWeek: number;
  conversionRate: number;
}

interface BackendLead {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  purpose?: string;
  status: 'pending' | 'called' | 'scheduled' | 'completed' | 'failed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function LeadsPage() {
  const { setCurrentPage } = useAppStore();
  const [leads, setLeads] = useState<BackendLead[]>([]);
  const [stats, setStats] = useState<LeadStats>({
    totalLeads: 0,
    newThisWeek: 0,
    conversionRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentPage('leads');
    fetchLeadsData();
  }, [setCurrentPage]);

  const fetchLeadsData = async () => {
    try {
      setLoading(true);
      
      const [leadsResponse, statsResponse] = await Promise.all([
        apiClient.getLeads(1, 5) as unknown as ApiResponse<PaginatedResponse<BackendLead>>,
        apiClient.getLeadStats()
      ]);
      
      if (leadsResponse && leadsResponse.data) {
        const paginatedData = leadsResponse.data;
        const backendLeads = paginatedData.items;
        setLeads(backendLeads || []);
      }
      
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch leads data:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Lead Management</h2>
              <p className="text-muted-foreground">
                Upload, manage, and track your customer leads
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : stats.totalLeads.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total leads in database
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New This Week</CardTitle>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : stats.newThisWeek}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ready for calling
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : `${stats.conversionRate}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lead to scheduled
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Section */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Quick Upload</CardTitle>
                <CardDescription>
                  Upload leads from CSV or Excel files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeadUpload onSuccess={fetchLeadsData} />
              </CardContent>
            </Card>

            {/* Leads Table Preview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Leads</CardTitle>
                <CardDescription>
                  Latest leads added to your database
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    // Loading skeleton
                    Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded w-32"></div>
                            </div>
                            <div>
                              <div className="h-3 bg-gray-200 rounded w-20"></div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                          <div className="h-8 bg-gray-200 rounded w-12"></div>
                        </div>
                      </div>
                    ))
                  ) : leads.length > 0 ? (
                    // Real leads data
                    leads.map((lead, index) => (
                      <div key={lead.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-medium">{lead.name}</p>
                              <p className="text-sm text-muted-foreground">{lead.phone_number}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-blue-600">
                                {lead.purpose || 'No purpose specified'}
                              </p>
                              {lead.email && (
                                <p className="text-xs text-muted-foreground">{lead.email}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            lead.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            lead.status === 'called' ? 'bg-blue-100 text-blue-800' :
                            lead.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                            lead.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                            lead.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {lead.status}
                          </span>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Empty state
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium">No leads found</h3>
                      <p className="text-muted-foreground">Upload your first CSV file to get started</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" className="w-full">
                    View All Leads
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Lead Management Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Management</CardTitle>
              <CardDescription>
                View, edit, and manage all your leads with advanced filtering and bulk operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadsTable onRefresh={fetchLeadsData} />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}