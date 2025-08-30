import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { Config } from '../config';
import { createAuthMiddleware } from '../middleware/auth';
import { CampaignService } from '../services/campaignService';
import { BatchStatusPoller } from '../services/batchStatusPoller';

export function createCampaignsRoutes(pool: Pool, config: Config) {
  const router = express.Router();
  const authenticateToken = createAuthMiddleware(pool, config);

interface CreateCampaignRequest extends Request {
  body: {
    name: string;
    agentId: string;
    leadIds: string[];
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
router.post('/', authenticateToken, async (req: CreateCampaignRequest, res: Response) => {
  try {
    const { name, agentId, leadIds, customMessage, scheduledAt } = req.body;
    const tenantId = (req as any).user?.tenant_id;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!name || !agentId || !leadIds || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name, agent ID, and lead IDs are required'
      });
    }

    const result = await getCampaignService().createCampaign(
      tenantId,
      name,
      agentId,
      leadIds,
      customMessage,
      scheduledAt
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get all campaigns for tenant
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenant_id;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const result = await getCampaignService().getCampaigns(tenantId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error getting campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get a specific campaign
router.get('/:campaignId', async (req: CampaignActionRequest, res: Response) => {
  try {
    const { campaignId } = req.params;
    const tenantId = (req as any).user?.tenant_id;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const result = await getCampaignService().getCampaign(campaignId, tenantId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error getting campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Start a campaign
router.post('/:campaignId/start', authenticateToken, async (req: CampaignActionRequest, res: Response) => {
  try {
    const { campaignId } = req.params;
    const tenantId = (req as any).user?.tenant_id;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const result = await getCampaignService().startCampaign(campaignId, tenantId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Pause a campaign
router.post('/:campaignId/pause', authenticateToken, async (req: CampaignActionRequest, res: Response) => {
  try {
    const { campaignId } = req.params;
    const tenantId = (req as any).user?.tenant_id;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const result = await getCampaignService().pauseCampaign(campaignId, tenantId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get campaign calls
router.get('/:campaignId/calls', async (req: CampaignActionRequest, res: Response) => {
  try {
    const { campaignId } = req.params;
    const tenantId = (req as any).user?.tenant_id;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const result = await getCampaignService().getCampaignCalls(campaignId, tenantId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error getting campaign calls:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Manual refresh campaign status from ElevenLabs
router.post('/:campaignId/refresh', authenticateToken, async (req: CampaignActionRequest, res: Response) => {
  try {
    const { campaignId } = req.params;
    const tenantId = (req as any).user?.tenant_id;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get campaign to get batch_id
    const campaign = await getCampaignService().getCampaign(campaignId, tenantId);
    
    if (!campaign.success || !campaign.campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    if (!campaign.campaign.batch_id) {
      return res.status(400).json({
        success: false,
        error: 'Campaign does not have a batch ID'
      });
    }

    // Sync status with ElevenLabs
    const syncResult = await getCampaignService().syncBatchStatus(campaignId, campaign.campaign.batch_id);
    
    if (!syncResult.success) {
      return res.status(500).json(syncResult);
    }

    // Get updated campaign data
    const updatedCampaign = await getCampaignService().getCampaign(campaignId, tenantId);

    res.json({
      success: true,
      message: 'Campaign status refreshed',
      campaign: updatedCampaign.campaign
    });
  } catch (error) {
    console.error('Error refreshing campaign status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Manual trigger for polling all active campaigns
router.post('/refresh-all', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenant_id;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Create a poller instance and trigger manual poll
    const poller = new BatchStatusPoller(pool);
    const result = await poller.pollNow();

    res.json({
      success: true,
      message: 'All campaign statuses refreshed',
      campaignsPolled: result.campaignsPolled
    });
  } catch (error) {
    console.error('Error refreshing all campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

  return router;
}