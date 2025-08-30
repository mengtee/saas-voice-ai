import { Pool } from 'pg';
import { BaseService } from './base';

export interface AnalyticsOverview {
  totalCalls: number;
  totalLeads: number;
  conversionRate: number;
  avgCallDuration: number;
  totalCampaigns: number;
  successRate: number;
}

export interface CallTrend {
  date: string;
  calls: number;
  successful: number;
  failed: number;
}

export interface LeadTrend {
  date: string;
  leads: number;
  converted: number;
}

export interface CampaignPerformance {
  campaign: string;
  success: number;
  total: number;
}

export interface CallOutcome {
  outcome: string;
  count: number;
  percentage: number;
}

export interface CallsByHour {
  hour: number;
  calls: number;
}

export interface CallsByDay {
  day: string;
  calls: number;
}

export interface TopPerformer {
  agent: string;
  calls: number;
  success: number;
  rate: number;
}

export interface CampaignStats {
  name: string;
  leads: number;
  called: number;
  success: number;
  status: string;
}

export interface AnalyticsTrends {
  callsOverTime: CallTrend[];
  leadsOverTime: LeadTrend[];
  campaignPerformance: CampaignPerformance[];
}

export interface AnalyticsDemographics {
  callOutcomes: CallOutcome[];
  callsByHour: CallsByHour[];
  callsByDay: CallsByDay[];
}

export interface AnalyticsPerformance {
  topPerformers: TopPerformer[];
  campaignStats: CampaignStats[];
}

export interface AnalyticsData {
  overview: AnalyticsOverview;
  trends: AnalyticsTrends;
  demographics: AnalyticsDemographics;
  performance: AnalyticsPerformance;
}

export class AnalyticsService extends BaseService {
  constructor(pool: Pool) {
    super({ pool });
  }

