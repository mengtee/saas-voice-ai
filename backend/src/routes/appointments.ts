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
      const { eventTypeId, timezone = 'Asia/Kuala_Lumpur' } = req.query;
      let { startDate, endDate } = req.query;

      if (!eventTypeId) {
        return res.status(400).json({
          success: false,
          error: 'eventTypeId is required'
        });
      }

      // Default to current date if not provided
      if (!startDate) {
        const now = new Date();
        startDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      }

      // Default endDate to 30 days from startDate if not provided
      if (!endDate) {
        const start = new Date(startDate as string);
        const end = new Date(start);
        end.setDate(start.getDate() + 30);
        endDate = end.toISOString().split('T')[0];
      }

      const result = await appointmentService.getAvailableSlots(
        eventTypeId as string,
        startDate as string,
        endDate as string,
        timezone as string
      );

      res.json(result);
    } catch (error) {
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

      // console.log('AI Agent datetime request:', req.query);

      const now = new Date();
      let targetDate = new Date(now);

      // Perform date calculations based on operation
      switch (operation) {
        case 'add_days':
          targetDate.setDate(now.getDate() + daysNum);
          break;
        case 'add_weeks':
          targetDate.setDate(now.getDate() + (weeksNum * 7));
          break;
        case 'add_months':
          targetDate.setMonth(now.getMonth() + monthsNum);
          break;
        case 'current':
        default:
          // targetDate is already set to now
          break;
      }

      const result = {
        success: true,
        data: {
          operation,
          startDate: now.toISOString().split('T')[0],
          startDateTime: now.toISOString(),
          startTime: now.toTimeString().split(' ')[0],
          endDate: targetDate.toISOString().split('T')[0],
          endDateTime: targetDate.toISOString(),
          timezone: {
            name: timezone,
            startDate: new Date(now.toLocaleString('en-US', { timeZone: timezone as string })).toISOString().split('T')[0],
            startTime: now.toLocaleTimeString('en-GB', { timeZone: timezone as string, hour12: false }),
            endDate: new Date(targetDate.toLocaleString('en-US', { timeZone: timezone as string })).toISOString().split('T')[0],
            endTime: targetDate.toLocaleTimeString('en-GB', { timeZone: timezone as string, hour12: false })
          },
          timestamp: now.getTime(),
          calculations: {
            days_added: daysNum,
            weeks_added: weeksNum,
            months_added: monthsNum
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
        const newLeadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        tenantId = 'default-tenant'; // You might want to determine this differently
        
        const createLeadQuery = `
          INSERT INTO leads (id, tenant_id, date, name, phone_number, email, status, created_at, updated_at)
          VALUES ($1, $2, NOW(), $3, $4, $5, 'scheduled', NOW(), NOW())
          RETURNING *
        `;
        
        const newLeadResult = await appointmentService.query(createLeadQuery, [
          newLeadId, tenantId, customerName, phoneNumber, customerEmail
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

      // Book through Cal.com
      // console.log(`🔍 Attempting to book Cal.com appointment for ${customerName} at ${preferredDateTime}`);
      const bookingResult = await appointmentService.bookCalComAppointment({
        eventTypeId: parseInt(eventTypeId),
        start: preferredDateTime,
        attendee: {
          name: customerName,
          email: customerEmail,
          timeZone: customerTimezone
        },
        title: `${meetingType === 'demo' ? 'Product Demo' : 'Consultation'} - ${customerName}`,
        description: `AI-scheduled ${meetingType}. Phone: ${phoneNumber}. Notes: ${notes || 'No additional notes'}`,
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