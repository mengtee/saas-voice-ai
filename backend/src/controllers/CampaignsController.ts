import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { CampaignService } from '../services/campaignService';
import { CampaignRepository } from '../repositories/CampaignRepository';

export class CampaignsController extends BaseController {
  constructor(private campaignService: CampaignService, private campaignRepository: CampaignRepository) {
    super();
  }

  getCampaigns = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUser = this.getUserFromRequest(req);
      const { limit, offset } = this.getPagination(req);

      const campaigns = await this.campaignRepository.findByTenantId(currentUser.tenant_id, limit, offset);
      const total = await this.campaignRepository.countByTenantId(currentUser.tenant_id);

      this.sendSuccess(res, {
        campaigns,
        total,
        page: Math.floor((offset || 0) / (limit || 20)) + 1,
        limit
      }, 'Campaigns retrieved successfully');

    } catch (error: any) {
      console.error('Get campaigns controller error:', error);
      this.sendInternalError(res, 'Failed to retrieve campaigns');
    }
  };

  getCampaign = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const currentUser = this.getUserFromRequest(req);

      const campaign = await this.campaignRepository.findById(id);
      if (!campaign) {
        this.sendNotFound(res, 'Campaign not found');
        return;
      }

      if (campaign.tenant_id !== currentUser.tenant_id) {
        this.sendForbidden(res, 'Access denied');
        return;
      }

      this.sendSuccess(res, campaign, 'Campaign retrieved successfully');

    } catch (error: any) {
      console.error('Get campaign controller error:', error);
      this.sendInternalError(res, 'Failed to retrieve campaign');
    }
  };

  createCampaign = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, agent_id, lead_ids, custom_message, scheduled_at, campaign_type } = req.body;
      const currentUser = this.getUserFromRequest(req);

      const missingFields = this.validateRequired({ name, agent_id, lead_ids });
      if (missingFields.length > 0) {
        this.sendError(res, `Missing required fields: ${missingFields.join(', ')}`);
        return;
      }

      if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
        this.sendError(res, 'lead_ids must be a non-empty array');
        return;
      }

      if (campaign_type && !['voice_call', 'sms', 'whatsapp', 'email'].includes(campaign_type)) {
        this.sendError(res, 'Invalid campaign_type. Must be: voice_call, sms, whatsapp, or email');
        return;
      }

      const campaignData = {
        name,
        agent_id,
        lead_ids,
        custom_message,
        scheduled_at,
        campaign_type: campaign_type || 'voice_call',
        tenant_id: currentUser.tenant_id
      };

      const result = await this.campaignService.createCampaign(campaignData);
      this.sendCreated(res, result, 'Campaign created successfully');

    } catch (error: any) {
      console.error('Create campaign controller error:', error);
      
      if (error.message.includes('Invalid lead IDs') || error.message.includes('Agent not found')) {
        this.sendError(res, error.message);
      } else {
        this.sendInternalError(res, 'Failed to create campaign');
      }
    }
  };

  updateCampaign = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, agent_id, custom_message, scheduled_at, campaign_type, status } = req.body;
      const currentUser = this.getUserFromRequest(req);

      const existingCampaign = await this.campaignRepository.findById(id);
      if (!existingCampaign) {
        this.sendNotFound(res, 'Campaign not found');
        return;
      }

      if (existingCampaign.tenant_id !== currentUser.tenant_id) {
        this.sendForbidden(res, 'Access denied');
        return;
      }

      if (campaign_type && !['voice_call', 'sms', 'whatsapp', 'email'].includes(campaign_type)) {
        this.sendError(res, 'Invalid campaign_type. Must be: voice_call, sms, whatsapp, or email');
        return;
      }

      if (status && !['draft', 'scheduled', 'running', 'paused', 'completed', 'failed'].includes(status)) {
        this.sendError(res, 'Invalid status. Must be: draft, scheduled, running, paused, completed, or failed');
        return;
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (agent_id !== undefined) updateData.agent_id = agent_id;
      if (custom_message !== undefined) updateData.custom_message = custom_message;
      if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at;
      if (campaign_type !== undefined) updateData.campaign_type = campaign_type;
      if (status !== undefined) updateData.status = status;

      if (Object.keys(updateData).length === 0) {
        this.sendError(res, 'No fields to update');
        return;
      }

      const updatedCampaign = await this.campaignRepository.update(id, updateData);
      if (!updatedCampaign) {
        this.sendNotFound(res, 'Campaign not found');
        return;
      }

      this.sendSuccess(res, updatedCampaign, 'Campaign updated successfully');

    } catch (error: any) {
      console.error('Update campaign controller error:', error);
      this.sendInternalError(res, 'Failed to update campaign');
    }
  };

  deleteCampaign = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const currentUser = this.getUserFromRequest(req);

      const existingCampaign = await this.campaignRepository.findById(id);
      if (!existingCampaign) {
        this.sendNotFound(res, 'Campaign not found');
        return;
      }

      if (existingCampaign.tenant_id !== currentUser.tenant_id) {
        this.sendForbidden(res, 'Access denied');
        return;
      }

      if (existingCampaign.status === 'running') {
        this.sendError(res, 'Cannot delete a running campaign. Please pause it first.');
        return;
      }

      const deleted = await this.campaignRepository.delete(id);
      if (!deleted) {
        this.sendNotFound(res, 'Campaign not found');
        return;
      }

      this.sendSuccess(res, undefined, 'Campaign deleted successfully');

    } catch (error: any) {
      console.error('Delete campaign controller error:', error);
      this.sendInternalError(res, 'Failed to delete campaign');
    }
  };

  startCampaign = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const currentUser = this.getUserFromRequest(req);

      const campaign = await this.campaignRepository.findById(id);
      if (!campaign) {
        this.sendNotFound(res, 'Campaign not found');
        return;
      }

      if (campaign.tenant_id !== currentUser.tenant_id) {
        this.sendForbidden(res, 'Access denied');
        return;
      }

      if (campaign.status === 'running') {
        this.sendError(res, 'Campaign is already running');
        return;
      }

      const result = await this.campaignService.startCampaign(id);
      this.sendSuccess(res, result, 'Campaign started successfully');

    } catch (error: any) {
      console.error('Start campaign controller error:', error);
      
      if (error.message.includes('Invalid campaign status') || error.message.includes('No leads')) {
        this.sendError(res, error.message);
      } else {
        this.sendInternalError(res, 'Failed to start campaign');
      }
    }
  };

  pauseCampaign = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const currentUser = this.getUserFromRequest(req);

      const campaign = await this.campaignRepository.findById(id);
      if (!campaign) {
        this.sendNotFound(res, 'Campaign not found');
        return;
      }

      if (campaign.tenant_id !== currentUser.tenant_id) {
        this.sendForbidden(res, 'Access denied');
        return;
      }

      if (campaign.status !== 'running') {
        this.sendError(res, 'Campaign is not running');
        return;
      }

      const result = await this.campaignService.pauseCampaign(id);
      this.sendSuccess(res, result, 'Campaign paused successfully');

    } catch (error: any) {
      console.error('Pause campaign controller error:', error);
      this.sendInternalError(res, 'Failed to pause campaign');
    }
  };

  resumeCampaign = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const currentUser = this.getUserFromRequest(req);

      const campaign = await this.campaignRepository.findById(id);
      if (!campaign) {
        this.sendNotFound(res, 'Campaign not found');
        return;
      }

      if (campaign.tenant_id !== currentUser.tenant_id) {
        this.sendForbidden(res, 'Access denied');
        return;
      }

      if (campaign.status !== 'paused') {
        this.sendError(res, 'Campaign is not paused');
        return;
      }

      const result = await this.campaignService.resumeCampaign(id);
      this.sendSuccess(res, result, 'Campaign resumed successfully');

    } catch (error: any) {
      console.error('Resume campaign controller error:', error);
      this.sendInternalError(res, 'Failed to resume campaign');
    }
  };

  getCampaignCalls = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const currentUser = this.getUserFromRequest(req);
      const { limit, offset } = this.getPagination(req);

      const campaign = await this.campaignRepository.findById(id);
      if (!campaign) {
        this.sendNotFound(res, 'Campaign not found');
        return;
      }

      if (campaign.tenant_id !== currentUser.tenant_id) {
        this.sendForbidden(res, 'Access denied');
        return;
      }

      const calls = await this.campaignRepository.findCallsByCampaignId(id, limit, offset);
      const total = await this.campaignRepository.countCallsByCampaignId(id);

      this.sendSuccess(res, {
        calls,
        total,
        page: Math.floor((offset || 0) / (limit || 20)) + 1,
        limit
      }, 'Campaign calls retrieved successfully');

    } catch (error: any) {
      console.error('Get campaign calls controller error:', error);
      this.sendInternalError(res, 'Failed to retrieve campaign calls');
    }
  };

  getCampaignStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const currentUser = this.getUserFromRequest(req);

      const campaign = await this.campaignRepository.findById(id);
      if (!campaign) {
        this.sendNotFound(res, 'Campaign not found');
        return;
      }

      if (campaign.tenant_id !== currentUser.tenant_id) {
        this.sendForbidden(res, 'Access denied');
        return;
      }

      const callStatusCounts = await this.campaignRepository.countCallsByStatus(id);
      
      const statistics = {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          total_leads: campaign.total_leads,
          called: campaign.called,
          successful: campaign.successful,
          failed: campaign.failed,
          created_at: campaign.created_at,
          started_at: campaign.started_at,
          completed_at: campaign.completed_at
        },
        calls_by_status: callStatusCounts
      };

      this.sendSuccess(res, statistics, 'Campaign statistics retrieved successfully');

    } catch (error: any) {
      console.error('Get campaign statistics controller error:', error);
      this.sendInternalError(res, 'Failed to retrieve campaign statistics');
    }
  };

  getAllCampaignStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUser = this.getUserFromRequest(req);

      const statusCounts = await this.campaignRepository.countByStatus(currentUser.tenant_id);
      const totalCampaigns = await this.campaignRepository.countByTenantId(currentUser.tenant_id);

      this.sendSuccess(res, {
        total: totalCampaigns,
        byStatus: statusCounts
      }, 'Campaign statistics retrieved successfully');

    } catch (error: any) {
      console.error('Get all campaign statistics controller error:', error);
      this.sendInternalError(res, 'Failed to retrieve campaign statistics');
    }
  };
}