export interface Lead {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  purpose?: string;
  status: 'pending' | 'called' | 'scheduled' | 'completed' | 'failed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Call {
  id: string;
  leadId: string;
  conversationId?: string;
  phoneNumber: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  duration?: number;
  startTime: string;
  endTime?: string;
  outcome?: 'interested' | 'not_interested' | 'callback' | 'appointment' | 'no_answer';
  notes?: string;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  lead_id?: string;
  campaign_id?: string;
  conversation_id?: string;
  cal_booking_id?: string;
  cal_event_type_id?: string;
  title: string;
  description?: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  start_time: string;
  end_time: string;
  timezone: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  booking_status: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled';
  meeting_url?: string;
  meeting_password?: string;
  location?: string;
  booked_by: 'ai_agent' | 'manual' | 'api';
  booking_reference?: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  completed_at?: string;
}

export interface WhatsAppFollowup {
  id: string;
  leadId: string;
  callId?: string;
  messageTemplateId: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'replied' | 'failed';
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  repliedAt?: string;
  content: string;
  response?: string;
}

export interface CallMetrics {
  totalCalls: number;
  activeCalls: number;
  completedCalls: number;
  failedCalls: number;
  averageDuration: number;
  successRate: number;
  appointmentsScheduled: number;
  conversionRate: number;
}

export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  agent_id: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  custom_message?: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  total_leads: number;
  called: number;
  successful: number;
  failed: number;
  lead_ids: string[];
  batch_id?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'agent' | 'viewer';
  created_at: string;
  updated_at: string;
  last_login?: string;
  avatar_url?: string; // Optional field for future profile images
}

export interface UserProfileUpdate {
  name?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}