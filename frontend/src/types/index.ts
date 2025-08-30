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
  leadId: string;
  callId?: string;
  title: string;
  description?: string;
  scheduledAt: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  createdAt: string;
  updatedAt: string;
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