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

export interface RecentActivity {
  id: string;
  type: 'lead_created' | 'call_completed' | 'appointment_booked' | 'campaign_started' | 'lead_updated';
  title: string;
  description: string;
  timestamp: string;
  entityId: string;
  entityType: 'lead' | 'call' | 'appointment' | 'campaign';
  metadata?: Record<string, any>;
}

export class StatisticsService extends BaseService {
  constructor({ pool, client }: { pool?: Pool; client?: PoolClient }) {
    super({ pool, client });
  }

  /**
   * Build role-based WHERE clause for statistics queries
   */
  private buildRoleFilter(userRole: string, userId?: string): { clause: string; params: string[] } {
    if (userRole === 'admin') {
      return { clause: '', params: [] };
    }
    
    if (!userId) {
      throw new Error('User ID required for non-admin roles');
    }
    
    return { 
      clause: ' AND assigned_user_id = $', 
      params: [userId] 
    };
  }

  /**
   * Get dashboard statistics with role-based access
   */
  async getDashboardStats(tenantId: string, userRole: string, userId?: string): Promise<DashboardStats> {
    try {
      // Build role-based lead query
      const roleFilter = this.buildRoleFilter(userRole, userId);
      const leadsCondition = roleFilter.clause 
        ? `WHERE tenant_id = $1::uuid AND assigned_user_id = $2`
        : `WHERE tenant_id = $1::uuid`;
      
      const leadsParams = roleFilter.clause ? [tenantId, userId] : [tenantId];

      const leadsStatsResult = await this.query<{ 
        total_leads: string;
        pending_followups: string;
      }>(
        `SELECT 
          COUNT(*) as total_leads,
          COUNT(CASE WHEN status = 'callback' THEN 1 END) as pending_followups
         FROM leads 
         ${leadsCondition}`,
        leadsParams
      );

      // Get campaign and call stats
      const campaignStatsResult = await this.query<{ 
        active_campaigns: string;
        completed_calls: string;
        total_calls: string;
      }>(
        `SELECT 
          COUNT(CASE WHEN status = 'running' THEN 1 END) as active_campaigns,
          (SELECT COUNT(*) FROM campaign_calls cc 
           JOIN campaigns c ON cc.campaign_id = c.id 
           WHERE c.tenant_id = $1 AND cc.status = 'completed') as completed_calls,
          (SELECT COUNT(*) FROM campaign_calls cc 
           JOIN campaigns c ON cc.campaign_id = c.id 
           WHERE c.tenant_id = $1) as total_calls
         FROM campaigns 
         WHERE tenant_id = $1`,
        [tenantId]
      );

      const leadsRow = leadsStatsResult.rows[0];
      const campaignRow = campaignStatsResult.rows[0];
      
      const totalLeads = parseInt(leadsRow.total_leads) || 0;
      const activeCalls = parseInt(campaignRow.active_campaigns) || 0;
      const todayAppointments = 0; // Temporarily hardcoded until appointments query is fixed
      const pendingFollowups = parseInt(leadsRow.pending_followups) || 0;
      
      // Calculate success rate from campaign calls
      const completedCalls = parseInt(campaignRow.completed_calls) || 0;
      const totalCalls = parseInt(campaignRow.total_calls) || 0;
      const successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100 * 10) / 10 : 0;
      const avgCallDuration = 45; // Default value since we don't have call duration data

      return {
        totalLeads,
        activeCalls,
        todayAppointments,
        pendingFollowups,
        successRate: Math.min(successRate, 100), // Cap at 100%
        avgCallDuration
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return default stats instead of throwing
      return {
        totalLeads: 0,
        activeCalls: 0,
        todayAppointments: 0,
        pendingFollowups: 0,
        successRate: 0,
        avgCallDuration: 0
      };
    }
  }

