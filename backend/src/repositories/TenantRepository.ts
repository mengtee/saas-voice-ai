import { Pool, PoolClient } from 'pg';
import { BaseRepository } from './BaseRepository';

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  domain?: string;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  domain?: string;
  settings?: Record<string, any>;
}

export interface UpdateTenantInput {
  name?: string;
  slug?: string;
  domain?: string;
  settings?: Record<string, any>;
}

export class TenantRepository extends BaseRepository {
  constructor({ pool, client }: { pool?: Pool; client?: PoolClient }) {
    super({ pool, client });
  }

  async create(input: CreateTenantInput): Promise<Tenant> {
    const query = `
      INSERT INTO tenants (name, slug, domain, settings)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [
      input.name,
      input.slug,
      input.domain || null,
      input.settings ? JSON.stringify(input.settings) : null
    ];

    const result = await this.query<Tenant>(query, values);
    if (!result.rows[0]) {
      throw new Error('Failed to create tenant');
    }

    return result.rows[0];
  }

  async findById(id: number): Promise<Tenant | null> {
    const query = 'SELECT * FROM tenants WHERE id = $1';
    const result = await this.query<Tenant>(query, [id]);
    return result.rows[0] || null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const query = 'SELECT * FROM tenants WHERE slug = $1';
    const result = await this.query<Tenant>(query, [slug]);
    return result.rows[0] || null;
  }

  async findByDomain(domain: string): Promise<Tenant | null> {
    const query = 'SELECT * FROM tenants WHERE domain = $1';
    const result = await this.query<Tenant>(query, [domain]);
    return result.rows[0] || null;
  }

  async update(id: number, input: UpdateTenantInput): Promise<Tenant | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(input.name);
    }
    
    if (input.slug !== undefined) {
      fields.push(`slug = $${paramCount++}`);
      values.push(input.slug);
    }
    
    if (input.domain !== undefined) {
      fields.push(`domain = $${paramCount++}`);
      values.push(input.domain);
    }
    
    if (input.settings !== undefined) {
      fields.push(`settings = $${paramCount++}`);
      values.push(input.settings ? JSON.stringify(input.settings) : null);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE tenants 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.query<Tenant>(query, values);
    return result.rows[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM tenants WHERE id = $1';
    const result = await this.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async list(limit = 50, offset = 0): Promise<Tenant[]> {
    const query = `
      SELECT * FROM tenants 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await this.query<Tenant>(query, [limit, offset]);
    return result.rows;
  }

  async generateUniqueSlug(baseName: string): Promise<string> {
    // Convert name to slug format
    let slug = baseName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // Ensure minimum length
    if (slug.length < 3) {
      slug = `tenant-${slug}`;
    }

    // Check if slug exists and make it unique
    const existingTenant = await this.findBySlug(slug);
    if (!existingTenant) {
      return slug;
    }

    // Generate unique slug by adding numbers
    let counter = 1;
    let uniqueSlug = `${slug}-${counter}`;
    
    while (await this.findBySlug(uniqueSlug)) {
      counter++;
      uniqueSlug = `${slug}-${counter}`;
    }

    return uniqueSlug;
  }
}