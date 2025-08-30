'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Phone, 
  Users, 
  Volume2, 
  Square,
  Activity,
  Clock,
  Mic,
  MicOff
} from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface ActiveCall {
  id: string;
  campaignId?: string;
  leadName: string;
  phoneNumber: string;
  agentId: string;
  status: 'connecting' | 'active' | 'on_hold' | 'transferring' | 'ending';
  duration: number;
  startTime: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  isRecording?: boolean;
  audioLevel?: number;
}

interface CallMetrics {
  totalActive: number;
  avgDuration: number;
  successRate: number;
  queueLength: number;
}

export function RealTimeMonitor() {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [metrics, setMetrics] = useState<CallMetrics>({
    totalActive: 0,
    avgDuration: 0,
    successRate: 0,
    queueLength: 0
  });
  const [selectedCall, setSelectedCall] = useState<string | null>(null);

  const { isConnected, error, sendMessage } = useWebSocket(
    process.env.NODE_ENV === 'development' ? 'ws://localhost:3001' : null,
    {
      onMessage: (data) => {
        switch (data.type) {
          case 'call_started':
            if (data.call) {
              const newCall: ActiveCall = {
                id: data.call.id,
                leadName: (data as { leadName?: string }).leadName || 'Unknown',
                phoneNumber: data.call.phoneNumber || '',
                agentId: (data as { agentId?: string }).agentId || 'agent_3501k2cxpkgbf69s7q5jr9vtrxey',
                status: 'connecting',
                duration: 0,
                startTime: data.call.startTime
              };
              setActiveCalls(prev => [...prev, newCall]);
            }
            break;
          case 'call_status_update':
            if (data.callId && data.status) {
              setActiveCalls(prev => prev.map(call => 
                call.id === data.callId 
                  ? { 
                      ...call, 
                      status: data.status as ActiveCall['status'], 
                      duration: data.duration || call.duration 
                    }
                  : call
              ));
            }
            break;
          case 'call_ended':
            if (data.callId) {
              setActiveCalls(prev => prev.filter(call => call.id !== data.callId));
            }
            break;
          case 'metrics_update':
            if (data.metrics) {
              setMetrics(data.metrics as CallMetrics);
            }
            break;
        }
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
      }
    }
  );

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: ActiveCall['status']) => {
    switch (status) {
      case 'connecting': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-blue-100 text-blue-800';
      case 'transferring': return 'bg-purple-100 text-purple-800';
      case 'ending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      case 'neutral': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const handleCallAction = (callId: string, action: 'monitor' | 'mute' | 'end' | 'transfer') => {
    sendMessage({
      type: 'call_action',
      callId,
      action
    });
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-Time Call Monitoring
            <Badge variant={isConnected ? "default" : "destructive"} className="ml-auto">
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </CardTitle>
          {error && (
            <CardDescription className="text-red-600">
              {error}
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      {/* Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
            <Phone className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCalls.length}</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(metrics.avgDuration)}</div>
            <p className="text-xs text-muted-foreground">Per call</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.successRate}%</div>
            <p className="text-xs text-muted-foreground">Successful connections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Length</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.queueLength}</div>
            <p className="text-xs text-muted-foreground">Waiting to connect</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Calls List */}
      <Card>
        <CardHeader>
          <CardTitle>Live Call Activity</CardTitle>
          <CardDescription>Monitor ongoing conversations in real-time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeCalls.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="mx-auto h-8 w-8 mb-2" />
                <p>No active calls at the moment</p>
              </div>
            ) : (
              activeCalls.map((call) => (
                <div 
                  key={call.id} 
                  className={`border rounded-lg p-4 transition-colors ${
                    selectedCall === call.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full animate-pulse ${
                          call.status === 'active' ? 'bg-green-500' : 
                          call.status === 'connecting' ? 'bg-yellow-500' : 
                          'bg-blue-500'
                        }`}></div>
                        <div>
                          <p className="font-medium">{call.leadName}</p>
                          <p className="text-sm text-muted-foreground">{call.phoneNumber}</p>
                        </div>
                      </div>

                      <div className="text-sm">
                        <Badge className={getStatusColor(call.status)}>
                          {call.status.replace('_', ' ')}
                        </Badge>
                        <p className="text-muted-foreground mt-1">
                          Duration: {formatDuration(call.duration)}
                        </p>
                      </div>

                      {call.sentiment && (
                        <div className="text-sm">
                          <p className="text-muted-foreground">Sentiment:</p>
                          <p className={`font-medium ${getSentimentColor(call.sentiment)}`}>
                            {call.sentiment}
                          </p>
                        </div>
                      )}

                      {call.audioLevel !== undefined && (
                        <div className="w-16">
                          <p className="text-xs text-muted-foreground mb-1">Audio</p>
                          <Progress value={call.audioLevel} className="h-2" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCall(selectedCall === call.id ? null : call.id)}
                      >
                        {selectedCall === call.id ? 'Hide' : 'Monitor'}
                      </Button>
                      
                      {call.isRecording ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCallAction(call.id, 'mute')}
                        >
                          <MicOff className="h-4 w-4 mr-1" />
                          Mute
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCallAction(call.id, 'monitor')}
                        >
                          <Mic className="h-4 w-4 mr-1" />
                          Listen
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCallAction(call.id, 'end')}
                      >
                        <Square className="h-4 w-4 mr-1" />
                        End
                      </Button>
                    </div>
                  </div>

                  {/* Call Details Panel */}
                  {selectedCall === call.id && (
                    <div className="mt-4 pt-4 border-t bg-white rounded p-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-muted-foreground">Agent ID:</p>
                          <p>{call.agentId}</p>
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">Start Time:</p>
                          <p>{call.startTime ? new Date(call.startTime).toISOString().slice(11, 19) : 'Unknown'}</p>
                        </div>
                        {call.campaignId && (
                          <div>
                            <p className="font-medium text-muted-foreground">Campaign:</p>
                            <p>{call.campaignId}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline">
                          <Volume2 className="h-4 w-4 mr-1" />
                          Live Audio
                        </Button>
                        <Button size="sm" variant="outline">
                          View Transcript
                        </Button>
                        <Button size="sm" variant="outline">
                          Transfer Call
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}