import { Pool, PoolClient } from 'pg';
import { BaseService } from './base';

export interface DashboardStats {
  totalLeads: number;
  activeCalls: number;
  todayAppointments: number;
  pendingFollowups: number;
  successRate: number;
  avgCallDuration: number;
}

export interface CallCenterStats {
  activeCalls: number;
  todaysCalls: number;
  successRate: number;
  avgDuration: number;
  yesterdayComparison: number;
}

export interface LeadStats {
  totalLeads: number;
  newThisWeek: number;
  conversionRate: number;
}

export interface ActiveCall {
  id: string;
  leadId: string;
  name: string;
  phoneNumber: string;
  duration: number;
  status: string;
  startTime: string;
  conversationId?: string;
}

export interface CallHistoryEntry {
  id: string;
  leadId: string;
  name: string;
  phoneNumber: string;
  duration: number;
  outcome: 'interested' | 'not_interested' | 'callback' | 'appointment' | 'no_answer';
  endTime: string;
  notes?: string;
}

export class StatisticsService extends BaseService {
  constructor({ pool, client }: { pool?: Pool; client?: PoolClient }) {
    super({ pool, client });
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(tenantId: string): Promise<DashboardStats> {
    try {
      // Get total leads
      const totalLeadsResult = await this.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM leads WHERE tenant_id = $1',
        [tenantId]
      );
      const totalLeads = parseInt(totalLeadsResult.rows[0].count);

      // Get active calls (calls with status 'active')
      const activeCallsResult = await this.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM calls WHERE tenant_id = $1 AND status = $2',
        [tenantId, 'active']
      );
      const activeCalls = parseInt(activeCallsResult.rows[0].count);

      // Get today's appointments (placeholder - would need appointments table)
      const todayAppointments = 0; // TODO: Implement when appointments table exists

      // Get pending follow-ups (placeholder - would need whatsapp_followups table) 
      const pendingFollowups = 0; // TODO: Implement when whatsapp table exists

      // Calculate success rate based on completed calls
      const callStatsResult = await this.query<{ 
        total_calls: string; 
        successful_calls: string; 
        avg_duration: string;
      }>(
        `SELECT 
          COUNT(*) as total_calls,
          COUNT(CASE WHEN outcome IN ('interested', 'appointment', 'callback') THEN 1 END) as successful_calls,
          COALESCE(AVG(CASE WHEN duration > 0 THEN duration END), 0) as avg_duration
         FROM calls 
         WHERE tenant_id = $1 AND status = 'completed'`,
        [tenantId]
      );

      const totalCalls = parseInt(callStatsResult.rows[0].total_calls);
      const successfulCalls = parseInt(callStatsResult.rows[0].successful_calls);
      const avgCallDuration = Math.round(parseFloat(callStatsResult.rows[0].avg_duration) || 0);
      const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100 * 10) / 10 : 0;

