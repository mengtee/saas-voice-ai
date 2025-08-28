'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Webhook, 
  CheckCircle, 
  Mail, 
  MessageSquare, 
  Calendar,
  RefreshCw,
  Settings
} from 'lucide-react';

interface PostCallEvent {
  id: string;
  callId: string;
  leadName: string;
  phoneNumber: string;
  outcome: 'appointment' | 'interested' | 'callback' | 'not_interested' | 'no_answer';
  transcript?: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  duration: number;
  endTime: string;
  processed: boolean;
  followupActions: FollowupAction[];
}

interface FollowupAction {
  id: string;
  type: 'email' | 'sms' | 'calendar' | 'crm_update' | 'task_creation';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledAt?: string;
  completedAt?: string;
  error?: string;
  details: Record<string, unknown>;
}

interface WebhookRule {
  id: string;
  name: string;
  trigger: 'call_ended' | 'appointment_scheduled' | 'callback_requested' | 'negative_sentiment';
  actions: {
    type: FollowupAction['type'];
    template?: string;
    delay?: number;
    conditions?: Record<string, unknown>;
    details?: Record<string, unknown>;
  }[];
  active: boolean;
}

export function WebhookProcessor() {
  const [events, setEvents] = useState<PostCallEvent[]>([]);
  const [rules, setRules] = useState<WebhookRule[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWebhookData();
    const interval = setInterval(fetchWebhookData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchWebhookData = async () => {
    try {
      setLoading(true);
      
      const mockEvents: PostCallEvent[] = [
        {
          id: 'event_1',
          callId: 'call_123',
          leadName: 'John Smith',
          phoneNumber: '+1234567890',
          outcome: 'appointment',
          sentiment: 'positive',
          duration: 245,
          endTime: new Date().toISOString(),
          processed: true,
          followupActions: [
            {
              id: 'action_1',
              type: 'email',
              status: 'completed',
              completedAt: new Date().toISOString(),
              details: {
                template: 'appointment_confirmation',
                recipientEmail: 'john@example.com'
              }
            },
            {
              id: 'action_2',
              type: 'calendar',
              status: 'completed',
              completedAt: new Date().toISOString(),
              details: {
                appointmentDate: '2024-08-28T10:00:00Z',
                duration: 30
              }
            }
          ]
        },
        {
          id: 'event_2',
          callId: 'call_124',
          leadName: 'Sarah Johnson',
          phoneNumber: '+1234567891',
          outcome: 'callback',
          sentiment: 'neutral',
          duration: 180,
          endTime: new Date(Date.now() - 300000).toISOString(),
          processed: true,
          followupActions: [
            {
              id: 'action_3',
              type: 'task_creation',
              status: 'processing',
              details: {
                task: 'Schedule callback for Sarah Johnson',
                priority: 'high',
                assignee: 'sales_team'
              }
            }
          ]
        }
      ];

      const mockRules: WebhookRule[] = [
        {
          id: 'rule_1',
          name: 'Appointment Follow-up',
          trigger: 'call_ended',
          active: true,
          actions: [
            {
              type: 'email',
              template: 'appointment_confirmation',
              delay: 0
            },
            {
              type: 'calendar',
              delay: 0
            }
          ]
        },
        {
          id: 'rule_2',
          name: 'Callback Reminder',
          trigger: 'callback_requested',
          active: true,
          actions: [
            {
              type: 'task_creation',
              delay: 3600,
              details: {
                priority: 'high'
              }
            }
          ]
        }
      ];

      setEvents(mockEvents);
      setRules(mockRules);
    } catch (error) {
      console.error('Failed to fetch webhook data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionStatusColor = (status: FollowupAction['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getActionIcon = (type: FollowupAction['type']) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'calendar': return <Calendar className="h-4 w-4" />;
      case 'crm_update': return <RefreshCw className="h-4 w-4" />;
      case 'task_creation': return <CheckCircle className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const retryFailedAction = async (eventId: string, actionId: string) => {
    try {
      console.log(`Retrying action ${actionId} for event ${eventId}`);
      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? {
              ...event,
              followupActions: event.followupActions.map(action =>
                action.id === actionId
                  ? { ...action, status: 'processing', error: undefined }
                  : action
              )
            }
          : event
      ));
    } catch (error) {
      console.error('Failed to retry action:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Post-Call Webhook Processing
          </CardTitle>
          <CardDescription>
            Automated follow-up actions triggered by call outcomes
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Active Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Rules</CardTitle>
          <CardDescription>
            Configured automation rules for post-call processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Trigger: {rule.trigger.replace('_', ' ')} → {rule.actions.length} action(s)
                  </p>
                </div>
                <Badge variant={rule.active ? "default" : "secondary"}>
                  {rule.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              <Settings className="mr-2 h-4 w-4" />
              Configure Rules
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Post-Call Events</CardTitle>
          <CardDescription>
            Latest call outcomes and their automated follow-up processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground mt-2">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Webhook className="mx-auto h-8 w-8 mb-2" />
                <p>No recent events to process</p>
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{event.leadName}</p>
                        <Badge className={
                          event.outcome === 'appointment' ? 'bg-green-100 text-green-800' :
                          event.outcome === 'interested' ? 'bg-blue-100 text-blue-800' :
                          event.outcome === 'callback' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {event.outcome.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.phoneNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        Duration: {Math.floor(event.duration / 60)}:{(event.duration % 60).toString().padStart(2, '0')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.endTime).toLocaleString()}
                      </p>
                      <Badge variant={event.processed ? "default" : "secondary"}>
                        {event.processed ? 'Processed' : 'Pending'}
                      </Badge>
                    </div>
                  </div>

                  {/* Follow-up Actions */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Follow-up Actions:</p>
                    {event.followupActions.map((action) => (
                      <div key={action.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          {getActionIcon(action.type)}
                          <span className="text-sm">{action.type.replace('_', ' ')}</span>
                          <Badge className={getActionStatusColor(action.status)}>
                            {action.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {action.status === 'failed' && (
                            <>
                              <span className="text-xs text-red-600">{action.error}</span>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => retryFailedAction(event.id, action.id)}
                              >
                                Retry
                              </Button>
                            </>
                          )}
                          {action.completedAt && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(action.completedAt).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Event Details */}
                  {selectedEvent === event.id && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Call ID:</p>
                          <p className="text-muted-foreground">{event.callId}</p>
                        </div>
                        <div>
                          <p className="font-medium">Sentiment:</p>
                          <p className={
                            event.sentiment === 'positive' ? 'text-green-600' :
                            event.sentiment === 'negative' ? 'text-red-600' :
                            'text-yellow-600'
                          }>
                            {event.sentiment}
                          </p>
                        </div>
                      </div>
                      
                      {event.transcript && (
                        <div className="mt-3">
                          <p className="font-medium text-sm mb-1">Transcript Summary:</p>
                          <div className="text-sm text-muted-foreground bg-white p-2 rounded border max-h-24 overflow-y-auto">
                            {event.transcript}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedEvent(
                        selectedEvent === event.id ? null : event.id
                      )}
                    >
                      {selectedEvent === event.id ? 'Hide Details' : 'Show Details'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}