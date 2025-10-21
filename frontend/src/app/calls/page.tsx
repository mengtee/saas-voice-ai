'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { useAppStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Pause, Square, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import { apiClient } from '@/services/api';
import { BulkCallingLauncher } from '@/components/BulkCallingLauncher';
import { RealTimeMonitor } from '@/components/RealTimeMonitor';
import { WebhookProcessor } from '@/components/WebhookProcessor';
import { CallRecording } from '@/components/CallRecording';

export default function CallsPage() {
  const { setCurrentPage } = useAppStore();
  const [stats, setStats] = useState({
    activeCalls: 0,
    todaysCalls: 0,
    successRate: 0,
    avgDuration: 0,
    yesterdayComparison: 0,
  });
  const [activeCalls, setActiveCalls] = useState<Array<{
    id: string;
    name: string;
    phoneNumber: string;
    duration: number;
    startTime?: string;
  }>>([]);
  const [localDurations, setLocalDurations] = useState<Record<string, number>>({});
  const [callHistory, setCallHistory] = useState<Array<{
    name: string;
    phoneNumber: string;
    duration: number;
    outcome: string;
    endTime: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [bulkCallingOpen, setBulkCallingOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    setCurrentPage('calls');
    fetchCallCenterData();

    // Set up polling for real-time updates every 10 seconds
    const pollingInterval = setInterval(() => {
      fetchCallCenterData(true); // Pass true to indicate this is a background refresh
    }, 10000);

    // Cleanup polling interval on component unmount
    return () => clearInterval(pollingInterval);
  }, [setCurrentPage]);

  // Separate useEffect for live duration counter
  useEffect(() => {
    const durationInterval = setInterval(() => {
      setLocalDurations(prev => {
        const updated = { ...prev };
        activeCalls.forEach(call => {
          if (updated[call.id] !== undefined) {
            updated[call.id] = updated[call.id] + 1;
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(durationInterval);
  }, [activeCalls]);

  const fetchCallCenterData = async (isBackgroundRefresh = false) => {
    try {
      if (isBackgroundRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      const [statsResponse, activeCallsResponse, historyResponse] = await Promise.all([
        apiClient.getCallCenterStats(),
        apiClient.getActiveCallsWithDetails(),
        apiClient.getCallHistory(5)
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (activeCallsResponse.success && activeCallsResponse.data) {
        setActiveCalls(activeCallsResponse.data);
        
        // Initialize local durations for new calls
        const newDurations: Record<string, number> = {};
        activeCallsResponse.data.forEach((call: {
          id: string;
          name: string;
          phoneNumber: string;
          duration: number;
          startTime?: string;
        }) => {
          newDurations[call.id] = call.duration;
        });
        setLocalDurations(prev => ({ ...prev, ...newDurations }));
      }

      if (historyResponse.success && historyResponse.data) {
        setCallHistory(historyResponse.data);
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch call center data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Call Center</h2>
            <p className="text-muted-foreground">
              Monitor and manage AI-powered outbound calls
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              {isRefreshing && (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Refreshing...
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => fetchCallCenterData()}
              disabled={loading || isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setBulkCallingOpen(true)}>
              <Phone className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
            <Button variant="outline">
              <Pause className="mr-2 h-4 w-4" />
              Pause Campaign
            </Button>
          </div>
        </div>

        {/* Call Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
              <Phone className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loading ? '...' : stats.activeCalls}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Calls</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.todaysCalls}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? '...' : 
                  stats.yesterdayComparison > 0 ? `+${stats.yesterdayComparison}%` : 
                  stats.yesterdayComparison < 0 ? `${stats.yesterdayComparison}%` : 
                  'No change'
                } from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : `${stats.successRate}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                Successful connections
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : formatDuration(stats.avgDuration)}
              </div>
              <p className="text-xs text-muted-foreground">
                Average call time
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Calls */}
        <Card>
          <CardHeader>
            <CardTitle>Active Calls</CardTitle>
            <CardDescription>
              Real-time monitoring of ongoing conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="h-3 w-3 bg-gray-300 rounded-full"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                      <div>
                        <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                ))
              ) : activeCalls.length > 0 ? (
                activeCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
                  <div className="flex items-center gap-4">
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="font-medium">{call.name}</p>
                      <p className="text-sm text-muted-foreground">{call.phoneNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">AI Agent</p>
                      <p className="text-sm text-muted-foreground">
                        Duration: {formatDuration(localDurations[call.id] || call.duration)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Square className="h-4 w-4 mr-1" />
                      End Call
                    </Button>
                    <Button variant="ghost" size="sm">
                      Monitor
                    </Button>
                  </div>
                </div>
              ))
              ) : (
                // No active calls state
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="mx-auto h-8 w-8 mb-2" />
                  <p>No active calls at the moment</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Call History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Call History</CardTitle>
            <CardDescription>
              Latest completed calls and their outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                      <div>
                        <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                ))
              ) : callHistory.length > 0 ? (
                callHistory.map((call, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{call.name}</p>
                      <p className="text-sm text-muted-foreground">{call.phoneNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {call.duration > 0 ? formatDuration(call.duration) : 'No answer'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(call.endTime).toLocaleString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      call.outcome === 'appointment' ? 'bg-green-100 text-green-800' :
                      call.outcome === 'interested' ? 'bg-blue-100 text-blue-800' :
                      call.outcome === 'callback' ? 'bg-yellow-100 text-yellow-800' :
                      call.outcome === 'not_interested' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {call.outcome.replace('_', ' ')}
                    </span>
                    <Button variant="ghost" size="sm">
                      Details
                    </Button>
                  </div>
                </div>
              ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="mx-auto h-8 w-8 mb-2" />
                  <p>No call history available</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full">
                View All Call History
              </Button>
            </div>
          </CardContent>
        </Card>

        <RealTimeMonitor />
        <WebhookProcessor /> 
        <CallRecording /> 
      
        {/* Put BulkCallingLauncher back so the button works */}
        <BulkCallingLauncher 
          isOpen={bulkCallingOpen}
          onOpenChange={setBulkCallingOpen}
        />
      </div>
    </MainLayout>
  );
}