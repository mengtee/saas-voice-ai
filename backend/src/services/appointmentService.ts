import { BaseService } from './base';
import { Pool } from 'pg';
import { Config } from '../config';

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

export interface CreateAppointmentData {
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
  timezone?: string;
  duration_minutes?: number;
  status?: Appointment['status'];
  booking_status?: Appointment['booking_status'];
  meeting_url?: string;
  meeting_password?: string;
  location?: string;
  booked_by?: Appointment['booked_by'];
  booking_reference?: string;
}

export interface CalComSlotResponse {
  available: boolean;
  slots: {
    time: string;
    attendees: number;
    bookingUid: string;
  }[];
}

export interface CalComBookingRequest {
  eventTypeId: number;
  start: string;
  end?: string;
  attendee: {
    name: string;
    email: string;
    timeZone: string;
    language?: string;
  };
  meetingUrl?: string;
  title?: string;
  description?: string;
  location?: string;
  customInputs?: Record<string, any>;
}

export interface CalComBookingResponse {
  id: number;
  uid: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  attendees: {
    name: string;
    email: string;
    timeZone: string;
  }[];
  location?: string;
  status: string;
  references?: {
    type: string;
    uid: string;
    meetingUrl?: string;
    meetingPassword?: string;
  }[];
}

export class AppointmentService extends BaseService {
  private calComApiUrl = 'https://api.cal.com';
  private calComApiKey: string;

  constructor(pool: Pool, config?: Config) {
    super({ pool });
    this.calComApiKey = config?.calComApiKey || '';
    console.log('🔍 Cal.com API Key loaded:', this.calComApiKey ? 'YES' : 'NO');
    console.log('🔍 Raw API Key:', this.calComApiKey ? this.calComApiKey.substring(0, 20) + '...' : 'EMPTY');
  }

