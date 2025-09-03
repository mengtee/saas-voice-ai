import { CampaignService } from './campaignService';
import { ElevenLabsService } from './elevenlabsService';
import { BaseService } from './base';

export class BatchStatusPoller extends BaseService {
  private campaignService: CampaignService;
  private elevenLabsService: ElevenLabsService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;

  constructor(pool: any) {
    super({ pool });
    this.campaignService = new CampaignService(pool);
    this.elevenLabsService = new ElevenLabsService();
  }

  /**
   * Start polling for active campaigns
   */
  startPolling(intervalMs: number = 45000) { // Poll every 45 seconds
    if (this.isPolling) {
      console.log('Polling already active');
      return;
    }

    console.log(`Starting batch status polling (interval: ${intervalMs}ms)`);
    this.isPolling = true;

    // Initial poll
    this.pollActiveCampaigns();

    // Set up recurring polling
    this.pollingInterval = setInterval(() => {
      this.pollActiveCampaigns();
    }, intervalMs);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    console.log('Stopped batch status polling');
  }

  /**
   * Poll all active campaigns for status updates
   */
  private async pollActiveCampaigns() {
    try {
      console.log('Polling active campaigns for status updates...');

      // Get campaigns that are running and have batch_ids
      const activeCampaigns = await this.getActiveCampaigns();
      
      if (activeCampaigns.length === 0) {
        console.log('No active campaigns to poll');
        return;
      }

      console.log(`Found ${activeCampaigns.length} active campaigns to poll`);

      // Poll each campaign (with some delay to avoid rate limiting)
      for (const campaign of activeCampaigns) {
        try {
          await this.pollSingleCampaign(campaign);
          
          // Add small delay between polls to be nice to ElevenLabs API
          await this.delay(1000); // 1 second delay
        } catch (error) {
          console.error(`Error polling campaign ${campaign.id}:`, error);
          // Continue with other campaigns even if one fails
        }
      }

      console.log('Completed polling cycle');
    } catch (error) {
      console.error('Error in polling cycle:', error);
    }
  }

  /**
   * Get active campaigns that need status updates
   */
  private async getActiveCampaigns() {
    const query = `
      SELECT id, batch_id, name, status, updated_at
      FROM campaigns 
      WHERE status IN ('running', 'scheduled') 
      AND batch_id IS NOT NULL
      AND batch_id != ''
      ORDER BY updated_at ASC
    `;

    const result = await this.query<{
      id: string;
      batch_id: string;
      name: string;
      status: string;
      updated_at: string;
    }>(query);

    return result.rows;
  }

  /**
   * Poll status for a single campaign
   */
  private async pollSingleCampaign(campaign: { id: string; batch_id: string; name: string; status: string }) {
    console.log(`Polling campaign: ${campaign.name} (${campaign.id})`);

    // Get batch status from ElevenLabs
    const batchStatus = await this.elevenLabsService.getBatchStatus(campaign.batch_id);

    if (!batchStatus.success) {
      console.error(`Failed to get batch status for campaign ${campaign.id}:`, batchStatus.error);
      return;
    }

    // Update campaign status based on ElevenLabs response
    await this.updateCampaignFromBatchStatus(campaign.id, batchStatus.status);
  }

  /**
   * Update campaign in database based on ElevenLabs batch status
   */
  private async updateCampaignFromBatchStatus(campaignId: string, batchStatus: any) {
    try {
      // Map ElevenLabs status to our database status
      let dbStatus = 'running';
      
      switch (batchStatus?.status) {
        case 'pending':
        case 'in_progress':
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

      // Extract call statistics
      const totalDispatched = batchStatus?.total_calls_dispatched || 0;
      const totalScheduled = batchStatus?.total_calls_scheduled || 0;
      
      // Count successful/failed from recipients array
      let successfulCalls = 0;
      let failedCalls = 0;
      
      if (batchStatus?.recipients && Array.isArray(batchStatus.recipients)) {
        batchStatus.recipients.forEach((recipient: any) => {
          if (recipient.status === 'completed') {
            successfulCalls++;
          } else if (recipient.status === 'failed') {
            failedCalls++;
          }
        });
      }

      // Update campaign record
      const updateQuery = `
        UPDATE campaigns 
        SET status = $1,
            called = $2,
            successful = $3,
            failed = $4,
            updated_at = NOW()
        WHERE id = $5
      `;

      await this.query(updateQuery, [
        dbStatus,
        totalDispatched,
        successfulCalls,
        failedCalls,
        campaignId
      ]);

      console.log(`Updated campaign ${campaignId}: status=${dbStatus}, called=${totalDispatched}, successful=${successfulCalls}, failed=${failedCalls}`);

      // If campaign is completed or failed, update individual call records
      if (dbStatus === 'completed' || dbStatus === 'failed') {
        await this.updateIndividualCallStatuses(campaignId, batchStatus);
      }

    } catch (error) {
      console.error(`Error updating campaign ${campaignId}:`, error);
    }
  }

  /**
   * Update individual call records from batch status
   */
  private async updateIndividualCallStatuses(campaignId: string, batchStatus: any) {
    try {
      if (!batchStatus?.recipients || !Array.isArray(batchStatus.recipients)) {
        return;
      }

      for (const recipient of batchStatus.recipients) {
        if (recipient.phone_number && recipient.status) {
          const updateCallQuery = `
            UPDATE campaign_calls 
            SET status = $1::varchar,
                conversation_id = $2,
                completed_at = CASE WHEN $1::varchar IN ('completed', 'failed') THEN NOW() ELSE completed_at END,
                updated_at = NOW()
            WHERE campaign_id = $3 AND phone_number = $4
          `;

          await this.query(updateCallQuery, [
            String(recipient.status),
            recipient.conversation_id || null,
            campaignId,
            recipient.phone_number
          ]);
        }
      }

      console.log(`Updated individual call records for campaign ${campaignId}`);
    } catch (error) {
      console.error(`Error updating individual calls for campaign ${campaignId}:`, error);
    }
  }

  /**
   * Utility function to add delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Manual trigger for polling (useful for API endpoints)
   */
  async pollNow(): Promise<{ success: boolean; campaignsPolled: number; error?: string }> {
    try {
      const activeCampaigns = await this.getActiveCampaigns();
      
      for (const campaign of activeCampaigns) {
        await this.pollSingleCampaign(campaign);
        await this.delay(1000);
      }

      return {
        success: true,
        campaignsPolled: activeCampaigns.length
      };
    } catch (error) {
      console.error('Error in manual polling:', error);
      return {
        success: false,
        campaignsPolled: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
