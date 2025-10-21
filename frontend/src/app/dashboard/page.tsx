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
  const { setCurrentPage, user } = useAppStore();
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
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    type: 'lead_created' | 'call_completed' | 'appointment_booked' | 'campaign_started' | 'lead_updated';
    title: string;
    description: string;
    timestamp: string;
    entityId: string;
    entityType: 'lead' | 'call' | 'appointment' | 'campaign';
    metadata?: Record<string, unknown>;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    setCurrentPage('dashboard');
    fetchDashboardStats();
    fetchRecentActivity();
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

  const fetchRecentActivity = async () => {
    try {
      setActivityLoading(true);
      const response = await apiClient.getRecentActivity();
      if (response.success && response.data) {
        setRecentActivity(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - activityTime.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} sec ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr ago`;
    return `${Math.floor(diffInSeconds / 86400)} day ago`;
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'lead_created': return 'bg-green-500';
      case 'call_completed': return 'bg-blue-500';
      case 'appointment_booked': return 'bg-yellow-500';
      case 'campaign_started': return 'bg-purple-500';
      case 'lead_updated': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const resetUploadDialog = () => {
    // Reset any state when dialog closes
  };

  // Check if user is admin for conditional UI
  const isAdmin = user?.role === 'admin';
  const isAgent = user?.role === 'agent';

  return (
    <AuthGuard>
      <MainLayout>
      <div className="space-y-6">
        {/* Role-based Welcome Message */}
        {isAdmin && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-900">
                Admin View: You can see all company data and team performance.
              </span>
            </div>
          </div>
        )}
        {isAgent && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-900">
                Agent View: You can see your assigned leads and personal performance.
              </span>
            </div>
          </div>
        )}
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isAdmin ? 'Total Leads' : 'My Leads'}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.totalLeads.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                {isAdmin ? 'Total leads in system' : 'Leads assigned to you'}
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
              <CardDescription>
                {isAdmin ? "Today's team calling statistics" : "Your calling statistics today"}
              </CardDescription>
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
                {activityLoading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-2 w-2 bg-gray-300 rounded-full animate-pulse"></div>
                        <div className="h-4 bg-gray-300 rounded flex-1 animate-pulse"></div>
                        <div className="h-3 w-16 bg-gray-300 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : recentActivity.length > 0 ? (
                  recentActivity.slice(0, 6).map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3">
                      <div className={`h-2 w-2 ${getActivityColor(activity.type)} rounded-full`}></div>
                      <span className="text-sm">{activity.title}: {activity.description}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    <span className="text-sm">No recent activity</span>
                  </div>
                )}
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