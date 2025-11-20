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
    </div>
  );
}