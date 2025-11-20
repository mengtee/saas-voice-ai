import { BaseService } from './base';
import { ElevenLabsService } from './elevenlabsService';

export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  agent_id: string;
  campaign_type: 'voice_call' | 'sms' | 'whatsapp' | 'email';
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  custom_message?: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  total_leads: number;
  called: number;
  successful: number;
  failed: number;
  lead_ids: string[];
  batch_id?: string; // ElevenLabs batch ID
  created_at: string;
  updated_at: string;
}

export interface CampaignCall {
  id: string;
  campaign_id: string;
  lead_id: string;
  phone_number: string;
  status: 'pending' | 'calling' | 'completed' | 'failed';
  conversation_id?: string;
  started_at?: string;
  completed_at?: string;
  duration?: number;
  outcome?: 'interested' | 'not_interested' | 'callback' | 'appointment' | 'no_answer';
  error?: string;
  created_at: string;
  updated_at: string;
}

export class CampaignService extends BaseService {
  private elevenLabsService: ElevenLabsService;

  constructor(pool?: any) {
    super({ pool });
    this.elevenLabsService = new ElevenLabsService();
  }

  async createCampaign(
    tenantId: string,
    name: string,
    agentId: string,
    leadIds: string[],
    campaignType: 'voice_call' | 'sms' | 'whatsapp' | 'email' = 'voice_call',
    customMessage?: string,
    scheduledAt?: string
  ): Promise<{ success: boolean; data?: Campaign; error?: string }> {
    try {
      const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Get lead phone numbers for batch calling
      const leadsQuery = `SELECT id, phone_number, name, email, purpose FROM leads WHERE id = ANY($1) AND tenant_id = $2`;
      const leads = await this.query<{ id: string; phone_number: string; name: string; email: string; purpose: string }>(leadsQuery, [leadIds, tenantId]);
      
      if (leads.rows.length === 0) {
        return { success: false, error: 'No valid leads found' };
      }

      const phoneNumbers = leads.rows.map(lead => lead.phone_number);
      
      // Create batch calling campaign with ElevenLabs
      const batchResult = await this.elevenLabsService.createBatchCalling(phoneNumbers, {
        campaignId: campaignId,
        campaignName: name,
        customMessage: customMessage,
        agentPhoneNumberId: process.env.ELEVENLABS_PHONE_NUMBER_ID,
        scheduledTime: scheduledAt ? Math.floor(new Date(scheduledAt).getTime() / 1000) : undefined,
        leads: leads.rows
      });

      if (!batchResult.success) {
        return { success: false, error: batchResult.error || 'Failed to create batch calling campaign' };
      }
      
      // Create campaign record with batch ID
      const campaignQuery = `
        INSERT INTO campaigns (id, tenant_id, name, agent_id, campaign_type, status, custom_message, scheduled_at, total_leads, lead_ids, batch_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *
      `;
      
      const status = scheduledAt ? 'scheduled' : 'running'; // ElevenLabs batch starts immediately
      
      const result = await this.query<Campaign>(campaignQuery, [
        campaignId,
        tenantId,
        name,
        agentId,
        campaignType,
        status,
        customMessage,
        scheduledAt && scheduledAt.trim() ? scheduledAt : null,
        leadIds.length,
        JSON.stringify(leadIds),
        batchResult.batchId
      ]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Failed to create campaign record' };
      }

      const campaign = result.rows[0];

      // Create campaign calls for tracking
      await this.createCampaignCalls(campaignId, tenantId, leadIds);

      return { success: true, data: campaign };
    } catch (error) {
      console.error('Error creating campaign:', error);
      return { success: false, error: 'Failed to create campaign' };
    }
  }

  private async createCampaignCalls(campaignId: string, tenantId: string, leadIds: string[]): Promise<void> {
    try {
      // Get lead details
      const leadsQuery = `SELECT id, phone_number FROM leads WHERE id = ANY($1) AND tenant_id = $2`;
      const leads = await this.query<{ id: string; phone_number: string }>(leadsQuery, [leadIds, tenantId]);

      // Create campaign call records
      const insertPromises = leads.rows.map(lead => {
        const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const query = `
          INSERT INTO campaign_calls (id, campaign_id, lead_id, phone_number, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW())
        `;
        return this.query(query, [callId, campaignId, lead.id, lead.phone_number]);
      });

      await Promise.all(insertPromises);
    } catch (error) {
      console.error('Error creating campaign calls:', error);
      throw error;
    }
  }

