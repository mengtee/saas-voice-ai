import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export abstract class BaseRepository {
  protected pool?: Pool;
  protected client?: PoolClient;

  constructor({ pool, client }: { pool?: Pool; client?: PoolClient }) {
    this.pool = pool;
    this.client = client;
  }

  protected async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (this.client) {
      return this.client.query<T>(text, params);
    }
    
    if (this.pool) {
      return this.pool.query<T>(text, params);
    }
    
    throw new Error('No database connection available');
  }

  protected async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Pool connection required for transactions');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}