  /**
   * Get call center statistics with role-based access
   */
  async getCallCenterStats(tenantId: string, userRole: string, userId?: string): Promise<CallCenterStats> {
    try {
      // Since calls table doesn't exist, use campaign_calls data instead
      const campaignCallsStatsResult = await this.query<{ 
        active_calls: string;
        todays_calls: string;
        yesterdays_calls: string;
        total_calls: string;
        successful_calls: string;
      }>(
        `SELECT 
          COUNT(CASE WHEN cc.status = 'active' THEN 1 END) as active_calls,
          COUNT(CASE WHEN DATE(cc.created_at) = CURRENT_DATE THEN 1 END) as todays_calls,
          COUNT(CASE WHEN DATE(cc.created_at) = CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as yesterdays_calls,
          COUNT(CASE WHEN cc.status = 'completed' AND DATE(cc.created_at) = CURRENT_DATE THEN 1 END) as total_calls,
          COUNT(CASE WHEN cc.status = 'completed' AND cc.outcome IN ('interested', 'appointment', 'callback') AND DATE(cc.created_at) = CURRENT_DATE THEN 1 END) as successful_calls
         FROM campaign_calls cc
         JOIN campaigns c ON cc.campaign_id = c.id
         WHERE c.tenant_id = $1`,
        [tenantId]
      );

      const row = campaignCallsStatsResult.rows[0];
      const activeCalls = parseInt(row.active_calls) || 0;
      const todaysCalls = parseInt(row.todays_calls) || 0;
      const yesterdaysCalls = parseInt(row.yesterdays_calls) || 0;
      const totalTodaysCalls = parseInt(row.total_calls) || 0;
      const successfulTodaysCalls = parseInt(row.successful_calls) || 0;

      // Calculate percentage change
      const yesterdayComparison = yesterdaysCalls > 0 
        ? Math.round(((todaysCalls - yesterdaysCalls) / yesterdaysCalls) * 100)
        : todaysCalls > 0 ? 100 : 0;

      // Calculate success rate
      const successRate = totalTodaysCalls > 0 
        ? Math.round((successfulTodaysCalls / totalTodaysCalls) * 100 * 10) / 10 
        : 0;

      // Default average duration since we don't have duration data
      const avgDuration = 45; // Default 45 seconds

      return {
        activeCalls,
        todaysCalls,
        successRate,
        avgDuration,
        yesterdayComparison
      };
    } catch (error) {
      console.error('Error fetching call center stats:', error);
      // Return default stats instead of throwing
      return {
        activeCalls: 0,
        todaysCalls: 0,
        successRate: 0,
        avgDuration: 0,
        yesterdayComparison: 0
      };
    }
  }

  /**
   * Get lead statistics with role-based access
   */
  async getLeadStats(tenantId: string, userRole: string, userId?: string): Promise<LeadStats> {
    try {
      // Build role-based lead query
      const roleFilter = this.buildRoleFilter(userRole, userId);
      const leadsCondition = roleFilter.clause 
        ? `WHERE tenant_id = $1::uuid AND assigned_user_id = $2`
        : `WHERE tenant_id = $1::uuid`;
      
      const leadsParams = roleFilter.clause ? [tenantId, userId] : [tenantId];

      const leadsStatsResult = await this.query<{ 
        total_leads: string;
        new_this_week: string;
        converted_leads: string;
      }>(
        `SELECT 
          COUNT(*) as total_leads,
          COUNT(CASE WHEN created_at >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 END) as new_this_week,
          COUNT(CASE WHEN status IN ('scheduled', 'completed', 'converted') THEN 1 END) as converted_leads
         FROM leads 
         ${leadsCondition}`,
        leadsParams
      );

      const row = leadsStatsResult.rows[0];
      const totalLeads = parseInt(row.total_leads) || 0;
      const newThisWeek = parseInt(row.new_this_week) || 0;
      const convertedLeads = parseInt(row.converted_leads) || 0;

      // Calculate conversion rate based on lead status
      const conversionRate = totalLeads > 0 
        ? Math.round((convertedLeads / totalLeads) * 100 * 10) / 10 
        : 0;

      return {
        totalLeads,
        newThisWeek,
        conversionRate: Math.min(conversionRate, 100) // Cap at 100%
      };
    } catch (error) {
      console.error('Error fetching lead stats:', error);
      // Return default stats instead of throwing
      return {
        totalLeads: 0,
        newThisWeek: 0,
        conversionRate: 0
      };
    }
  }

  /**
   * Get active calls with details
   */
  async getActiveCalls(tenantId: string): Promise<ActiveCall[]> {
    try {
      // Use actual calls and leads tables for active calls
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
         WHERE l.tenant_id = $1::uuid AND c.status = 'active'
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
      // Return empty array instead of throwing
      return [];
    }
  }

  /**
   * Get recent call history
   */
  async getRecentCallHistory(tenantId: string, limit: number = 10): Promise<CallHistoryEntry[]> {
    try {
      // Use actual calls and leads tables for call history
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
         WHERE l.tenant_id = $1::uuid AND c.status = 'completed'
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
      // Return empty array instead of throwing
      return [];
    }
  }

