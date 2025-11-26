import { Pool, PoolClient } from 'pg';
import { BaseRepository } from './BaseRepository';

export interface Campaign {
  id: number;
  tenant_id: number;
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
  lead_ids: number[];
  batch_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignCall {
  id: number;
  campaign_id: number;
  lead_id: number;
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

export interface CreateCampaignInput {
  id?: number;
  tenant_id: number;
  name: string;
  agent_id: string;
  campaign_type?: 'voice_call' | 'sms' | 'whatsapp' | 'email';
  status?: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  custom_message?: string;
  scheduled_at?: string;
  total_leads: number;
  lead_ids: number[];
  batch_id?: string;
}

export interface UpdateCampaignInput {
  name?: string;
  agent_id?: string;
  campaign_type?: 'voice_call' | 'sms' | 'whatsapp' | 'email';
  status?: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  custom_message?: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  called?: number;
  successful?: number;
  failed?: number;
  batch_id?: string;
}

export interface CreateCampaignCallInput {
  id?: number;
  campaign_id: number;
  lead_id: number;
  phone_number: string;
  status?: 'pending' | 'calling' | 'completed' | 'failed';
  conversation_id?: string;
}

export interface UpdateCampaignCallInput {
  status?: 'pending' | 'calling' | 'completed' | 'failed';
  conversation_id?: string;
  started_at?: string;
  completed_at?: string;
  duration?: number;
  outcome?: 'interested' | 'not_interested' | 'callback' | 'appointment' | 'no_answer';
  error?: string;
}

export class CampaignRepository extends BaseRepository {
  constructor({ pool, client }: { pool?: Pool; client?: PoolClient }) {
    super({ pool, client });
  }

  // Campaign methods
  async findById(id: number): Promise<Campaign | null> {
    const result = await this.query<Campaign>(
      'SELECT * FROM campaigns WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByTenantId(tenantId: number, limit?: number, offset?: number): Promise<Campaign[]> {
    let query = 'SELECT * FROM campaigns WHERE tenant_id = $1 ORDER BY created_at DESC';
    const params: any[] = [tenantId];

    if (limit) {
      query += ' LIMIT $2';
      params.push(limit);
      
      if (offset) {
        query += ' OFFSET $3';
        params.push(offset);
      }
    }

    const result = await this.query<Campaign>(query, params);
    return result.rows;
  }

  async findByStatus(tenantId: number, status: string): Promise<Campaign[]> {
    const result = await this.query<Campaign>(
      'SELECT * FROM campaigns WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC',
      [tenantId, status]
    );
    return result.rows;
  }

  async findByBatchId(batchId: string): Promise<Campaign | null> {
    const result = await this.query<Campaign>(
      'SELECT * FROM campaigns WHERE batch_id = $1',
      [batchId]
    );
    return result.rows[0] || null;
  }

  async create(campaignData: CreateCampaignInput): Promise<Campaign> {
    const result = await this.query<Campaign>(
      `INSERT INTO campaigns (id, tenant_id, name, agent_id, campaign_type, status, custom_message, scheduled_at, total_leads, lead_ids, batch_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [
        campaignData.id,
        campaignData.tenant_id,
        campaignData.name,
        campaignData.agent_id,
        campaignData.campaign_type || 'voice_call',
        campaignData.status || 'draft',
        campaignData.custom_message,
        campaignData.scheduled_at,
        campaignData.total_leads,
        JSON.stringify(campaignData.lead_ids),
        campaignData.batch_id
      ]
    );
    return result.rows[0];
  }

  async update(id: number, campaignData: UpdateCampaignInput): Promise<Campaign | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (campaignData.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(campaignData.name);
    }

    if (campaignData.agent_id !== undefined) {
      setClause.push(`agent_id = $${paramCount++}`);
      values.push(campaignData.agent_id);
    }

    if (campaignData.campaign_type !== undefined) {
      setClause.push(`campaign_type = $${paramCount++}`);
      values.push(campaignData.campaign_type);
    }

    if (campaignData.status !== undefined) {
      setClause.push(`status = $${paramCount++}`);
      values.push(campaignData.status);
    }

    if (campaignData.custom_message !== undefined) {
      setClause.push(`custom_message = $${paramCount++}`);
      values.push(campaignData.custom_message);
    }

    if (campaignData.scheduled_at !== undefined) {
      setClause.push(`scheduled_at = $${paramCount++}`);
      values.push(campaignData.scheduled_at);
    }

    if (campaignData.started_at !== undefined) {
      setClause.push(`started_at = $${paramCount++}`);
      values.push(campaignData.started_at);
    }

    if (campaignData.completed_at !== undefined) {
      setClause.push(`completed_at = $${paramCount++}`);
      values.push(campaignData.completed_at);
    }

    if (campaignData.called !== undefined) {
      setClause.push(`called = $${paramCount++}`);
      values.push(campaignData.called);
    }

    if (campaignData.successful !== undefined) {
      setClause.push(`successful = $${paramCount++}`);
      values.push(campaignData.successful);
    }

    if (campaignData.failed !== undefined) {
      setClause.push(`failed = $${paramCount++}`);
      values.push(campaignData.failed);
    }

    if (campaignData.batch_id !== undefined) {
      setClause.push(`batch_id = $${paramCount++}`);
      values.push(campaignData.batch_id);
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.query<Campaign>(
      `UPDATE campaigns SET ${setClause.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM campaigns WHERE id = $1',
      [id]
    );
    return result.rowCount! > 0;
  }

  async countByTenantId(tenantId: number): Promise<number> {
    const result = await this.query(
      'SELECT COUNT(*) as count FROM campaigns WHERE tenant_id = $1',
      [tenantId]
    );
    return parseInt(result.rows[0].count);
  }

  async countByStatus(tenantId: number): Promise<{ status: string; count: number }[]> {
    const result = await this.query(
      `SELECT status, COUNT(*) as count 
       FROM campaigns 
       WHERE tenant_id = $1 
       GROUP BY status 
       ORDER BY status`,
      [tenantId]
    );
    return result.rows.map(row => ({
      status: row.status,
      count: parseInt(row.count)
    }));
  }

  // Campaign Call methods
  async findCallById(id: number): Promise<CampaignCall | null> {
    const result = await this.query<CampaignCall>(
      'SELECT * FROM campaign_calls WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findCallsByCampaignId(campaignId: number, limit?: number, offset?: number): Promise<CampaignCall[]> {
    let query = 'SELECT * FROM campaign_calls WHERE campaign_id = $1 ORDER BY created_at DESC';
    const params: any[] = [campaignId];

    if (limit) {
      query += ' LIMIT $2';
      params.push(limit);
      
      if (offset) {
        query += ' OFFSET $3';
        params.push(offset);
      }
    }

    const result = await this.query<CampaignCall>(query, params);
    return result.rows;
  }

  async findCallsByStatus(campaignId: number, status: string): Promise<CampaignCall[]> {
    const result = await this.query<CampaignCall>(
      'SELECT * FROM campaign_calls WHERE campaign_id = $1 AND status = $2 ORDER BY created_at DESC',
      [campaignId, status]
    );
    return result.rows;
  }

  async createCall(callData: CreateCampaignCallInput): Promise<CampaignCall> {
    const result = await this.query<CampaignCall>(
      `INSERT INTO campaign_calls (id, campaign_id, lead_id, phone_number, status, conversation_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        callData.id,
        callData.campaign_id,
        callData.lead_id,
        callData.phone_number,
        callData.status || 'pending',
        callData.conversation_id
      ]
    );
    return result.rows[0];
  }

  async createCalls(callsData: CreateCampaignCallInput[]): Promise<CampaignCall[]> {
    if (callsData.length === 0) return [];

    const values: any[] = [];
    const placeholders: string[] = [];
    let paramCount = 1;

    callsData.forEach((call) => {
      const placeholder = `($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++})`;
      placeholders.push(placeholder);
      
      values.push(
        call.id,
        call.campaign_id,
        call.lead_id,
        call.phone_number,
        call.status || 'pending',
        call.conversation_id
      );
    });

    const query = `
      INSERT INTO campaign_calls (id, campaign_id, lead_id, phone_number, status, conversation_id) 
      VALUES ${placeholders.join(', ')} 
      RETURNING *
    `;

    const result = await this.query<CampaignCall>(query, values);
    return result.rows;
  }

  async updateCall(id: number, callData: UpdateCampaignCallInput): Promise<CampaignCall | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (callData.status !== undefined) {
      setClause.push(`status = $${paramCount++}`);
      values.push(callData.status);
    }

    if (callData.conversation_id !== undefined) {
      setClause.push(`conversation_id = $${paramCount++}`);
      values.push(callData.conversation_id);
    }

    if (callData.started_at !== undefined) {
      setClause.push(`started_at = $${paramCount++}`);
      values.push(callData.started_at);
    }

    if (callData.completed_at !== undefined) {
      setClause.push(`completed_at = $${paramCount++}`);
      values.push(callData.completed_at);
    }

    if (callData.duration !== undefined) {
      setClause.push(`duration = $${paramCount++}`);
      values.push(callData.duration);
    }

    if (callData.outcome !== undefined) {
      setClause.push(`outcome = $${paramCount++}`);
      values.push(callData.outcome);
    }

    if (callData.error !== undefined) {
      setClause.push(`error = $${paramCount++}`);
      values.push(callData.error);
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.query<CampaignCall>(
      `UPDATE campaign_calls SET ${setClause.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  async deleteCall(id: number): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM campaign_calls WHERE id = $1',
      [id]
    );
    return result.rowCount! > 0;
  }

  async deleteCalls(campaignId: number): Promise<number> {
    const result = await this.query(
      'DELETE FROM campaign_calls WHERE campaign_id = $1',
      [campaignId]
    );
    return result.rowCount || 0;
  }

  async countCallsByCampaignId(campaignId: number): Promise<number> {
    const result = await this.query(
      'SELECT COUNT(*) as count FROM campaign_calls WHERE campaign_id = $1',
      [campaignId]
    );
    return parseInt(result.rows[0].count);
  }

  async countCallsByStatus(campaignId: number): Promise<{ status: string; count: number }[]> {
    const result = await this.query(
      `SELECT status, COUNT(*) as count 
       FROM campaign_calls 
       WHERE campaign_id = $1 
       GROUP BY status 
       ORDER BY status`,
      [campaignId]
    );
    return result.rows.map(row => ({
      status: row.status,
      count: parseInt(row.count)
    }));
  }
}