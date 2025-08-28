import express, { Request, Response } from "express";
import { Pool } from "pg";
import { Config } from "../config";
import { StatisticsService } from "../services/statisticsService";
import { createAuthMiddleware } from "../middleware/auth";

export const createStatisticsRoutes = (pool: Pool, config: Config) => {
  const router = express.Router();
  const statisticsService = new StatisticsService({ pool });
  const authenticateToken = createAuthMiddleware(pool, config);

  /**
   * GET /api/statistics/dashboard
   * Get dashboard statistics
   */
  router.get("/dashboard", authenticateToken, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: "Tenant context missing"
        });
      }

      const stats = await statisticsService.getDashboardStats(tenantId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch dashboard statistics"
      });
    }
  });

  /**
   * GET /api/statistics/call-center
   * Get call center statistics
   */
  router.get("/call-center", authenticateToken, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: "Tenant context missing"
        });
      }

      const stats = await statisticsService.getCallCenterStats(tenantId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error("Call center stats error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch call center statistics"
      });
    }
  });

  /**
   * GET /api/statistics/leads
   * Get lead statistics
   */
  router.get("/leads", authenticateToken, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: "Tenant context missing"
        });
      }

      const stats = await statisticsService.getLeadStats(tenantId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error("Lead stats error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch lead statistics"
      });
    }
  });

  /**
   * GET /api/statistics/active-calls
   * Get active calls with details
   */
  router.get("/active-calls", authenticateToken, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: "Tenant context missing"
        });
      }

      const activeCalls = await statisticsService.getActiveCalls(tenantId);

      res.json({
        success: true,
        data: activeCalls
      });
    } catch (error: any) {
      console.error("Active calls error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch active calls"
      });
    }
  });

  /**
   * GET /api/statistics/call-history
   * Get recent call history
   */
  router.get("/call-history", authenticateToken, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: "Tenant context missing"
        });
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const callHistory = await statisticsService.getRecentCallHistory(tenantId, limit);

      res.json({
        success: true,
        data: callHistory
      });
    } catch (error: any) {
      console.error("Call history error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch call history"
      });
    }
  });

  return router;
};