      return {
        totalLeads,
        activeCalls,
        todayAppointments,
        pendingFollowups,
        successRate,
        avgCallDuration
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get call center statistics
   */
  async getCallCenterStats(tenantId: string): Promise<CallCenterStats> {
    try {
      // Get active calls
      const activeCallsResult = await this.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM calls WHERE tenant_id = $1 AND status = $2',
        [tenantId, 'active']
      );
      const activeCalls = parseInt(activeCallsResult.rows[0].count);

      // Get today's calls
      const todayCallsResult = await this.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM calls 
         WHERE tenant_id = $1 AND DATE(start_time) = CURRENT_DATE`,
        [tenantId]
      );
      const todaysCalls = parseInt(todayCallsResult.rows[0].count);

      // Get yesterday's calls for comparison
      const yesterdayCallsResult = await this.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM calls 
         WHERE tenant_id = $1 AND DATE(start_time) = CURRENT_DATE - INTERVAL '1 day'`,
        [tenantId]
      );
      const yesterdaysCalls = parseInt(yesterdayCallsResult.rows[0].count);

      // Calculate percentage change
      const yesterdayComparison = yesterdaysCalls > 0 
        ? Math.round(((todaysCalls - yesterdaysCalls) / yesterdaysCalls) * 100)
        : todaysCalls > 0 ? 100 : 0;

      // Get success rate and average duration for today
      const todayStatsResult = await this.query<{ 
        total_calls: string; 
        successful_calls: string; 
        avg_duration: string;
      }>(
        `SELECT 
          COUNT(*) as total_calls,
          COUNT(CASE WHEN outcome IN ('interested', 'appointment', 'callback') THEN 1 END) as successful_calls,
          COALESCE(AVG(CASE WHEN duration > 0 THEN duration END), 0) as avg_duration
         FROM calls 
         WHERE tenant_id = $1 AND status = 'completed' AND DATE(start_time) = CURRENT_DATE`,
        [tenantId]
      );

      const totalTodaysCalls = parseInt(todayStatsResult.rows[0].total_calls);
      const successfulTodaysCalls = parseInt(todayStatsResult.rows[0].successful_calls);
      const avgDuration = Math.round(parseFloat(todayStatsResult.rows[0].avg_duration) || 0);
      const successRate = totalTodaysCalls > 0 
        ? Math.round((successfulTodaysCalls / totalTodaysCalls) * 100 * 10) / 10 
        : 0;

      return {
        activeCalls,
        todaysCalls,
        successRate,
        avgDuration,
        yesterdayComparison
      };
    } catch (error) {
      console.error('Error fetching call center stats:', error);
      throw error;
    }
  }

  /**
   * Get lead statistics
   */
  async getLeadStats(tenantId: string): Promise<LeadStats> {
    try {
      // Get total leads
      const totalLeadsResult = await this.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM leads WHERE tenant_id = $1',
        [tenantId]
      );
      const totalLeads = parseInt(totalLeadsResult.rows[0].count);

      // Get new leads this week
      const newThisWeekResult = await this.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM leads 
         WHERE tenant_id = $1 AND created_at >= DATE_TRUNC('week', CURRENT_DATE)`,
        [tenantId]
      );
      const newThisWeek = parseInt(newThisWeekResult.rows[0].count);

      // Calculate conversion rate (leads with status 'scheduled' or 'completed')
      const conversionResult = await this.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM leads 
         WHERE tenant_id = $1 AND status IN ('scheduled', 'completed')`,
        [tenantId]
      );
      const convertedLeads = parseInt(conversionResult.rows[0].count);
      const conversionRate = totalLeads > 0 
        ? Math.round((convertedLeads / totalLeads) * 100 * 10) / 10 
        : 0;

      return {
        totalLeads,
        newThisWeek,
        conversionRate
      };
    } catch (error) {
      console.error('Error fetching lead stats:', error);
      throw error;
    }
  }

  /**
   * Get active calls with details
   */
  async getActiveCalls(tenantId: string): Promise<ActiveCall[]> {
    try {
      const result = await this.query<{
        id: string;
        lead_id: string;
        conversation_id: string;
        phone_number: string;
        start_time: string;
        lead_name: string;
      }>(
        `SELECT 
          c.id, c.lead_id, c.conversation_id, c.phone_number, c.start_time,
          l.name as lead_name
         FROM calls c
         LEFT JOIN leads l ON c.lead_id = l.id
         WHERE c.tenant_id = $1 AND c.status = 'active'
         ORDER BY c.start_time DESC`,
        [tenantId]
      );

      return result.rows.map(row => ({
        id: row.id,
        leadId: row.lead_id,
        name: row.lead_name || 'Unknown',
        phoneNumber: row.phone_number,
        duration: Math.floor((Date.now() - new Date(row.start_time).getTime()) / 1000),
        status: 'active',
        startTime: row.start_time,
        conversationId: row.conversation_id
      }));
    } catch (error) {
      console.error('Error fetching active calls:', error);
      throw error;
    }
  }

  /**
   * Get recent call history
   */
  async getRecentCallHistory(tenantId: string, limit: number = 10): Promise<CallHistoryEntry[]> {
    try {
      const result = await this.query<{
        id: string;
        lead_id: string;
        phone_number: string;
        duration: number;
        outcome: string;
        end_time: string;
        notes: string;
        lead_name: string;
      }>(
        `SELECT 
          c.id, c.lead_id, c.phone_number, c.duration, c.outcome, c.end_time, c.notes,
          l.name as lead_name
         FROM calls c
         LEFT JOIN leads l ON c.lead_id = l.id
         WHERE c.tenant_id = $1 AND c.status = 'completed'
         ORDER BY c.end_time DESC
         LIMIT $2`,
        [tenantId, limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        leadId: row.lead_id,
        name: row.lead_name || 'Unknown',
        phoneNumber: row.phone_number,
        duration: row.duration || 0,
        outcome: (row.outcome || 'no_answer') as any,
        endTime: row.end_time,
        notes: row.notes
      }));
    } catch (error) {
      console.error('Error fetching call history:', error);
      throw error;
    }
  }
}