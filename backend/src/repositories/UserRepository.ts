import { Pool, PoolClient } from 'pg';
import { BaseRepository } from './BaseRepository';

export interface User {
  id: number;
  tenant_id: number;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'agent' | 'viewer';
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface CreateUserInput {
  tenant_id: number;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'agent' | 'viewer';
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: 'admin' | 'agent' | 'viewer';
  last_login?: Date;
}

export class UserRepository extends BaseRepository {
  constructor({ pool, client }: { pool?: Pool; client?: PoolClient }) {
    super({ pool, client });
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  async findByTenantIdAndEmail(tenantId: string, email: string): Promise<User | null> {
    const result = await this.query<User>(
      'SELECT * FROM users WHERE tenant_id = $1 AND email = $2',
      [tenantId, email]
    );
    return result.rows[0] || null;
  }

  async findByTenantId(tenantId: string, limit?: number, offset?: number): Promise<User[]> {
    let query = 'SELECT * FROM users WHERE tenant_id = $1 ORDER BY created_at DESC';
    const params: any[] = [tenantId];

    if (limit) {
      query += ' LIMIT $2';
      params.push(limit);
      
      if (offset) {
        query += ' OFFSET $3';
        params.push(offset);
      }
    }

    const result = await this.query<User>(query, params);
    return result.rows;
  }

  async create(userData: CreateUserInput): Promise<User> {
    const result = await this.query<User>(
      `INSERT INTO users (tenant_id, email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [userData.tenant_id, userData.email, userData.password_hash, userData.name, userData.role]
    );
    return result.rows[0];
  }

  async update(id: string, userData: UpdateUserInput): Promise<User | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (userData.email !== undefined) {
      setClause.push(`email = $${paramCount++}`);
      values.push(userData.email);
    }

    if (userData.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(userData.name);
    }

    if (userData.role !== undefined) {
      setClause.push(`role = $${paramCount++}`);
      values.push(userData.role);
    }

    if (userData.last_login !== undefined) {
      setClause.push(`last_login = $${paramCount++}`);
      values.push(userData.last_login);
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.query<User>(
      `UPDATE users SET ${setClause.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
    return result.rowCount! > 0;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [id]
    );
  }

  async countByTenantId(tenantId: string): Promise<number> {
    const result = await this.query(
      'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1',
      [tenantId]
    );
    return parseInt(result.rows[0].count);
  }

  async findByRole(tenantId: string, role: 'admin' | 'agent' | 'viewer'): Promise<User[]> {
    const result = await this.query<User>(
      'SELECT * FROM users WHERE tenant_id = $1 AND role = $2 ORDER BY created_at DESC',
      [tenantId, role]
    );
    return result.rows;
  }
}