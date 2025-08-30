'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { MainLayout } from '@/components/Layout/MainLayout';
import { useAppStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarAwareSheet } from '@/components/ui/sidebar-aware-sheet';
import { Users, Phone, Calendar, MessageCircle, TrendingUp } from 'lucide-react';
import { LeadUpload } from '@/components/LeadUpload';
import { BulkCallingLauncher } from '@/components/BulkCallingLauncher';
import { apiClient } from '@/services/api';

export default function DashboardPage() {
  const { setCurrentPage } = useAppStore();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [bulkCallingOpen, setBulkCallingOpen] = useState(false);
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeCalls: 0,
    todayAppointments: 0,
    pendingFollowups: 0,
    successRate: 0,
    avgCallDuration: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentPage('dashboard');
    fetchDashboardStats();
  }, [setCurrentPage]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getDashboardStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const resetUploadDialog = () => {
    // Reset any state when dialog closes
  };

  return (
    <AuthGuard>
      <MainLayout>
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <TrendingUp className="inline h-3 w-3 mr-1" />
                Total leads in system
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.activeCalls}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.todayAppointments}
              </div>
              <p className="text-xs text-muted-foreground">
                Scheduled for today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Follow-ups</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.pendingFollowups}
              </div>
              <p className="text-xs text-muted-foreground">
                WhatsApp messages
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Call Performance</CardTitle>
              <CardDescription>Today&apos;s calling statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Success Rate</span>
                <span className="text-2xl font-bold text-green-600">
                  {loading ? '...' : `${stats.successRate}%`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Average Call Duration</span>
                <span className="text-2xl font-bold">
                  {loading ? '...' : formatDuration(stats.avgCallDuration)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${stats.successRate}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">New lead imported: John Doe</span>
                  <span className="text-xs text-muted-foreground ml-auto">2 min ago</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Call completed: +1234567890</span>
                  <span className="text-xs text-muted-foreground ml-auto">5 min ago</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Appointment scheduled for tomorrow</span>
                  <span className="text-xs text-muted-foreground ml-auto">12 min ago</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">WhatsApp follow-up sent</span>
                  <span className="text-xs text-muted-foreground ml-auto">18 min ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Users className="h-6 w-6 mb-2 text-primary" />
                <h3 className="font-semibold">Upload New Leads</h3>
                <p className="text-sm text-muted-foreground">Import leads from CSV or Excel</p>
              </div>

              <SidebarAwareSheet
                open={uploadDialogOpen}
                onOpenChange={(open: boolean) => {
                  setUploadDialogOpen(open);
                  if (!open) resetUploadDialog();
                }}
                title="Upload Leads"
                description="Import leads from CSV or Excel files. Download the template to see the required format."
                maxWidth="max-w-2xl"
              >
                <LeadUpload />
              </SidebarAwareSheet>

              <div 
                className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setBulkCallingOpen(true)}
              >
                <Phone className="h-6 w-6 mb-2 text-primary" />
                <h3 className="font-semibold">Start Bulk Calling</h3>
                <p className="text-sm text-muted-foreground">Begin calling selected leads</p>
              </div>
              <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <MessageCircle className="h-6 w-6 mb-2 text-primary" />
                <h3 className="font-semibold">Send Follow-ups</h3>
                <p className="text-sm text-muted-foreground">Send WhatsApp messages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Calling Launcher */}
        <BulkCallingLauncher 
          isOpen={bulkCallingOpen}
          onOpenChange={setBulkCallingOpen}
        />
      </div>
      </MainLayout>
    </AuthGuard>
  );
}