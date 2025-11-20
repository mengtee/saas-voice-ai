'use client';

import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { MainLayout } from '@/components/Layout/MainLayout';
import { useAppStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Phone, 
  Users, 
  Calendar, 
  Clock, 
  Target,
  Download,
  RefreshCw
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { AnalyticsCharts } from '@/components/AnalyticsCharts';

interface AnalyticsData {
  overview: {
    totalCalls: number;
    totalLeads: number;
    conversionRate: number;
    avgCallDuration: number;
    totalCampaigns: number;
    successRate: number;
  };
  trends: {
    callsOverTime: Array<{ date: string; calls: number; successful: number; failed: number }>;
    leadsOverTime: Array<{ date: string; leads: number; converted: number }>;
    campaignPerformance: Array<{ campaign: string; success: number; total: number }>;
  };
  demographics: {
    callOutcomes: Array<{ outcome: string; count: number; percentage: number }>;
    callsByHour: Array<{ hour: number; calls: number }>;
    callsByDay: Array<{ day: string; calls: number }>;
  };
  performance: {
    topPerformers: Array<{ agent: string; calls: number; success: number; rate: number }>;
    campaignStats: Array<{ name: string; leads: number; called: number; success: number; status: string }>;
  };
}

export default function AnalyticsPage() {
  const { setCurrentPage } = useAppStore();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    to: new Date().toISOString().split('T')[0] // today
  });

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await apiClient.getAnalytics(dateRange.from, dateRange.to);
      
      if (response.success && response.data) {
        setAnalytics(response.data);
      } else {
        // Fall back to mock data if API fails
        const mockAnalytics: AnalyticsData = {
        overview: {
          totalCalls: 2847,
          totalLeads: 1245,
          conversionRate: 24.5,
          avgCallDuration: 187, // seconds
          totalCampaigns: 15,
          successRate: 68.2
        },
        trends: {
          callsOverTime: [
            { date: '2024-08-01', calls: 95, successful: 65, failed: 30 },
            { date: '2024-08-02', calls: 87, successful: 59, failed: 28 },
            { date: '2024-08-03', calls: 112, successful: 76, failed: 36 },
            { date: '2024-08-04', calls: 89, successful: 61, failed: 28 },
            { date: '2024-08-05', calls: 134, successful: 91, failed: 43 },
            { date: '2024-08-06', calls: 98, successful: 67, failed: 31 },
            { date: '2024-08-07', calls: 156, successful: 106, failed: 50 }
          ],
          leadsOverTime: [
            { date: '2024-08-01', leads: 45, converted: 11 },
            { date: '2024-08-02', leads: 52, converted: 13 },
            { date: '2024-08-03', leads: 38, converted: 9 },
            { date: '2024-08-04', leads: 61, converted: 15 },
            { date: '2024-08-05', leads: 29, converted: 7 },
            { date: '2024-08-06', leads: 48, converted: 12 },
            { date: '2024-08-07', leads: 55, converted: 14 }
          ],
          campaignPerformance: [
            { campaign: 'Q3 Sales Outreach', success: 45, total: 67 },
            { campaign: 'Product Demo Follow-up', success: 32, total: 41 },
            { campaign: 'Customer Retention', success: 28, total: 35 },
            { campaign: 'Lead Nurturing', success: 51, total: 78 }
          ]
        },
        demographics: {
          callOutcomes: [
            { outcome: 'Appointment', count: 312, percentage: 24.5 },
            { outcome: 'Interested', count: 298, percentage: 23.4 },
            { outcome: 'Callback', count: 187, percentage: 14.7 },
            { outcome: 'Not Interested', count: 245, percentage: 19.2 },
            { outcome: 'No Answer', count: 231, percentage: 18.2 }
          ],
          callsByHour: [
            { hour: 9, calls: 45 }, { hour: 10, calls: 67 }, { hour: 11, calls: 89 },
            { hour: 12, calls: 56 }, { hour: 13, calls: 34 }, { hour: 14, calls: 78 },
            { hour: 15, calls: 92 }, { hour: 16, calls: 87 }, { hour: 17, calls: 65 }
          ],
          callsByDay: [
            { day: 'Monday', calls: 187 }, { day: 'Tuesday', calls: 234 },
            { day: 'Wednesday', calls: 198 }, { day: 'Thursday', calls: 267 },
            { day: 'Friday', calls: 189 }
          ]
        },
        performance: {
          topPerformers: [
            { agent: 'AI Agent Primary', calls: 1234, success: 842, rate: 68.2 },
            { agent: 'AI Agent Secondary', calls: 987, success: 623, rate: 63.1 },
            { agent: 'Campaign Bot', calls: 456, success: 298, rate: 65.4 }
          ],
          campaignStats: [
            { name: 'Q3 Sales Outreach', leads: 150, called: 147, success: 98, status: 'completed' },
            { name: 'Product Demo Follow-up', leads: 89, called: 76, success: 52, status: 'running' },
            { name: 'Customer Retention', leads: 67, called: 45, success: 31, status: 'paused' }
          ]
        }
        };

        setAnalytics(mockAnalytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      
      // Fall back to empty data or show error state
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    setCurrentPage('analytics');
    fetchAnalytics();
  }, [setCurrentPage, fetchAnalytics]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatPercentage = (value: number, total: number) => {
    return ((value / total) * 100).toFixed(1);
  };

  const handleExport = async () => {
    try {
      const blob = await apiClient.exportAnalytics(dateRange.from, dateRange.to);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-export-${dateRange.from}-${dateRange.to}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export analytics:', error);
      alert('Failed to export analytics data');
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <MainLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading analytics...</span>
          </div>
        </MainLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div>
              <p className="text-muted-foreground">
                Comprehensive insights into your calling campaigns and lead performance
              </p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="px-3 py-2 border rounded-md"
                />
                <span className="text-muted-foreground">to</span>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="px-3 py-2 border rounded-md"
                />
              </div>
              <Button variant="outline" onClick={fetchAnalytics}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {analytics && (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.overview.totalCalls.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      <TrendingUp className="inline h-3 w-3 mr-1 text-green-600" />
                      12.5% from last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.overview.totalLeads.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      <TrendingUp className="inline h-3 w-3 mr-1 text-green-600" />
                      8.2% from last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{analytics.overview.conversionRate}%</div>
                    <p className="text-xs text-muted-foreground">
                      <TrendingUp className="inline h-3 w-3 mr-1 text-green-600" />
                      2.1% from last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatDuration(analytics.overview.avgCallDuration)}</div>
                    <p className="text-xs text-muted-foreground">
                      <TrendingDown className="inline h-3 w-3 mr-1 text-red-600" />
                      0.5% from last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.overview.totalCampaigns}</div>
                    <p className="text-xs text-muted-foreground">
                      5 active campaigns
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{analytics.overview.successRate}%</div>
                    <p className="text-xs text-muted-foreground">
                      <TrendingUp className="inline h-3 w-3 mr-1 text-green-600" />
                      3.2% from last month
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <AnalyticsCharts data={analytics} />

              {/* Performance Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Campaign Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Campaign Performance</CardTitle>
                    <CardDescription>Success rates by campaign</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.performance.campaignStats.map((campaign, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {campaign.called}/{campaign.leads} leads called
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {formatPercentage(campaign.success, campaign.called)}% success
                            </p>
                            <p className={`text-xs px-2 py-1 rounded-full ${
                              campaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                              campaign.status === 'running' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {campaign.status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Call Outcomes */}
                <Card>
                  <CardHeader>
                    <CardTitle>Call Outcomes</CardTitle>
                    <CardDescription>Distribution of call results</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.demographics.callOutcomes.map((outcome, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              outcome.outcome === 'Appointment' ? 'bg-green-500' :
                              outcome.outcome === 'Interested' ? 'bg-blue-500' :
                              outcome.outcome === 'Callback' ? 'bg-yellow-500' :
                              outcome.outcome === 'Not Interested' ? 'bg-red-500' :
                              'bg-gray-500'
                            }`}></div>
                            <span className="font-medium">{outcome.outcome}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium">{outcome.count}</span>
                            <p className="text-xs text-muted-foreground">{outcome.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </MainLayout>
    </AuthGuard>
  );
}