  async getAnalyticsData(
    tenantId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<{ success: boolean; data?: AnalyticsData; error?: string }> {
    try {
      const [overview, trends, demographics, performance] = await Promise.all([
        this.getOverview(tenantId, dateFrom, dateTo),
        this.getTrends(tenantId, dateFrom, dateTo),
        this.getDemographics(tenantId, dateFrom, dateTo),
        this.getPerformance(tenantId, dateFrom, dateTo)
      ]);

      const analyticsData: AnalyticsData = {
        overview,
        trends,
        demographics,
        performance
      };

      return { success: true, data: analyticsData };
    } catch (error) {
      console.error('Error getting analytics data:', error);
      return { success: false, error: 'Failed to get analytics data' };
    }
  }

  private async getOverview(tenantId: string, dateFrom: string, dateTo: string): Promise<AnalyticsOverview> {
    try {
      // Total calls in date range
      const totalCallsQuery = `
        SELECT COUNT(*) as total_calls
        FROM campaign_calls cc
        INNER JOIN campaigns c ON cc.campaign_id = c.id
        WHERE c.tenant_id = $1 AND cc.created_at BETWEEN $2 AND $3
      `;
      const totalCallsResult = await this.query<{ total_calls: string }>(
        totalCallsQuery,
        [tenantId, dateFrom, dateTo]
      );
      const totalCalls = parseInt(totalCallsResult.rows[0]?.total_calls || '0');

      // Total leads
      const totalLeadsQuery = `
        SELECT COUNT(*) as total_leads
        FROM leads
        WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
      `;
      const totalLeadsResult = await this.query<{ total_leads: string }>(
        totalLeadsQuery,
        [tenantId, dateFrom, dateTo]
      );
      const totalLeads = parseInt(totalLeadsResult.rows[0]?.total_leads || '0');

      // Successful calls
      const successfulCallsQuery = `
        SELECT COUNT(*) as successful_calls
        FROM campaign_calls cc
        INNER JOIN campaigns c ON cc.campaign_id = c.id
        WHERE c.tenant_id = $1 AND cc.status = 'completed' AND cc.created_at BETWEEN $2 AND $3
      `;
      const successfulCallsResult = await this.query<{ successful_calls: string }>(
        successfulCallsQuery,
        [tenantId, dateFrom, dateTo]
      );
      const successfulCalls = parseInt(successfulCallsResult.rows[0]?.successful_calls || '0');

      // Average call duration
      const avgDurationQuery = `
        SELECT AVG(duration) as avg_duration
        FROM campaign_calls cc
        INNER JOIN campaigns c ON cc.campaign_id = c.id
        WHERE c.tenant_id = $1 AND cc.duration IS NOT NULL AND cc.created_at BETWEEN $2 AND $3
      `;
      const avgDurationResult = await this.query<{ avg_duration: string }>(
        avgDurationQuery,
        [tenantId, dateFrom, dateTo]
      );
      const avgCallDuration = parseInt(avgDurationResult.rows[0]?.avg_duration || '0');

      // Total campaigns
      const totalCampaignsQuery = `
        SELECT COUNT(*) as total_campaigns
        FROM campaigns
        WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
      `;
      const totalCampaignsResult = await this.query<{ total_campaigns: string }>(
        totalCampaignsQuery,
        [tenantId, dateFrom, dateTo]
      );
      const totalCampaigns = parseInt(totalCampaignsResult.rows[0]?.total_campaigns || '0');

      // Conversion rate (appointments / total calls)
      const appointmentsQuery = `
        SELECT COUNT(*) as appointments
        FROM campaign_calls cc
        INNER JOIN campaigns c ON cc.campaign_id = c.id
        WHERE c.tenant_id = $1 AND cc.outcome = 'appointment' AND cc.created_at BETWEEN $2 AND $3
      `;
      const appointmentsResult = await this.query<{ appointments: string }>(
        appointmentsQuery,
        [tenantId, dateFrom, dateTo]
      );
      const appointments = parseInt(appointmentsResult.rows[0]?.appointments || '0');

      const conversionRate = totalCalls > 0 ? (appointments / totalCalls) * 100 : 0;
      const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

      return {
        totalCalls,
        totalLeads,
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgCallDuration,
        totalCampaigns,
        successRate: Math.round(successRate * 10) / 10
      };
    } catch (error) {
      console.error('Error getting overview:', error);
      return {
        totalCalls: 0,
        totalLeads: 0,
        conversionRate: 0,
        avgCallDuration: 0,
        totalCampaigns: 0,
        successRate: 0
      };
    }
  }

  private async getTrends(tenantId: string, dateFrom: string, dateTo: string): Promise<AnalyticsTrends> {
    try {
      // Calls over time
      const callsOverTimeQuery = `
        SELECT 
          DATE(cc.created_at) as date,
          COUNT(*) as calls,
          COUNT(CASE WHEN cc.status = 'completed' THEN 1 END) as successful,
          COUNT(CASE WHEN cc.status = 'failed' THEN 1 END) as failed
        FROM campaign_calls cc
        INNER JOIN campaigns c ON cc.campaign_id = c.id
        WHERE c.tenant_id = $1 AND cc.created_at BETWEEN $2 AND $3
        GROUP BY DATE(cc.created_at)
        ORDER BY DATE(cc.created_at)
      `;
      const callsOverTime = await this.query<{
        date: string;
        calls: string;
        successful: string;
        failed: string;
      }>(callsOverTimeQuery, [tenantId, dateFrom, dateTo]);

      // Leads over time
      const leadsOverTimeQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as leads,
          COUNT(CASE WHEN status IN ('scheduled', 'completed') THEN 1 END) as converted
        FROM leads
        WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `;
      const leadsOverTime = await this.query<{
        date: string;
        leads: string;
        converted: string;
      }>(leadsOverTimeQuery, [tenantId, dateFrom, dateTo]);

      // Campaign performance
      const campaignPerformanceQuery = `
        SELECT 
          c.name as campaign,
          c.successful as success,
          c.called as total
        FROM campaigns c
        WHERE c.tenant_id = $1 AND c.created_at BETWEEN $2 AND $3
        ORDER BY c.successful DESC
        LIMIT 10
      `;
      const campaignPerformance = await this.query<{
        campaign: string;
        success: string;
        total: string;
      }>(campaignPerformanceQuery, [tenantId, dateFrom, dateTo]);

      return {
        callsOverTime: callsOverTime.rows.map(row => ({
          date: row.date,
          calls: parseInt(row.calls),
          successful: parseInt(row.successful),
          failed: parseInt(row.failed)
        })),
        leadsOverTime: leadsOverTime.rows.map(row => ({
          date: row.date,
          leads: parseInt(row.leads),
          converted: parseInt(row.converted)
        })),
        campaignPerformance: campaignPerformance.rows.map(row => ({
          campaign: row.campaign,
          success: parseInt(row.success),
          total: parseInt(row.total)
        }))
      };
    } catch (error) {
      console.error('Error getting trends:', error);
      return {
        callsOverTime: [],
        leadsOverTime: [],
        campaignPerformance: []
      };
    }
  }

  private async getDemographics(tenantId: string, dateFrom: string, dateTo: string): Promise<AnalyticsDemographics> {
    try {
      // Call outcomes
      const outcomesQuery = `
        SELECT 
          COALESCE(cc.outcome, 'no_answer') as outcome,
          COUNT(*) as count
        FROM campaign_calls cc
        INNER JOIN campaigns c ON cc.campaign_id = c.id
        WHERE c.tenant_id = $1 AND cc.created_at BETWEEN $2 AND $3
        GROUP BY COALESCE(cc.outcome, 'no_answer')
      `;
      const outcomesResult = await this.query<{
        outcome: string;
        count: string;
      }>(outcomesQuery, [tenantId, dateFrom, dateTo]);

      const totalOutcomes = outcomesResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
      const callOutcomes = outcomesResult.rows.map(row => {
        const count = parseInt(row.count);
        return {
          outcome: row.outcome.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          count,
          percentage: totalOutcomes > 0 ? Math.round((count / totalOutcomes) * 1000) / 10 : 0
        };
      });

      // Calls by hour
      const hourlyQuery = `
        SELECT 
          EXTRACT(hour FROM cc.created_at) as hour,
          COUNT(*) as calls
        FROM campaign_calls cc
        INNER JOIN campaigns c ON cc.campaign_id = c.id
        WHERE c.tenant_id = $1 AND cc.created_at BETWEEN $2 AND $3
        GROUP BY EXTRACT(hour FROM cc.created_at)
        ORDER BY hour
      `;
      const hourlyResult = await this.query<{
        hour: string;
        calls: string;
      }>(hourlyQuery, [tenantId, dateFrom, dateTo]);

      const callsByHour = hourlyResult.rows.map(row => ({
        hour: parseInt(row.hour),
        calls: parseInt(row.calls)
      }));

      // Calls by day of week
      const dailyQuery = `
        SELECT 
          TO_CHAR(cc.created_at, 'Day') as day,
          COUNT(*) as calls
        FROM campaign_calls cc
        INNER JOIN campaigns c ON cc.campaign_id = c.id
        WHERE c.tenant_id = $1 AND cc.created_at BETWEEN $2 AND $3
        GROUP BY TO_CHAR(cc.created_at, 'Day'), EXTRACT(dow FROM cc.created_at)
        ORDER BY EXTRACT(dow FROM cc.created_at)
      `;
      const dailyResult = await this.query<{
        day: string;
        calls: string;
      }>(dailyQuery, [tenantId, dateFrom, dateTo]);

      const callsByDay = dailyResult.rows.map(row => ({
        day: row.day.trim(),
        calls: parseInt(row.calls)
      }));

      return {
        callOutcomes,
        callsByHour,
        callsByDay
      };
    } catch (error) {
      console.error('Error getting demographics:', error);
      return {
        callOutcomes: [],
        callsByHour: [],
        callsByDay: []
      };
    }
  }

  private async getPerformance(tenantId: string, dateFrom: string, dateTo: string): Promise<AnalyticsPerformance> {
    try {
      // Top performers (agents)
      const performersQuery = `
        SELECT 
          c.agent_id as agent,
          COUNT(*) as calls,
          COUNT(CASE WHEN cc.status = 'completed' THEN 1 END) as success
        FROM campaign_calls cc
        INNER JOIN campaigns c ON cc.campaign_id = c.id
        WHERE c.tenant_id = $1 AND cc.created_at BETWEEN $2 AND $3
        GROUP BY c.agent_id
        ORDER BY success DESC
        LIMIT 10
      `;
      const performersResult = await this.query<{
        agent: string;
        calls: string;
        success: string;
      }>(performersQuery, [tenantId, dateFrom, dateTo]);

      const topPerformers = performersResult.rows.map(row => {
        const calls = parseInt(row.calls);
        const success = parseInt(row.success);
        return {
          agent: row.agent,
          calls,
          success,
          rate: calls > 0 ? Math.round((success / calls) * 1000) / 10 : 0
        };
      });

      // Campaign stats
      const campaignStatsQuery = `
        SELECT 
          name,
          total_leads as leads,
          called,
          successful as success,
          status
        FROM campaigns
        WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
        ORDER BY successful DESC
        LIMIT 10
      `;
      const campaignStatsResult = await this.query<{
        name: string;
        leads: string;
        called: string;
        success: string;
        status: string;
      }>(campaignStatsQuery, [tenantId, dateFrom, dateTo]);

      const campaignStats = campaignStatsResult.rows.map(row => ({
        name: row.name,
        leads: parseInt(row.leads),
        called: parseInt(row.called),
        success: parseInt(row.success),
        status: row.status
      }));

      return {
        topPerformers,
        campaignStats
      };
    } catch (error) {
      console.error('Error getting performance:', error);
      return {
        topPerformers: [],
        campaignStats: []
      };
    }
  }
}