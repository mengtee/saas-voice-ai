import { Pool, PoolClient } from 'pg';
import { BaseRepository } from './BaseRepository';

export interface Lead {
  id: number;
  tenant_id: number;
  assigned_user_id: number;
  date: string;
  name: string;
  phone_number: string;
  email?: string;
  purpose?: string;
  status: 'pending' | 'called' | 'scheduled' | 'completed' | 'failed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadInput {
  tenant_id: number;
  assigned_user_id: number;
  date: string;
  name: string;
  phone_number: string;
  email?: string;
  purpose?: string;
  status?: 'pending' | 'called' | 'scheduled' | 'completed' | 'failed';
  notes?: string;
}

export interface UpdateLeadInput {
  assigned_user_id?: number;
  date?: string;
  name?: string;
  phone_number?: string;
  email?: string;
  purpose?: string;
  status?: 'pending' | 'called' | 'scheduled' | 'completed' | 'failed';
  notes?: string;
}

export interface LeadFilters {
  status?: string;
  assigned_user_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export class LeadRepository extends BaseRepository {
  constructor({ pool, client }: { pool?: Pool; client?: PoolClient }) {
    super({ pool, client });
  }

  async findById(id: number): Promise<Lead | null> {
    const result = await this.query<Lead>(
      'SELECT * FROM leads WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByTenantId(tenantId: number, filters?: LeadFilters, limit?: number, offset?: number): Promise<Lead[]> {
    let query = 'SELECT * FROM leads WHERE tenant_id = $1';
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters) {
      if (filters.status) {
        query += ` AND status = $${paramCount++}`;
        params.push(filters.status);
      }

      if (filters.assigned_user_id) {
        query += ` AND assigned_user_id = $${paramCount++}`;
        params.push(filters.assigned_user_id);
      }

      if (filters.date_from) {
        query += ` AND date >= $${paramCount++}`;
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        query += ` AND date <= $${paramCount++}`;
        params.push(filters.date_to);
      }

      if (filters.search) {
        query += ` AND (name ILIKE $${paramCount++} OR phone_number ILIKE $${paramCount++} OR email ILIKE $${paramCount++})`;
        const searchPattern = `%${filters.search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
        paramCount += 2;
      }
    }

    query += ' ORDER BY created_at DESC';

    if (limit) {
      query += ` LIMIT $${paramCount++}`;
      params.push(limit);
      
      if (offset) {
        query += ` OFFSET $${paramCount}`;
        params.push(offset);
      }
    }

    const result = await this.query<Lead>(query, params);
    return result.rows;
  }

  async findByAssignedUserId(assignedUserId: number, limit?: number, offset?: number): Promise<Lead[]> {
    let query = 'SELECT * FROM leads WHERE assigned_user_id = $1 ORDER BY created_at DESC';
    const params: any[] = [assignedUserId];

    if (limit) {
      query += ' LIMIT $2';
      params.push(limit);
      
      if (offset) {
        query += ' OFFSET $3';
        params.push(offset);
      }
    }

    const result = await this.query<Lead>(query, params);
    return result.rows;
  }

  async findByPhoneNumber(tenantId: number, phoneNumber: string): Promise<Lead | null> {
    const result = await this.query<Lead>(
      'SELECT * FROM leads WHERE tenant_id = $1 AND phone_number = $2',
      [tenantId, phoneNumber]
    );
    return result.rows[0] || null;
  }

  async create(leadData: CreateLeadInput): Promise<Lead> {
    const result = await this.query<Lead>(
      `INSERT INTO leads (tenant_id, assigned_user_id, date, name, phone_number, email, purpose, status, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        leadData.tenant_id,
        leadData.assigned_user_id,
        leadData.date,
        leadData.name,
        leadData.phone_number,
        leadData.email,
        leadData.purpose,
        leadData.status || 'pending',
        leadData.notes
      ]
    );
    return result.rows[0];
  }

  async createMany(leadsData: CreateLeadInput[]): Promise<Lead[]> {
    if (leadsData.length === 0) return [];

    const values: any[] = [];
    const placeholders: string[] = [];
    let paramCount = 1;

    leadsData.forEach((lead) => {
      const placeholder = `($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++})`;
      placeholders.push(placeholder);
      
      values.push(
        lead.tenant_id,
        lead.assigned_user_id,
        lead.date,
        lead.name,
        lead.phone_number,
        lead.email,
        lead.purpose,
        lead.status || 'pending',
        lead.notes
      );
    });

    const query = `
      INSERT INTO leads (tenant_id, assigned_user_id, date, name, phone_number, email, purpose, status, notes) 
      VALUES ${placeholders.join(', ')} 
      RETURNING *
    `;

    const result = await this.query<Lead>(query, values);
    return result.rows;
  }

  async update(id: number, leadData: UpdateLeadInput): Promise<Lead | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (leadData.assigned_user_id !== undefined) {
      setClause.push(`assigned_user_id = $${paramCount++}`);
      values.push(leadData.assigned_user_id);
    }

    if (leadData.date !== undefined) {
      setClause.push(`date = $${paramCount++}`);
      values.push(leadData.date);
    }

    if (leadData.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(leadData.name);
    }

    if (leadData.phone_number !== undefined) {
      setClause.push(`phone_number = $${paramCount++}`);
      values.push(leadData.phone_number);
    }

    if (leadData.email !== undefined) {
      setClause.push(`email = $${paramCount++}`);
      values.push(leadData.email);
    }

    if (leadData.purpose !== undefined) {
      setClause.push(`purpose = $${paramCount++}`);
      values.push(leadData.purpose);
    }

    if (leadData.status !== undefined) {
      setClause.push(`status = $${paramCount++}`);
      values.push(leadData.status);
    }

    if (leadData.notes !== undefined) {
      setClause.push(`notes = $${paramCount++}`);
      values.push(leadData.notes);
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.query<Lead>(
      `UPDATE leads SET ${setClause.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM leads WHERE id = $1',
      [id]
    );
    return result.rowCount! > 0;
  }

  async deleteMany(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const result = await this.query(
      `DELETE FROM leads WHERE id IN (${placeholders})`,
      ids
    );
    return result.rowCount || 0;
  }

  async countByTenantId(tenantId: number, filters?: LeadFilters): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM leads WHERE tenant_id = $1';
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters) {
      if (filters.status) {
        query += ` AND status = $${paramCount++}`;
        params.push(filters.status);
      }

      if (filters.assigned_user_id) {
        query += ` AND assigned_user_id = $${paramCount++}`;
        params.push(filters.assigned_user_id);
      }

      if (filters.date_from) {
        query += ` AND date >= $${paramCount++}`;
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        query += ` AND date <= $${paramCount++}`;
        params.push(filters.date_to);
      }

      if (filters.search) {
        query += ` AND (name ILIKE $${paramCount++} OR phone_number ILIKE $${paramCount++} OR email ILIKE $${paramCount++})`;
        const searchPattern = `%${filters.search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
        paramCount += 2;
      }
    }

    const result = await this.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async countByStatus(tenantId: number): Promise<{ status: string; count: number }[]> {
    const result = await this.query(
      `SELECT status, COUNT(*) as count 
       FROM leads 
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
}