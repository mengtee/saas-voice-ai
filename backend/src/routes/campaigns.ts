import express, { Request, Response } from "express";
import { Pool } from "pg";
import { Config } from "../config";
import { createAuthMiddleware } from "../middleware/auth";
import { CampaignService } from "../services/campaignService";

export function createCampaignsRoutes(pool: Pool, config: Config) {
  const router = express.Router();
  const authenticateToken = createAuthMiddleware(pool, config);

  interface CreateCampaignRequest extends Request {
    body: {
      name: string;
      agentId: string;
      leadIds: string[];
      campaignType?: 'voice_call' | 'sms' | 'whatsapp' | 'email';
      customMessage?: string;
      scheduledAt?: string;
    };
  }

  interface CampaignActionRequest extends Request {
    params: {
      campaignId: string;
    };
  }

  const getCampaignService = () => new CampaignService(pool);

  // Create a new campaign
  router.post("/", authenticateToken, async (req: CreateCampaignRequest, res: Response) => {
    try {
      const { name, agentId, leadIds, campaignType = 'voice_call', customMessage, scheduledAt } = req.body;
      const tenantId = (req as any).user?.tenant_id;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      if (!name || !agentId || !leadIds || leadIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Campaign name, agent ID, and lead IDs are required",
        });
      }

      const result = await getCampaignService().createCampaign(
        tenantId,
        name,
        agentId,
        leadIds,
        campaignType,
        customMessage,
        scheduledAt
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

  // Get all campaigns for tenant
  router.get("/", async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenant_id;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const result = await getCampaignService().getCampaigns(tenantId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error("Error getting campaigns:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

  // Get a specific campaign
  router.get(
    "/:campaignId",
    async (req: CampaignActionRequest, res: Response) => {
      try {
        const { campaignId } = req.params;
        const tenantId = (req as any).user?.tenant_id;

        if (!tenantId) {
          return res.status(401).json({
            success: false,
            error: "Authentication required",
          });
        }

        const result = await getCampaignService().getCampaign(
          campaignId,
          tenantId
        );

        if (!result.success) {
          return res.status(404).json(result);
        }

        res.json(result);
      } catch (error) {
        console.error("Error getting campaign:", error);
        res.status(500).json({
          success: false,
          error: "Internal server error",
        });
      }
    }
  );

  // Start a campaign
  router.post(
    "/:campaignId/start",
    async (req: CampaignActionRequest, res: Response) => {
      try {
        const { campaignId } = req.params;
        const tenantId = (req as any).user?.tenant_id;

        if (!tenantId) {
          return res.status(401).json({
            success: false,
            error: "Authentication required",
          });
        }

        const result = await getCampaignService().startCampaign(
          campaignId,
          tenantId
        );

        if (!result.success) {
          return res.status(400).json(result);
        }

        res.json(result);
      } catch (error) {
        console.error("Error starting campaign:", error);
        res.status(500).json({
          success: false,
          error: "Internal server error",
        });
      }
    }
  );

  // Pause a campaign
  router.post(
    "/:campaignId/pause",
    async (req: CampaignActionRequest, res: Response) => {
      try {
        const { campaignId } = req.params;
        const tenantId = (req as any).user?.tenant_id;

        if (!tenantId) {
          return res.status(401).json({
            success: false,
            error: "Authentication required",
          });
        }

        const result = await getCampaignService().pauseCampaign(
          campaignId,
          tenantId
        );

        if (!result.success) {
          return res.status(400).json(result);
        }

        res.json(result);
      } catch (error) {
        console.error("Error pausing campaign:", error);
        res.status(500).json({
          success: false,
          error: "Internal server error",
        });
      }
    }
  );

  // Get campaign calls
  router.get(
    "/:campaignId/calls",
    async (req: CampaignActionRequest, res: Response) => {
      try {
        const { campaignId } = req.params;
        const tenantId = (req as any).user?.tenant_id;

        if (!tenantId) {
          return res.status(401).json({
            success: false,
            error: "Authentication required",
          });
        }

        const result = await getCampaignService().getCampaignCalls(
          campaignId,
          tenantId
        );

        if (!result.success) {
          return res.status(400).json(result);
        }

        res.json(result);
      } catch (error) {
        console.error("Error getting campaign calls:", error);
        res.status(500).json({
          success: false,
          error: "Internal server error",
        });
      }
    }
  );

  return router;
}