  async startCampaign(campaignId: string, tenantId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get campaign with batch ID
      const campaignQuery = `SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2`;
      const campaignResult = await this.query<Campaign>(campaignQuery, [campaignId, tenantId]);
      
      if (campaignResult.rows.length === 0) {
        return { success: false, error: 'Campaign not found' };
      }

      const campaign = campaignResult.rows[0];

      if (campaign.batch_id) {
        // Campaign is using ElevenLabs batch calling - it's already started
        // Just sync the status
        await this.syncBatchStatus(campaignId, campaign.batch_id);
        return { success: true };
      } else {
        // Legacy campaign - use old method
        const updateQuery = `
          UPDATE campaigns 
          SET status = 'running', started_at = NOW(), updated_at = NOW()
          WHERE id = $1 AND tenant_id = $2
        `;
        await this.query(updateQuery, [campaignId, tenantId]);

        // Start processing calls in background
        this.processCampaignCalls(campaignId, tenantId);
        return { success: true };
      }
    } catch (error) {
      console.error('Error starting campaign:', error);
      return { success: false, error: 'Failed to start campaign' };
    }
  }

  private async processCampaignCalls(campaignId: string, tenantId: string): Promise<void> {
    try {
      // Get pending calls for this campaign
      const callsQuery = `
        SELECT * FROM campaign_calls 
        WHERE campaign_id = $1 AND status = 'pending'
        ORDER BY created_at ASC
      `;
      const calls = await this.query<CampaignCall>(callsQuery, [campaignId]);

      // Process calls with delay between each call
      for (const call of calls.rows) {
        await this.processSingleCall(call, tenantId);
        // Add delay between calls (2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Update campaign status to completed
      await this.completeCampaign(campaignId, tenantId);
    } catch (error) {
      console.error('Error processing campaign calls:', error);
      // Mark campaign as failed
      const updateQuery = `
        UPDATE campaigns 
        SET status = 'failed', completed_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
      `;
      await this.query(updateQuery, [campaignId, tenantId]);
    }
  }

  private async processSingleCall(call: CampaignCall, tenantId: string): Promise<void> {
    try {
      // Update call status to calling
      const updateStatusQuery = `
        UPDATE campaign_calls 
        SET status = 'calling', started_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `;
      await this.query(updateStatusQuery, [call.id]);

      // Initiate the call via ElevenLabs
      const callResult = await this.elevenLabsService.initiateOutboundCall(call.phone_number, {
        lead_id: call.lead_id,
        campaign_id: call.campaign_id
      });

      if (callResult.success && callResult.conversationId) {
        // Update call with conversation ID
        const updateCallQuery = `
          UPDATE campaign_calls 
          SET conversation_id = $1, status = 'completed', completed_at = NOW(), updated_at = NOW()
          WHERE id = $2
        `;
        await this.query(updateCallQuery, [callResult.conversationId, call.id]);

        // Update campaign stats
        await this.updateCampaignStats(call.campaign_id, 'successful');
      } else {
        // Mark call as failed
        const updateFailedQuery = `
          UPDATE campaign_calls 
          SET status = 'failed', error = $1, completed_at = NOW(), updated_at = NOW()
          WHERE id = $2
        `;
        await this.query(updateFailedQuery, [callResult.error || 'Unknown error', call.id]);

        // Update campaign stats
        await this.updateCampaignStats(call.campaign_id, 'failed');
      }
    } catch (error) {
      console.error('Error processing single call:', error);
      
      // Mark call as failed
      const updateFailedQuery = `
        UPDATE campaign_calls 
        SET status = 'failed', error = $1, completed_at = NOW(), updated_at = NOW()
        WHERE id = $2
      `;
      await this.query(updateFailedQuery, [error instanceof Error ? error.message : 'Unknown error', call.id]);

      // Update campaign stats
      await this.updateCampaignStats(call.campaign_id, 'failed');
    }
  }

  private async updateCampaignStats(campaignId: string, result: 'successful' | 'failed'): Promise<void> {
    try {
      const column = result === 'successful' ? 'successful' : 'failed';
      const updateQuery = `
        UPDATE campaigns 
        SET ${column} = ${column} + 1, called = called + 1, updated_at = NOW()
        WHERE id = $1
      `;
      await this.query(updateQuery, [campaignId]);
    } catch (error) {
      console.error('Error updating campaign stats:', error);
    }
  }

  private async completeCampaign(campaignId: string, tenantId: string): Promise<void> {
    try {
      const updateQuery = `
        UPDATE campaigns 
        SET status = 'completed', completed_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
      `;
      await this.query(updateQuery, [campaignId, tenantId]);
    } catch (error) {
      console.error('Error completing campaign:', error);
    }
  }

  async pauseCampaign(campaignId: string, tenantId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const updateQuery = `
        UPDATE campaigns 
        SET status = 'paused', updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND status = 'running'
      `;
      await this.query(updateQuery, [campaignId, tenantId]);

      return { success: true };
    } catch (error) {
      console.error('Error pausing campaign:', error);
      return { success: false, error: 'Failed to pause campaign' };
    }
  }

  async getCampaigns(tenantId: string): Promise<{ success: boolean; campaigns?: Campaign[]; error?: string }> {
    try {
      const query = `
        SELECT * FROM campaigns 
        WHERE tenant_id = $1 
        ORDER BY created_at DESC
      `;
      const campaigns = await this.query<Campaign>(query, [tenantId]);

      return { success: true, campaigns: campaigns.rows };
    } catch (error) {
      console.error('Error getting campaigns:', error);
      return { success: false, error: 'Failed to get campaigns' };
    }
  }

  async getCampaign(campaignId: string, tenantId: string): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
    try {
      const query = `SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2`;
      const result = await this.query<Campaign>(query, [campaignId, tenantId]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Campaign not found' };
      }

      return { success: true, campaign: result.rows[0] };
    } catch (error) {
      console.error('Error getting campaign:', error);
      return { success: false, error: 'Failed to get campaign' };
    }
  }

  async getCampaignCalls(campaignId: string, tenantId: string): Promise<{ success: boolean; calls?: CampaignCall[]; error?: string }> {
    try {
      const query = `
        SELECT cc.*, l.name as lead_name 
        FROM campaign_calls cc
        LEFT JOIN leads l ON cc.lead_id = l.id
        WHERE cc.campaign_id = $1 AND l.tenant_id = $2
        ORDER BY cc.created_at ASC
      `;
      const calls = await this.query<CampaignCall & { lead_name: string }>(query, [campaignId, tenantId]);

      return { success: true, calls: calls.rows };
    } catch (error) {
      console.error('Error getting campaign calls:', error);
      return { success: false, error: 'Failed to get campaign calls' };
    }
  }

  /**
   * Sync campaign status with ElevenLabs batch status
   */
  async syncBatchStatus(campaignId: string, batchId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get batch status from ElevenLabs
      const batchStatus = await this.elevenLabsService.getBatchStatus(batchId);
      
      if (!batchStatus.success) {
        return { success: false, error: batchStatus.error };
      }

      const status = batchStatus.status;
      let dbStatus: Campaign['status'] = 'running';
      
      // Map ElevenLabs status to our database status
      switch (status?.status) {
        case 'pending':
        case 'running':
          dbStatus = 'running';
          break;
        case 'completed':
          dbStatus = 'completed';
          break;
        case 'failed':
          dbStatus = 'failed';
          break;
        case 'cancelled':
          dbStatus = 'paused';
          break;
        default:
          dbStatus = 'running';
      }

      // Update campaign with batch status
      const updateQuery = `
        UPDATE campaigns 
        SET status = $1, 
            called = COALESCE($2, called),
            successful = COALESCE($3, successful), 
            failed = COALESCE($4, failed),
            updated_at = NOW()
        WHERE id = $5
      `;
      
      await this.query(updateQuery, [
        dbStatus,
        status?.calls_made || null,
        status?.successful_calls || null,
        status?.failed_calls || null,
        campaignId
      ]);

      return { success: true };
    } catch (error) {
      console.error('Error syncing batch status:', error);
      return { success: false, error: 'Failed to sync batch status' };
    }
  }

  /**
   * Cancel a batch calling campaign
   */
  async cancelCampaign(campaignId: string, tenantId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get campaign with batch ID
      const campaignQuery = `SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2`;
      const campaignResult = await this.query<Campaign>(campaignQuery, [campaignId, tenantId]);
      
      if (campaignResult.rows.length === 0) {
        return { success: false, error: 'Campaign not found' };
      }

      const campaign = campaignResult.rows[0];

      if (campaign.batch_id) {
        // Cancel ElevenLabs batch
        const cancelResult = await this.elevenLabsService.cancelBatch(campaign.batch_id);
        
        if (!cancelResult.success) {
          return { success: false, error: cancelResult.error };
        }
      }

      // Update campaign status to paused
      const updateQuery = `
        UPDATE campaigns 
        SET status = 'paused', updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
      `;
      await this.query(updateQuery, [campaignId, tenantId]);

      return { success: true };
    } catch (error) {
      console.error('Error canceling campaign:', error);
      return { success: false, error: 'Failed to cancel campaign' };
    }
  }
}