  /**
   * Create a new appointment record
   */
  async createAppointment(data: CreateAppointmentData): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    try {
      const appointmentId = `appointment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const query = `
        INSERT INTO appointments (
          id, tenant_id, lead_id, campaign_id, conversation_id,
          cal_booking_id, cal_event_type_id, title, description,
          attendee_name, attendee_email, attendee_phone,
          start_time, end_time, timezone, duration_minutes,
          status, booking_status, meeting_url, meeting_password,
          location, booked_by, booking_reference, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, NOW(), NOW()
        )
        RETURNING *
      `;

      const values = [
        appointmentId,
        data.tenant_id,
        data.lead_id || null,
        data.campaign_id || null,
        data.conversation_id || null,
        data.cal_booking_id || null,
        data.cal_event_type_id || null,
        data.title,
        data.description || null,
        data.attendee_name,
        data.attendee_email,
        data.attendee_phone || null,
        data.start_time,
        data.end_time,
        data.timezone || 'Asia/Kuala_Lumpur',
        data.duration_minutes || 30,
        data.status || 'scheduled',
        data.booking_status || 'pending',
        data.meeting_url || null,
        data.meeting_password || null,
        data.location || null,
        data.booked_by || 'ai_agent',
        data.booking_reference || null
      ];

      const result = await this.query(query, values);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Failed to create appointment' };
      }

      return { success: true, appointment: result.rows[0] as Appointment };
    } catch (error) {
      console.error('Error creating appointment:', error);
      return { success: false, error: 'Failed to create appointment' };
    }
  }

  /**
   * Get available time slots from Cal.com
   */
  async getAvailableSlots(eventTypeId: string, startDate: string, endDate: string, timezone = 'Asia/Kuala_Lumpur'): Promise<{ success: boolean; slots?: any[]; error?: string }> {
    try {
      if (!this.calComApiKey) {
        return { success: false, error: 'Cal.com API key not configured' };
      }

      const url = new URL(`${this.calComApiUrl}/v1/slots`);
      url.searchParams.append('apiKey', this.calComApiKey);  // v1 uses apiKey in query
      url.searchParams.append('eventTypeId', eventTypeId);
      url.searchParams.append('startTime', startDate);  // v1 uses startTime/endTime
      url.searchParams.append('endTime', endDate);      
      url.searchParams.append('timeZone', timezone);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Cal.com API error:', response.status, errorData);
        return { success: false, error: `Cal.com API error: ${response.status}` };
      }

      const data = await response.json();
      
      // Cal.com v1 returns slots organized by date
      const slots: any[] = [];
      if (data.slots) {
        // Flatten the date-organized slots into a single array
        Object.keys(data.slots).forEach(date => {
          const dateslots = data.slots[date] || [];
          dateslots.forEach((slot: any) => {
            slots.push({
              start: slot.time,
              date: date
            });
          });
        });
      }
      
      return { success: true, slots };
    } catch (error) {
      console.error('Error getting available slots:', error);
      return { success: false, error: 'Failed to get available slots' };
    }
  }

  /**
   * Book an appointment through Cal.com
   */
  async bookCalComAppointment(bookingData: CalComBookingRequest): Promise<{ success: boolean; booking?: CalComBookingResponse; error?: string }> {
    try {
      if (!this.calComApiKey) {
        return { success: false, error: 'Cal.com API key not configured' };
      }

      // Transform our booking data to match Cal.com v2 API schema
      const calComPayload = {
        start: bookingData.start,
        eventTypeId: parseInt(bookingData.eventTypeId.toString()),
        attendee: {
          name: bookingData.attendee.name,
          email: bookingData.attendee.email,
          timeZone: bookingData.attendee.timeZone || 'Asia/Kuala_Lumpur'
        },
        ...(bookingData.location && { location: bookingData.location })
      };

      const response = await fetch(`${this.calComApiUrl}/v2/bookings`, {
        method: 'POST',
        headers: {
          'cal-api-version': '2024-08-13',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.calComApiKey}`
        },
        body: JSON.stringify(calComPayload)
      });

      console.log("this is the api key ", this.calComApiKey)
      console.log("this is the response ", response)
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Cal.com booking error:', response.status, errorData);
        return { success: false, error: `Cal.com booking error: ${response.status}` };
      }

      const responseData = await response.json();
      
      // Cal.com v2 response structure
      if (responseData.status === 'success' && responseData.data) {
        return { success: true, booking: responseData.data };
      } else {
        return { success: false, error: 'Unexpected response format from Cal.com' };
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      return { success: false, error: 'Failed to book appointment' };
    }
  }

  /**
   * Sync Cal.com booking with local database
   */
  async syncCalComBooking(calBooking: CalComBookingResponse, tenantId: string, leadId?: string, campaignId?: string, conversationId?: string): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    try {
      const appointmentData: CreateAppointmentData = {
        tenant_id: tenantId,
        lead_id: leadId,
        campaign_id: campaignId,
        conversation_id: conversationId,
        cal_booking_id: calBooking.uid,
        cal_event_type_id: String(calBooking.id),
        title: calBooking.title,
        description: calBooking.description,
        attendee_name: calBooking.attendees[0]?.name || '',
        attendee_email: calBooking.attendees[0]?.email || '',
        start_time: calBooking.start,
        end_time: calBooking.end,
        timezone: calBooking.attendees[0]?.timeZone || 'Asia/Kuala_Lumpur',
        duration_minutes: Math.round((new Date(calBooking.end).getTime() - new Date(calBooking.start).getTime()) / (1000 * 60)),
        status: 'scheduled',
        booking_status: calBooking.status === 'ACCEPTED' ? 'confirmed' : 'pending',
        location: calBooking.location,
        meeting_url: calBooking.references?.find(ref => ref.type === 'conferencing')?.meetingUrl,
        meeting_password: calBooking.references?.find(ref => ref.type === 'conferencing')?.meetingPassword,
        booked_by: 'ai_agent',
        booking_reference: calBooking.uid
      };

      return await this.createAppointment(appointmentData);
    } catch (error) {
      console.error('Error syncing Cal.com booking:', error);
      return { success: false, error: 'Failed to sync booking' };
    }
  }

  /**
   * Get appointments for a tenant
   */
  async getAppointments(tenantId: string, limit = 50, offset = 0): Promise<{ success: boolean; appointments?: Appointment[]; total?: number; error?: string }> {
    try {
      const countQuery = 'SELECT COUNT(*) FROM appointments WHERE tenant_id = $1';
      const countResult = await this.query(countQuery, [tenantId]);
      const total = parseInt(countResult.rows[0].count);

      const query = `
        SELECT a.*, l.name as lead_name, c.name as campaign_name
        FROM appointments a
        LEFT JOIN leads l ON a.lead_id IS NOT NULL AND a.lead_id::uuid = l.id
        LEFT JOIN campaigns c ON a.campaign_id = c.id
        WHERE a.tenant_id = $1
        ORDER BY a.start_time DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.query(query, [tenantId, limit, offset]);
      return { success: true, appointments: result.rows as Appointment[], total };
    } catch (error) {
      console.error('Error getting appointments:', error);
      return { success: false, error: 'Failed to get appointments' };
    }
  }

  /**
   * Get appointment by ID
   */
  async getAppointment(appointmentId: string, tenantId: string): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    try {
      const query = `
        SELECT a.*, l.name as lead_name, c.name as campaign_name
        FROM appointments a
        LEFT JOIN leads l ON a.lead_id IS NOT NULL AND a.lead_id::uuid = l.id
        LEFT JOIN campaigns c ON a.campaign_id = c.id
        WHERE a.id = $1 AND a.tenant_id = $2
      `;

      const result = await this.query(query, [appointmentId, tenantId]);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Appointment not found' };
      }

      return { success: true, appointment: result.rows[0] as Appointment };
    } catch (error) {
      console.error('Error getting appointment:', error);
      return { success: false, error: 'Failed to get appointment' };
    }
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(appointmentId: string, tenantId: string, status: Appointment['status'], bookingStatus?: Appointment['booking_status']): Promise<{ success: boolean; error?: string }> {
    try {
      const updates = ['status = $3', 'updated_at = NOW()'];
      const values = [appointmentId, tenantId, status];
      let paramCount = 3;

      if (bookingStatus) {
        paramCount++;
        updates.push(`booking_status = $${paramCount}`);
        values.push(bookingStatus);
      }

      if (status === 'confirmed') {
        paramCount++;
        updates.push(`confirmed_at = NOW()`);
      } else if (status === 'cancelled') {
        paramCount++;
        updates.push(`cancelled_at = NOW()`);
      } else if (status === 'completed') {
        paramCount++;
        updates.push(`completed_at = NOW()`);
      }

      const query = `
        UPDATE appointments 
        SET ${updates.join(', ')}
        WHERE id = $1 AND tenant_id = $2
      `;

      await this.query(query, values);
      return { success: true };
    } catch (error) {
      console.error('Error updating appointment status:', error);
      return { success: false, error: 'Failed to update appointment status' };
    }
  }

  /**
   * Cancel Cal.com booking
   */
  async cancelCalComBooking(bookingUid: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.calComApiKey) {
        return { success: false, error: 'Cal.com API key not configured' };
      }

      const response = await fetch(`${this.calComApiUrl}/v2/bookings/${bookingUid}/cancel`, {
        method: 'DELETE',
        headers: {
          'cal-api-version': '2024-08-13',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.calComApiKey}`
        },
        body: JSON.stringify({ reason: reason || 'Cancelled by system' })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Cal.com cancellation error:', response.status, errorData);
        return { success: false, error: `Cal.com cancellation error: ${response.status}` };
      }

      const responseData = await response.json();
      
      // Check for v1 response format
      if (responseData && (responseData.id || responseData.message)) {
        return { success: true };
      } else {
        return { success: false, error: responseData.error || 'Failed to cancel booking' };
      }
    } catch (error) {
      console.error('Error cancelling Cal.com booking:', error);
      return { success: false, error: 'Failed to cancel booking' };
    }
  }
}