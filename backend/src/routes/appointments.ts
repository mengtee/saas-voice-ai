import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { Config } from '../config';
import { createAuthMiddleware } from '../middleware/auth';
import { AppointmentService } from '../services/appointmentService';

export function createAppointmentsRoutes(pool: Pool, config: Config) {
  const router = Router();
  const appointmentService = new AppointmentService(pool, config);
  const authenticateToken = createAuthMiddleware(pool, config);

  /**
   * Get available time slots from Cal.com
   */
  router.get('/slots', async (req: Request, res: Response) => {
    try {
      const { eventTypeId } = req.query;
      let { startDate, endDate } = req.query;

      if (!eventTypeId) {
        return res.status(400).json({
          success: false,
          error: 'eventTypeId is required'
        });
      }

      // Always use Malaysia timezone
      const malaysiaTimezone = 'Asia/Kuala_Lumpur';
      
      // Default to current date in Malaysia timezone if not provided
      if (!startDate) {
        const now = new Date();
        const malaysiaTime = new Date(now.toLocaleString('en-US', { timeZone: malaysiaTimezone }));
        const year = malaysiaTime.getFullYear();
        const month = String(malaysiaTime.getMonth() + 1).padStart(2, '0');
        const day = String(malaysiaTime.getDate()).padStart(2, '0');
        startDate = `${year}-${month}-${day}`;
      }

      // Default endDate to 30 days from startDate if not provided
      if (!endDate) {
        const start = new Date(startDate as string + 'T00:00:00+08:00'); // Malaysia timezone
        const end = new Date(start);
        end.setDate(start.getDate() + 30);
        const year = end.getFullYear();
        const month = String(end.getMonth() + 1).padStart(2, '0');
        const day = String(end.getDate()).padStart(2, '0');
        endDate = `${year}-${month}-${day}`;
      }

      console.log(`🔍 Getting slots for eventType ${eventTypeId} from ${startDate} to ${endDate} in ${malaysiaTimezone}`);

      const result = await appointmentService.getAvailableSlots(
        eventTypeId as string,
        startDate as string,
        endDate as string,
        malaysiaTimezone
      );

      res.json(result);
    } catch (error) {
      console.error('Error getting slots:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get available slots'
      });
    }
  });

  /**
   * Book an appointment through Cal.com
   */
  router.post('/book', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { 
        eventTypeId, 
        start, 
        end,
        attendeeName, 
        attendeeEmail, 
        attendeeTimeZone,
        title,
        description,
        location,
        leadId,
        campaignId,
        conversationId
      } = req.body;

      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      if (!eventTypeId || !start || !attendeeName || !attendeeEmail) {
        return res.status(400).json({
          success: false,
          error: 'eventTypeId, start, attendeeName, and attendeeEmail are required'
        });
      }

      // Book through Cal.com
      const bookingResult = await appointmentService.bookCalComAppointment({
        eventTypeId: parseInt(eventTypeId),
        start,
        end,
        attendee: {
          name: attendeeName,
          email: attendeeEmail,
          timeZone: attendeeTimeZone || 'Asia/Kuala_Lumpur'
        },
        title,
        description,
        location
      });

      if (!bookingResult.success || !bookingResult.booking) {
        return res.status(400).json({
          success: false,
          error: bookingResult.error || 'Failed to book appointment'
        });
      }

      // Sync with local database
      const syncResult = await appointmentService.syncCalComBooking(
        bookingResult.booking,
        tenantId,
        leadId,
        campaignId,
        conversationId
      );

      if (!syncResult.success) {
        console.error('Failed to sync booking to database:', syncResult.error);
        // Note: Cal.com booking was successful, but local sync failed
        return res.json({
          success: true,
          data: bookingResult.booking,
          warning: 'Appointment booked successfully but failed to sync to local database'
        });
      }

      res.json({
        success: true,
        data: {
          calcomBooking: bookingResult.booking,
          appointment: syncResult.appointment
        }
      });
    } catch (error) {
      console.error('Error booking appointment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to book appointment'
      });
    }
  });

  /**
   * Get appointments for the authenticated tenant
   */
  router.get('/', authenticateToken, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenant_id;
      const { limit = 50, offset = 0 } = req.query;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const result = await appointmentService.getAppointments(
        tenantId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        success: true,
        data: {
          appointments: result.appointments || [],
          total: result.total || 0
        }
      });
    } catch (error) {
      console.error('Error getting appointments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get appointments'
      });
    }
  });


  /**
   * Get calendar statistics
   */
  router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Get current date boundaries
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      // Query for today's appointments
      const todayQuery = `
        SELECT COUNT(*) as count, status, booking_status
        FROM appointments 
        WHERE tenant_id = $1 
        AND start_time >= $2 
        AND start_time < $3
        GROUP BY status, booking_status
      `;
      
      const todayResult = await appointmentService.query(todayQuery, [
        tenantId, 
        today.toISOString(), 
        tomorrow.toISOString()
      ]);

      // Query for this week's appointments
      const weekQuery = `
        SELECT COUNT(*) as count
        FROM appointments 
        WHERE tenant_id = $1 
        AND start_time >= $2 
        AND start_time < $3
      `;
      
      const weekResult = await appointmentService.query(weekQuery, [
        tenantId,
        startOfWeek.toISOString(),
        endOfWeek.toISOString()
      ]);

      // Calculate stats
      const todayStats = { confirmed: 0, pending: 0, cancelled: 0 };
      let todayTotal = 0;
      
      todayResult.rows.forEach((row: any) => {
        const count = parseInt(row.count);
        todayTotal += count;
        
        if (row.status === 'confirmed' || row.booking_status === 'confirmed') {
          todayStats.confirmed += count;
        } else if (row.status === 'cancelled' || row.booking_status === 'cancelled') {
          todayStats.cancelled += count;
        } else {
          todayStats.pending += count;
        }
      });

      const thisWeekTotal = parseInt(weekResult.rows[0]?.count || '0');

      // Calculate average duration (simplified - could be more sophisticated)
      const avgQuery = `
        SELECT AVG(duration_minutes) as avg_duration
        FROM appointments 
        WHERE tenant_id = $1 
        AND status = 'completed'
        AND duration_minutes IS NOT NULL
      `;
      
      const avgResult = await appointmentService.query(avgQuery, [tenantId]);
      const avgDuration = Math.round(parseFloat(avgResult.rows[0]?.avg_duration || '30'));

      // Calculate show rate (completed vs total)
      const showRateQuery = `
        SELECT 
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(*) as total
        FROM appointments 
        WHERE tenant_id = $1 
        AND start_time < NOW()
      `;
      
      const showRateResult = await appointmentService.query(showRateQuery, [tenantId]);
      const completed = parseInt(showRateResult.rows[0]?.completed || '0');
      const total = parseInt(showRateResult.rows[0]?.total || '1');
      const showRate = Math.round((completed / total) * 100);

      res.json({
        success: true,
        data: {
          todayAppointments: todayTotal,
          thisWeekAppointments: thisWeekTotal,
          showRate: showRate,
          avgDuration: avgDuration,
          todayStats: todayStats
        }
      });
    } catch (error) {
      console.error('Error getting calendar stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get calendar stats'
      });
    }
  });

  /**
   * AI Agent endpoint for getting current date/time
   * Called by AI agents to get current date and calculate relative dates
   */
  router.get('/ai-datetime', async (req: Request, res: Response) => {
    try {
      const { 
        operation = 'current',
        days = '0',
        weeks = '0',
        months = '0',
        timezone = 'Asia/Kuala_Lumpur'
      } = req.query;

      // Convert string params to numbers
      const daysNum = parseInt(days as string) || 0;
      const weeksNum = parseInt(weeks as string) || 0;
      const monthsNum = parseInt(months as string) || 0;

      // Always use Malaysia timezone for consistency
      const malaysiaTimezone = 'Asia/Kuala_Lumpur';
      
      // Get current time in Malaysia timezone
      const now = new Date();
      const malaysiaTime = new Date(now.toLocaleString('en-US', { timeZone: malaysiaTimezone }));
      let targetDate = new Date(malaysiaTime);

      // Perform date calculations based on operation
      switch (operation) {
        case 'add_days':
          targetDate.setDate(malaysiaTime.getDate() + daysNum);
          break;
        case 'add_weeks':
          targetDate.setDate(malaysiaTime.getDate() + (weeksNum * 7));
          break;
        case 'add_months':
          targetDate.setMonth(malaysiaTime.getMonth() + monthsNum);
          break;
        case 'current':
        default:
          // targetDate is already set to malaysiaTime
          break;
      }

      // Format dates in Malaysia timezone
      const formatMalaysiaDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const formatMalaysiaTime = (date: Date) => {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
      };

      const formatMalaysiaDateTime = (date: Date) => {
        return `${formatMalaysiaDate(date)}T${formatMalaysiaTime(date)}:00+08:00`;
      };

      const result = {
        success: true,
        data: {
          operation,
          startDate: formatMalaysiaDate(malaysiaTime),
          startDateTime: formatMalaysiaDateTime(malaysiaTime),
          startTime: formatMalaysiaTime(malaysiaTime),
          endDate: formatMalaysiaDate(targetDate),
          endDateTime: formatMalaysiaDateTime(targetDate),
          timezone: {
            name: malaysiaTimezone,
            startDate: formatMalaysiaDate(malaysiaTime),
            startTime: formatMalaysiaTime(malaysiaTime),
            endDate: formatMalaysiaDate(targetDate),
            endTime: formatMalaysiaTime(targetDate)
          },
          timestamp: malaysiaTime.getTime(),
          calculations: {
            days_added: daysNum,
            weeks_added: weeksNum,
            months_added: monthsNum
          },
          debug: {
            utcTime: now.toISOString(),
            malaysiaTime: malaysiaTime.toISOString(),
            timezoneOffset: malaysiaTime.getTimezoneOffset()
          }
        }
      };

      res.json(result);
    } catch (error) {
      console.error('Error in AI datetime request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get datetime information'
      });
    }
  });

  /**
   * Get a specific appointment
   */
  router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const result = await appointmentService.getAppointment(id, tenantId);
      res.json(result);
    } catch (error) {
      console.error('Error getting appointment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get appointment'
      });
    }
  });

  /**
   * Update appointment status
   */
  router.patch('/:id/status', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, bookingStatus } = req.body;
      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'status is required'
        });
      }

      const result = await appointmentService.updateAppointmentStatus(
        id, 
        tenantId, 
        status, 
        bookingStatus
      );

      res.json(result);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update appointment status'
      });
    }
  });

  /**
   * Cancel an appointment
   */
  router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Get appointment to find Cal.com booking ID
      const appointmentResult = await appointmentService.getAppointment(id, tenantId);
      
      if (!appointmentResult.success || !appointmentResult.appointment) {
        return res.status(404).json({
          success: false,
          error: 'Appointment not found'
        });
      }

      const appointment = appointmentResult.appointment;

      // Cancel in Cal.com if we have a booking ID
      if (appointment.cal_booking_id) {
        const cancelResult = await appointmentService.cancelCalComBooking(
          appointment.cal_booking_id,
          reason
        );

        if (!cancelResult.success) {
          console.error('Failed to cancel Cal.com booking:', cancelResult.error);
          // Continue with local cancellation even if Cal.com fails
        }
      }

      // Update local status
      const updateResult = await appointmentService.updateAppointmentStatus(
        id,
        tenantId,
        'cancelled',
        'cancelled'
      );

      res.json(updateResult);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel appointment'
      });
    }
  });


  /**
   * AI Agent webhook endpoint for scheduling appointments
   * Called by ElevenLabs AI agents during phone conversations
   */
  router.post('/ai-schedule', async (req: Request, res: Response) => {
    try {
      const { 
        conversationId,
        phoneNumber,
        customerName,
        customerEmail,
        preferredDateTime,
        customerTimezone = 'Asia/Kuala_Lumpur',
        meetingType = 'consultation',
        notes,
        agentId,
        leadId,
        campaignId
      } = req.body;

      // console.log('AI Agent scheduling request:', req.body);

      // Validate required fields
      if (!phoneNumber || !customerName || !customerEmail || !preferredDateTime) {
        console.error('❌ Missing required fields:', { phoneNumber: !!phoneNumber, customerName: !!customerName, customerEmail: !!customerEmail, preferredDateTime: !!preferredDateTime });
        return res.status(400).json({
          success: false,
          error: 'phoneNumber, customerName, customerEmail, and preferredDateTime are required'
        });
      }

      // Find or create lead based on phone number
      const leadQuery = `
        SELECT * FROM leads 
        WHERE phone_number = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      const leadResult = await appointmentService.query(leadQuery, [phoneNumber]);
      
      let lead = leadResult.rows[0];
      let tenantId = lead?.tenant_id;

      // If no existing lead, create one
      if (!lead) {
        // Generate a proper UUID for tenant_id (you might want to determine this differently)
        const defaultTenantUuid = '00000000-0000-0000-0000-000000000001';
        tenantId = defaultTenantUuid;
        
        const createLeadQuery = `
          INSERT INTO leads (tenant_id, date, name, phone_number, email, status, created_at, updated_at)
          VALUES ($1, NOW(), $2, $3, $4, 'scheduled', NOW(), NOW())
          RETURNING *
        `;
        
        const newLeadResult = await appointmentService.query(createLeadQuery, [
          tenantId, customerName, phoneNumber, customerEmail
        ]);
        lead = newLeadResult.rows[0];
      } else {
        // Update existing lead status and info
        const updateLeadQuery = `
          UPDATE leads 
          SET name = COALESCE($1, name), 
              email = COALESCE($2, email),
              status = 'scheduled',
              updated_at = NOW()
          WHERE id = $3
        `;
        await appointmentService.query(updateLeadQuery, [customerName, customerEmail, lead.id]);
      }

      // Determine event type based on meeting type
      const eventTypeId = meetingType === 'demo' ? '3207916' : '3207916';

      // Always use Malaysia timezone for consistency
      const malaysiaTimezone = 'Asia/Kuala_Lumpur';
      
      // Validate that preferredDateTime is in the future (Malaysia time)
      const now = new Date();
      const malaysiaTime = new Date(now.toLocaleString('en-US', { timeZone: malaysiaTimezone }));
      
      // Parse preferredDateTime and ensure it's in Malaysia timezone
      let requestedTime: Date;
      try {
        // If preferredDateTime doesn't have timezone info, assume Malaysia timezone
        if (preferredDateTime.includes('T') && !preferredDateTime.includes('+') && !preferredDateTime.includes('Z')) {
          requestedTime = new Date(preferredDateTime + '+08:00'); // Add Malaysia timezone offset
        } else {
          requestedTime = new Date(preferredDateTime);
        }
      } catch (error) {
        console.error('❌ Invalid preferredDateTime format:', preferredDateTime);
        return res.status(400).json({
          success: false,
          error: `Invalid preferredDateTime format: ${preferredDateTime}. Expected ISO 8601 format.`
        });
      }
      
      // Check if the requested time is in the future (with 5-minute buffer)
      const fiveMinutesFromNow = new Date(malaysiaTime.getTime() + 5 * 60 * 1000);
      if (requestedTime <= fiveMinutesFromNow) {
        console.error('❌ Requested time is in the past or too soon:', {
          requestedTime: requestedTime.toISOString(),
          malaysiaTime: malaysiaTime.toISOString(),
          fiveMinutesFromNow: fiveMinutesFromNow.toISOString(),
          preferredDateTime
        });
        return res.status(400).json({
          success: false,
          error: `Cannot book appointment in the past or within 5 minutes. Requested: ${requestedTime.toLocaleString('en-US', { timeZone: malaysiaTimezone })}, Current Malaysia time: ${malaysiaTime.toLocaleString('en-US', { timeZone: malaysiaTimezone })}`
        });
      }

      // Ensure we send the datetime in proper ISO format to Cal.com
      const calComDateTime = requestedTime.toISOString();

      // Book through Cal.com
      console.log(`🔍 Attempting to book Cal.com appointment for ${customerName} at ${calComDateTime} (Malaysia time: ${requestedTime.toLocaleString('en-US', { timeZone: malaysiaTimezone })})`);
      const bookingResult = await appointmentService.bookCalComAppointment({
        eventTypeId: parseInt(eventTypeId),
        start: calComDateTime,
        attendee: {
          name: customerName,
          email: customerEmail,
          timeZone: malaysiaTimezone // Always use Malaysia timezone
        },
        title: `${meetingType === 'demo' ? 'Product Demo' : 'Consultation'} - ${customerName}`,
        description: `AI-scheduled ${meetingType}. Phone: ${phoneNumber}. Notes: ${notes || 'No additional notes'}. Original request: ${preferredDateTime}`,
        location: 'Google Meet'
      });

      console.log(`🔍 Cal.com booking result:`, JSON.stringify(bookingResult, null, 2));

      if (!bookingResult.success || !bookingResult.booking) {
        // Update lead status to failed
        await appointmentService.query(
          `UPDATE leads SET status = 'failed', updated_at = NOW() WHERE id = $1`,
          [lead.id]
        );
        
        return res.status(400).json({
          success: false,
          error: bookingResult.error || 'Failed to book appointment with Cal.com'
        });
      }

      // Sync with local database
      const syncResult = await appointmentService.syncCalComBooking(
        bookingResult.booking,
        tenantId,
        lead.id,
        campaignId,
        conversationId
      );

      // Update lead status to scheduled
      await appointmentService.query(
        `UPDATE leads SET status = 'scheduled', updated_at = NOW() WHERE id = $1`,
        [lead.id]
      );

      // If part of a campaign, update campaign stats
      if (campaignId) {
        await appointmentService.query(
          `UPDATE campaigns SET appointments_scheduled = COALESCE(appointments_scheduled, 0) + 1, updated_at = NOW() WHERE id = $1`,
          [campaignId]
        );
      }

      // Success response for AI agent
      const meetingUrl = bookingResult.booking.references?.find(ref => ref.type === 'conferencing')?.meetingUrl;
      const scheduledTime = new Date(bookingResult.booking.start);

      res.json({
        success: true,
        data: {
          appointmentId: syncResult.success ? syncResult.appointment?.id : null,
          calcomBookingId: bookingResult.booking.uid,
          leadId: lead.id,
          scheduledTime: bookingResult.booking.start,
          meetingUrl: meetingUrl,
          confirmationSent: true,
          message: `Appointment scheduled for ${customerName} on ${scheduledTime.toLocaleDateString()} at ${scheduledTime.toLocaleTimeString()}. Meeting link: ${meetingUrl || 'Will be provided via email'}`
        }
      });

    } catch (error) {
      console.error('Error in AI appointment scheduling:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to schedule appointment'
      });
    }
  });

  /**
   * Webhook endpoint for Cal.com events (for future use)
   */
  router.post('/webhook', async (req: Request, res: Response) => {
    try {
      // TODO: Implement webhook handling for Cal.com events
      // This will allow real-time updates from Cal.com
      // console.log('Cal.com webhook received:', req.body);
      
      res.json({ success: true, message: 'Webhook received' });
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to handle webhook'
      });
    }
  });

  return router;
}