import axios, { AxiosInstance, AxiosResponse } from "axios";
import {
  ApiResponse,
  PaginatedResponse,
  Lead,
  Call,
  Appointment,
  WhatsAppFollowup,
  CallMetrics,
  Campaign,
} from "@/types";

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem("auth_token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem("auth_token");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );
  }

  private async handleRequest<T>(
    request: Promise<AxiosResponse<T>>
  ): Promise<T> {
    try {
      const response = await request;
      return response.data;
    } catch (error) {
      console.error("API request error:", error);
      throw error;
    }
  }

  // Leads API
  async getLeads(
    page = 1, 
    pageSize = 50, 
    search = '', 
    status = ''
  ): Promise<ApiResponse<PaginatedResponse<Lead>>> {
    const params: Record<string, string | number> = { page, pageSize };
    if (search) params.search = search;
    if (status && status !== 'all') params.status = status;
    
    return this.handleRequest(
      this.client.get("/api/leads", { params })
    );
  }

  async createLead(
    lead: Omit<Lead, "id" | "createdAt" | "updatedAt">
  ): Promise<ApiResponse<Lead>> {
    return this.handleRequest(this.client.post("/api/leads", lead));
  }

  async updateLead(
    id: string,
    updates: Partial<Lead>
  ): Promise<ApiResponse<Lead>> {
    return this.handleRequest(this.client.put(`/api/leads/${id}`, updates));
  }

  async deleteLead(id: string): Promise<ApiResponse<void>> {
    return this.handleRequest(this.client.delete(`/api/leads/${id}`));
  }

  async uploadLeads(
    file: File
  ): Promise<
    ApiResponse<{
      imported: number;
      errors: string[];
      duplicates: number;
      total: number;
    }>
  > {
    const formData = new FormData();
    formData.append("file", file);

    return this.handleRequest(
      this.client.post("/api/leads/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    );
  }

  async downloadLeadsTemplate(): Promise<Blob> {
    const response = await this.client.get("/api/leads/template", {
      responseType: "blob",
    });
    return response.data;
  }

  // Calls API (integrating with existing ElevenLabs endpoints)
  async makeCall(
    phoneNumber: string,
    customParameters: Record<string, unknown> = {}
  ): Promise<ApiResponse<{ conversationId: string }>> {
    return this.handleRequest(
      this.client.post("/elevenlabs/make-call", {
        phoneNumber,
        customParameters,
      })
    );
  }

  async getConversationStatus(
    conversationId: string
  ): Promise<ApiResponse<unknown>> {
    return this.handleRequest(
      this.client.get(`/elevenlabs/conversation-status/${conversationId}`)
    );
  }

  async getCalls(page = 1, pageSize = 50): Promise<PaginatedResponse<Call>> {
    return this.handleRequest(
      this.client.get(`/api/calls?page=${page}&pageSize=${pageSize}`)
    );
  }

  async getActiveCalls(): Promise<ApiResponse<Call[]>> {
    return this.handleRequest(this.client.get("/api/calls/active"));
  }

  async getCallMetrics(
    dateFrom?: string,
    dateTo?: string
  ): Promise<ApiResponse<CallMetrics>> {
    const params = new URLSearchParams();
    if (dateFrom) params.append("dateFrom", dateFrom);
    if (dateTo) params.append("dateTo", dateTo);

    return this.handleRequest(
      this.client.get(`/api/calls/metrics?${params.toString()}`)
    );
  }

  // WebSocket URL for real-time call updates
  async getWebSocketUrl(
    conversationId: string
  ): Promise<ApiResponse<{ url: string; expiresAt: string }>> {
    return this.handleRequest(
      this.client.get(`/elevenlabs/websocket-url/${conversationId}`)
    );
  }

  // Phone Numbers API (from existing backend)
  async getPhoneNumbers(): Promise<ApiResponse<unknown[]>> {
    return this.handleRequest(this.client.get("/elevenlabs/phone-numbers"));
  }

  async addPhoneNumber(
    phoneNumber: string,
    label: string
  ): Promise<ApiResponse<unknown>> {
    return this.handleRequest(
      this.client.post("/elevenlabs/add-phone-number", {
        phoneNumber,
        label,
      })
    );
  }

  // Appointments API
  async getAppointments(
    limit: number = 50, 
    offset: number = 0,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ApiResponse<{
    appointments: Appointment[];
    total: number;
  }>> {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());
    if (dateFrom) params.append("dateFrom", dateFrom);
    if (dateTo) params.append("dateTo", dateTo);

    return this.handleRequest(
      this.client.get(`/api/appointments?${params.toString()}`)
    );
  }

  async createAppointment(
    appointment: Omit<Appointment, "id" | "createdAt" | "updatedAt">
  ): Promise<ApiResponse<Appointment>> {
    return this.handleRequest(
      this.client.post("/api/appointments", appointment)
    );
  }

  async updateAppointment(
    id: string,
    updates: Partial<Appointment>
  ): Promise<ApiResponse<Appointment>> {
    return this.handleRequest(
      this.client.put(`/api/appointments/${id}`, updates)
    );
  }

  async deleteAppointment(id: string): Promise<ApiResponse<void>> {
    return this.handleRequest(this.client.delete(`/api/appointments/${id}`));
  }

  async getCalendarStats(): Promise<ApiResponse<{
    todayAppointments: number;
    thisWeekAppointments: number;
    showRate: number;
    avgDuration: number;
    todayStats: {
      confirmed: number;
      pending: number;
      cancelled: number;
    };
  }>> {
    return this.handleRequest(this.client.get('/api/appointments/stats'));
  }

  async bookAppointment(appointment: {
    eventTypeId: string;
    start: string;
    end?: string;
    attendeeName: string;
    attendeeEmail: string;
    attendeeTimeZone?: string;
    title?: string;
    description?: string;
    location?: string;
    leadId?: string;
    campaignId?: string;
    conversationId?: string;
  }): Promise<ApiResponse<{
    calcomBooking: Record<string, unknown>;
    appointment: Appointment;
  }>> {
    return this.handleRequest(
      this.client.post('/api/appointments/book', appointment)
    );
  }

  async updateAppointmentStatus(
    id: string, 
    status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show',
    bookingStatus?: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled'
  ): Promise<ApiResponse<void>> {
    return this.handleRequest(
      this.client.patch(`/api/appointments/${id}/status`, { status, bookingStatus })
    );
  }

  // WhatsApp Follow-ups API
  async getWhatsappFollowups(
    page = 1,
    pageSize = 50
  ): Promise<PaginatedResponse<WhatsAppFollowup>> {
    return this.handleRequest(
      this.client.get(
        `/api/whatsapp/followups?page=${page}&pageSize=${pageSize}`
      )
    );
  }

  async createWhatsappFollowup(
    followup: Omit<
      WhatsAppFollowup,
      "id" | "sentAt" | "deliveredAt" | "readAt" | "repliedAt"
    >
  ): Promise<ApiResponse<WhatsAppFollowup>> {
    return this.handleRequest(
      this.client.post("/api/whatsapp/followups", followup)
    );
  }

  async getWhatsappTemplates(): Promise<ApiResponse<unknown[]>> {
    return this.handleRequest(this.client.get("/api/whatsapp/templates"));
  }

  // Statistics API
  async getDashboardStats(): Promise<ApiResponse<{
    totalLeads: number;
    activeCalls: number;
    todayAppointments: number;
    pendingFollowups: number;
    successRate: number;
    avgCallDuration: number;
  }>> {
    return this.handleRequest(this.client.get("/api/statistics/dashboard"));
  }

  async getCallCenterStats(): Promise<ApiResponse<{
    activeCalls: number;
    todaysCalls: number;
    successRate: number;
    avgDuration: number;
    yesterdayComparison: number;
  }>> {
    return this.handleRequest(this.client.get("/api/statistics/call-center"));
  }

  async getLeadStats(): Promise<ApiResponse<{
    totalLeads: number;
    newThisWeek: number;
    conversionRate: number;
  }>> {
    return this.handleRequest(this.client.get("/api/statistics/leads"));
  }

  async getActiveCallsWithDetails(): Promise<ApiResponse<Array<{
    id: string;
    leadId: string;
    name: string;
    phoneNumber: string;
    duration: number;
    status: string;
    startTime: string;
    conversationId?: string;
  }>>> {
    return this.handleRequest(this.client.get("/api/statistics/active-calls"));
  }

  async getCallHistory(limit: number = 10): Promise<ApiResponse<Array<{
    id: string;
    leadId: string;
    name: string;
    phoneNumber: string;
    duration: number;
    outcome: 'interested' | 'not_interested' | 'callback' | 'appointment' | 'no_answer';
    endTime: string;
    notes?: string;
  }>>> {
    return this.handleRequest(
      this.client.get(`/api/statistics/call-history?limit=${limit}`)
    );
  }

  async getRecentActivity(limit: number = 20): Promise<ApiResponse<Array<{
    id: string;
    type: 'lead_created' | 'call_completed' | 'appointment_booked' | 'campaign_started' | 'lead_updated';
    title: string;
    description: string;
    timestamp: string;
    entityId: string;
    entityType: 'lead' | 'call' | 'appointment' | 'campaign';
    metadata?: Record<string, unknown>;
  }>>> {
    return this.handleRequest(
      this.client.get(`/api/statistics/recent-activity?limit=${limit}`)
    );
  }

  // Auth API
  async register(
    companyName: string,
    name: string,
    email: string,
    password: string,
    domain?: string
  ): Promise<ApiResponse<{ 
    token: string; 
    user: unknown; 
    tenant: unknown 
  }>> {
    return this.handleRequest(
      this.client.post("/api/auth/register", {
        companyName,
        name,
        email,
        password,
        domain
      })
    );
  }

  async login(
    email: string,
    password: string
  ): Promise<ApiResponse<{ token: string; user: unknown }>> {
    return this.handleRequest(
      this.client.post("/api/auth/login", { email, password })
    );
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.handleRequest(this.client.post("/api/auth/logout"));
  }

  async getCurrentUser(): Promise<ApiResponse<unknown>> {
    return this.handleRequest(this.client.get("/api/auth/me"));
  }

  // Campaigns API
  async createCampaign(campaign: {
    name: string;
    agentId: string;
    leadIds: string[];
    customMessage?: string;
    scheduledAt?: string;
  }): Promise<ApiResponse<{
    id: string;
    name: string;
    status: string;
    totalLeads: number;
    called: number;
    successful: number;
    failed: number;
    createdAt: string;
  }>> {
    return this.handleRequest(
      this.client.post("/api/campaigns", campaign)
    );
  }

  /**
   * Refresh a specific campaign status from ElevenLabs
   */
  async refreshCampaignStatus(campaignId: string): Promise<ApiResponse<{
    success: boolean;
    message: string;
    campaign: Campaign;
  }>> {
    return this.handleRequest(
      this.client.post(`/api/campaigns/${campaignId}/refresh`)
    );
  }

  /**
   * Refresh all active campaign statuses
   */
  async refreshAllCampaignStatuses(): Promise<ApiResponse<{
    success: boolean;
    message: string;
    campaignsPolled: number;
  }>> {
    return this.handleRequest(
      this.client.post("/api/campaigns/refresh-all")
    );
  }

  async getCampaigns(): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
    totalLeads: number;
    called: number;
    successful: number;
    failed: number;
    scheduledAt?: string;
    startedAt?: string;
    completedAt?: string;
    agentId: string;
    customMessage?: string;
    createdAt: string;
  }>>> {
    return this.handleRequest(this.client.get("/api/campaigns"));
  }

  async getCampaign(campaignId: string): Promise<ApiResponse<{
    id: string;
    name: string;
    status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
    totalLeads: number;
    called: number;
    successful: number;
    failed: number;
    scheduledAt?: string;
    startedAt?: string;
    completedAt?: string;
    agentId: string;
    customMessage?: string;
    createdAt: string;
  }>> {
    return this.handleRequest(this.client.get(`/api/campaigns/${campaignId}`));
  }

  async startCampaign(campaignId: string): Promise<ApiResponse<void>> {
    return this.handleRequest(
      this.client.post(`/api/campaigns/${campaignId}/start`)
    );
  }

  async pauseCampaign(campaignId: string): Promise<ApiResponse<void>> {
    return this.handleRequest(
      this.client.post(`/api/campaigns/${campaignId}/pause`)
    );
  }

  async getCampaignCalls(campaignId: string): Promise<ApiResponse<Array<{
    id: string;
    leadId: string;
    leadName: string;
    phoneNumber: string;
    status: 'pending' | 'calling' | 'completed' | 'failed';
    conversationId?: string;
    startedAt?: string;
    completedAt?: string;
    duration?: number;
    outcome?: 'interested' | 'not_interested' | 'callback' | 'appointment' | 'no_answer';
    error?: string;
  }>>> {
    return this.handleRequest(
      this.client.get(`/api/campaigns/${campaignId}/calls`)
    );
  }

  // Analytics API
  async getAnalytics(dateFrom?: string, dateTo?: string): Promise<ApiResponse<{
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
  }>> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.handleRequest(
      this.client.get(`/api/analytics?${params.toString()}`)
    );
  }

  async getAnalyticsOverview(dateFrom?: string, dateTo?: string): Promise<ApiResponse<{
    totalCalls: number;
    totalLeads: number;
    conversionRate: number;
    avgCallDuration: number;
    totalCampaigns: number;
    successRate: number;
  }>> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.handleRequest(
      this.client.get(`/api/analytics/overview?${params.toString()}`)
    );
  }

  async exportAnalytics(dateFrom?: string, dateTo?: string): Promise<Blob> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    const response = await this.client.get(`/api/analytics/export?${params.toString()}`, {
      responseType: 'blob'
    });
    
    return response.data;
  }

  // Recordings API
  async getCallRecordings(limit: number = 50): Promise<ApiResponse<Array<{
    id: string;
    callId: string;
    leadName: string;
    phoneNumber: string;
    duration: number;
    recordingUrl?: string;
    startTime: string;
    endTime: string;
    outcome: string;
    agentId: string;
  }>>> {
    return this.handleRequest(
      this.client.get(`/api/recordings/conversations?limit=${limit}`)
    );
  }

  async getRecordingDetails(conversationId: string): Promise<ApiResponse<{
    id: string;
    callId: string;
    leadName: string;
    phoneNumber: string;
    duration: number;
    recordingUrl: string;
    transcript: Array<{
      id: string;
      speaker: 'agent' | 'customer';
      text: string;
      startTime: number;
      endTime: number;
      confidence: number;
      sentiment?: 'positive' | 'neutral' | 'negative';
    }>;
    startTime: string;
    endTime: string;
    outcome: string;
    agentId: string;
  }>> {
    return this.handleRequest(
      this.client.get(`/api/recordings/${conversationId}/details`)
    );
  }

  async getRecordingAudio(conversationId: string): Promise<ApiResponse<{
    audioUrl: string;
  }>> {
    return this.handleRequest(
      this.client.get(`/api/recordings/${conversationId}/audio`)
    );
  }

  async getCampaignRecordings(campaignId: string): Promise<ApiResponse<Array<{
    id: string;
    callId: string;
    leadName: string;
    phoneNumber: string;
    duration: number;
    recordingUrl: string;
    startTime: string;
    endTime: string;
    outcome: string;
    agentId: string;
  }>>> {
    return this.handleRequest(
      this.client.get(`/api/recordings/campaign/${campaignId}`)
    );
  }

}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
