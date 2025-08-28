import axios, { AxiosInstance, AxiosResponse } from "axios";
import {
  ApiResponse,
  PaginatedResponse,
  Lead,
  Call,
  Appointment,
  WhatsAppFollowup,
  CallMetrics,
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
    dateFrom?: string,
    dateTo?: string
  ): Promise<ApiResponse<Appointment[]>> {
    const params = new URLSearchParams();
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

  // Auth API
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
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