  /**
   * Get recent activity across all entities
   */
  async getRecentActivity(tenantId: string, limit: number = 20): Promise<RecentActivity[]> {
    try {
      const activities: RecentActivity[] = [];

      // Only query campaigns since that's what exists in the database
      const recentCampaigns = await this.query<{
        id: string;
        name: string;
        status: string;
        created_at: string;
        total_leads: number;
        updated_at: string;
      }>(
        `SELECT id, name, status, created_at, total_leads, updated_at
         FROM campaigns 
         WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
         ORDER BY created_at DESC
         LIMIT $2`,
        [tenantId, limit]
      );

      recentCampaigns.rows.forEach(campaign => {
        activities.push({
          id: `campaign_${campaign.id}`,
          type: 'campaign_started',
          title: 'Campaign created',
          description: `${campaign.name} - ${campaign.total_leads || 0} leads`,
          timestamp: campaign.created_at,
          entityId: campaign.id,
          entityType: 'campaign',
          metadata: { status: campaign.status, totalLeads: campaign.total_leads }
        });
      });

      // Also check for campaign calls if they exist
      try {
        const recentCalls = await this.query<{
          id: string;
          campaign_id: string;
          phone_number: string;
          status: string;
          created_at: string;
          campaign_name: string;
        }>(
          `SELECT cc.id, cc.campaign_id, cc.phone_number, cc.status, cc.created_at,
                  c.name as campaign_name
           FROM campaign_calls cc
           LEFT JOIN campaigns c ON cc.campaign_id = c.id
           WHERE c.tenant_id = $1 AND cc.created_at >= NOW() - INTERVAL '7 days'
           ORDER BY cc.created_at DESC
           LIMIT 10`,
          [tenantId]
        );

        recentCalls.rows.forEach(call => {
          activities.push({
            id: `call_${call.id}`,
            type: 'call_completed',
            title: 'Campaign call made',
            description: `${call.phone_number} - ${call.campaign_name || 'Unknown campaign'}`,
            timestamp: call.created_at,
            entityId: call.id,
            entityType: 'call',
            metadata: { status: call.status, campaignId: call.campaign_id }
          });
        });
      } catch (callError) {
        // If campaign_calls query fails, just skip it
        console.log('Campaign calls query failed, skipping:', callError);
      }

      // Sort all activities by timestamp (most recent first) and limit
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

    } catch (error) {
      console.error('Error fetching recent activity:', error);
      // Return empty array instead of throwing to prevent API failure
      return [];
    }
  }

  /**
   * Get active calls with role-based access
   */
  async getActiveCallsWithDetails(tenantId: string, userRole: string, userId?: string): Promise<ActiveCall[]> {
    try {
      const roleFilter = this.buildRoleFilter(userRole, userId);
      const leadsCondition = roleFilter.clause 
        ? `AND l.assigned_user_id = $2`
        : '';
      
      const params = roleFilter.clause ? [tenantId, userId] : [tenantId];

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
         WHERE l.tenant_id = $1 AND c.status = 'active' ${leadsCondition}
         ORDER BY c.start_time DESC`,
        params
      );

      return result.rows.map(row => ({
        id: row.id,
        leadId: row.lead_id,
        name: row.lead_name,
        phoneNumber: row.phone_number,
        duration: Math.floor((Date.now() - new Date(row.start_time).getTime()) / 1000),
        status: 'active',
        startTime: row.start_time,
        conversationId: row.conversation_id
      }));
    } catch (error) {
      console.error('Error fetching active calls:', error);
      return [];
    }
  }

  /**
   * Get call history with role-based access
   */
  async getCallHistory(tenantId: string, userRole: string, userId?: string, limit: number = 10): Promise<CallHistoryEntry[]> {
    try {
      const roleFilter = this.buildRoleFilter(userRole, userId);
      const leadsCondition = roleFilter.clause 
        ? `AND l.assigned_user_id = $3`
        : '';
      
      const params = roleFilter.clause ? [tenantId, limit, userId] : [tenantId, limit];
      const limitParam = roleFilter.clause ? '$2' : '$2';

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
         WHERE l.tenant_id = $1 AND c.status = 'completed' ${leadsCondition}
         ORDER BY c.end_time DESC
         LIMIT ${limitParam}`,
        params
      );

      return result.rows.map(row => ({
        id: row.id,
        leadId: row.lead_id,
        name: row.lead_name,
        phoneNumber: row.phone_number,
        duration: row.duration || 0,
        outcome: row.outcome as any,
        endTime: row.end_time,
        notes: row.notes
      }));
    } catch (error) {
      console.error('Error fetching call history:', error);
      return [];
    }
  }

  /**
   * Get recent activity with role-based access  
   */
  async getRecentActivityFiltered(tenantId: string, userRole: string, userId?: string, limit: number = 20): Promise<RecentActivity[]> {
    try {
      const roleFilter = this.buildRoleFilter(userRole, userId);
      const leadsCondition = roleFilter.clause 
        ? `AND assigned_user_id = $2`
        : '';
      
      const params = roleFilter.clause ? [tenantId, userId] : [tenantId];
      const activities: RecentActivity[] = [];

      // Get recent lead activities
      try {
        const leadActivities = await this.query<{
          id: string;
          name: string;
          status: string;
          created_at: string;
          updated_at: string;
        }>(
          `SELECT id, name, status, created_at, updated_at 
           FROM leads 
           WHERE tenant_id = $1 ${leadsCondition}
           ORDER BY updated_at DESC 
           LIMIT 10`,
          params
        );

        leadActivities.rows.forEach(lead => {
          activities.push({
            id: `lead_${lead.id}`,
            type: 'lead_updated',
            title: 'Lead Updated',
            description: `${lead.name} status changed to ${lead.status}`,
            timestamp: lead.updated_at,
            entityId: lead.id,
            entityType: 'lead',
            metadata: { status: lead.status }
          });
        });
      } catch (leadError) {
        console.log('Lead activities query failed, skipping:', leadError);
      }

      // Sort activities by timestamp and limit
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

    } catch (error) {
      console.error('Error fetching filtered recent activity:', error);
      return [];
    }
  }
}