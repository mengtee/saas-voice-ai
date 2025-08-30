import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { Config } from '../config';
import { createAuthMiddleware } from '../middleware/auth';
import { AnalyticsService } from '../services/analyticsService';

export function createAnalyticsRoutes(pool: Pool, config: Config) {
  const router = express.Router();
  
  // Apply authentication middleware to all routes
  router.use(createAuthMiddleware(pool, config));

  interface AnalyticsRequest extends Request {
    query: {
      dateFrom?: string;
      dateTo?: string;
    };
  }

  const getAnalyticsService = () => new AnalyticsService(pool);

  // Get comprehensive analytics data
  router.get('/', async (req: AnalyticsRequest, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenant_id;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Default to last 30 days if no date range provided
      const dateFrom = req.query.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = req.query.dateTo || new Date().toISOString();

      const result = await getAnalyticsService().getAnalyticsData(tenantId, dateFrom, dateTo);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Get overview metrics only
  router.get('/overview', async (req: AnalyticsRequest, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenant_id;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const dateFrom = req.query.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = req.query.dateTo || new Date().toISOString();

      const result = await getAnalyticsService().getAnalyticsData(tenantId, dateFrom, dateTo);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        data: result.data?.overview
      });
    } catch (error) {
      console.error('Error getting overview analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Get trends data only
  router.get('/trends', async (req: AnalyticsRequest, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenant_id;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const dateFrom = req.query.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = req.query.dateTo || new Date().toISOString();

      const result = await getAnalyticsService().getAnalyticsData(tenantId, dateFrom, dateTo);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        data: result.data?.trends
      });
    } catch (error) {
      console.error('Error getting trends analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Get demographics data only
  router.get('/demographics', async (req: AnalyticsRequest, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenant_id;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const dateFrom = req.query.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = req.query.dateTo || new Date().toISOString();

      const result = await getAnalyticsService().getAnalyticsData(tenantId, dateFrom, dateTo);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        data: result.data?.demographics
      });
    } catch (error) {
      console.error('Error getting demographics analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Get performance data only
  router.get('/performance', async (req: AnalyticsRequest, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenant_id;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const dateFrom = req.query.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = req.query.dateTo || new Date().toISOString();

      const result = await getAnalyticsService().getAnalyticsData(tenantId, dateFrom, dateTo);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        data: result.data?.performance
      });
    } catch (error) {
      console.error('Error getting performance analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Export analytics data (CSV format)
  router.get('/export', async (req: AnalyticsRequest, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenant_id;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const dateFrom = req.query.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = req.query.dateTo || new Date().toISOString();

      const result = await getAnalyticsService().getAnalyticsData(tenantId, dateFrom, dateTo);

      if (!result.success || !result.data) {
        return res.status(400).json(result);
      }

      // Generate CSV content
      const csvLines = [];
      csvLines.push('Analytics Export Report');
      csvLines.push(`Date Range: ${dateFrom} to ${dateTo}`);
      csvLines.push('');

      // Overview section
      csvLines.push('OVERVIEW');
      csvLines.push('Metric,Value');
      csvLines.push(`Total Calls,${result.data.overview.totalCalls}`);
      csvLines.push(`Total Leads,${result.data.overview.totalLeads}`);
      csvLines.push(`Conversion Rate,${result.data.overview.conversionRate}%`);
      csvLines.push(`Average Call Duration,${result.data.overview.avgCallDuration}s`);
      csvLines.push(`Total Campaigns,${result.data.overview.totalCampaigns}`);
      csvLines.push(`Success Rate,${result.data.overview.successRate}%`);
      csvLines.push('');

      // Campaign performance
      csvLines.push('CAMPAIGN PERFORMANCE');
      csvLines.push('Campaign,Leads,Called,Success,Status');
      result.data.performance.campaignStats.forEach(campaign => {
        csvLines.push(`${campaign.name},${campaign.leads},${campaign.called},${campaign.success},${campaign.status}`);
      });
      csvLines.push('');

      // Call outcomes
      csvLines.push('CALL OUTCOMES');
      csvLines.push('Outcome,Count,Percentage');
      result.data.demographics.callOutcomes.forEach(outcome => {
        csvLines.push(`${outcome.outcome},${outcome.count},${outcome.percentage}%`);
      });

      const csvContent = csvLines.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  return router;
}