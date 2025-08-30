import { Pool, PoolClient } from 'pg';
import { BaseService } from './base';
import * as XLSX from 'xlsx';
import csv from 'csv-parser';
import fs from 'fs';

// Lead interface for database operations
interface Lead {
  id?: string;
  tenant_id: string;
  assigned_user_id?: string;
  date: string;
  name: string;
  phone_number: string;
  email?: string;
  purpose?: string;
  status: 'pending' | 'called' | 'scheduled' | 'completed' | 'failed';
  notes?: string;
}

// Interface for CSV/Excel row data
interface LeadRow {
  date?: string;
  name?: string;
  phone?: string;
  phone_number?: string;
  email?: string;
  purpose?: string;
  call_status?: string;
  status?: string;
  notes?: string;
}

// Result interface for upload operation
interface UploadResult {
  success: boolean;
  imported: number;
  errors: string[];
  duplicates: number;
  total: number;
}

export class LeadService extends BaseService {
  constructor({ pool, client }: { pool?: Pool; client?: PoolClient }) {
    super({ pool, client });
  }

  /**
   * Upload leads from CSV or Excel file
   */
  async uploadLeads(filePath: string, fileName: string, tenantId: string): Promise<UploadResult> {
    const result: UploadResult = {
      success: false,
      imported: 0,
      errors: [],
      duplicates: 0,
      total: 0
    };

    try {
      let leadRows: LeadRow[] = [];

      // Parse file based on extension
      if (fileName.endsWith('.csv')) {
        leadRows = await this.parseCSV(filePath);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        leadRows = await this.parseExcel(filePath);
      } else {
        result.errors.push('Unsupported file format. Please use CSV or Excel files.');
        return result;
      }

      result.total = leadRows.length;

      if (leadRows.length === 0) {
        result.errors.push('No data found in file.');
        return result;
      }

      // Process each lead
      for (let i = 0; i < leadRows.length; i++) {
        const rowData = leadRows[i];
        const rowNumber = i + 2; // Account for header row

        try {
          // Validate and normalize lead data
          const lead = this.validateAndNormalizeLead(rowData, rowNumber, tenantId);
          
          if (lead) {
            // Check for duplicate phone numbers within the same tenant
            const existingLead = await this.findLeadByPhone(lead.phone_number, tenantId);
            
            if (existingLead) {
              result.duplicates++;
              result.errors.push(`Row ${rowNumber}: Lead with phone ${lead.phone_number} already exists`);
            } else {
              // Insert new lead
              await this.createLead(lead);
              result.imported++;
            }
          }
        } catch (error) {
          result.errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.success = result.imported > 0;
      return result;

    } catch (error) {
      result.errors.push(`File processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    } finally {
      // Clean up uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.warn('Failed to clean up uploaded file:', cleanupError);
      }
    }
  }

  /**
   * Parse CSV file
   */
  private async parseCSV(filePath: string): Promise<LeadRow[]> {
    return new Promise((resolve, reject) => {
      const results: LeadRow[] = [];
      
      fs.createReadStream(filePath)
        .pipe(csv({
          mapHeaders: ({ header }) => header.toLowerCase().trim()
        }))
        .on('data', (data: LeadRow) => {
          results.push(data);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Parse Excel file
   */
  private async parseExcel(filePath: string): Promise<LeadRow[]> {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with headers in lowercase
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false, // Convert everything to strings
        defval: '' // Default value for empty cells
      });

      // Normalize headers to lowercase
      return jsonData.map((row: any) => {
        const normalizedRow: LeadRow = {};
        Object.keys(row).forEach(key => {
          const normalizedKey = key.toLowerCase().trim();
          normalizedRow[normalizedKey as keyof LeadRow] = row[key];
        });
        return normalizedRow;
      });
    } catch (error) {
      throw new Error(`Excel parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate and normalize lead data from CSV/Excel row
   */
  private validateAndNormalizeLead(rowData: LeadRow, rowNumber: number, tenantId: string): Lead | null {
    const errors: string[] = [];

    // Extract name (required)
    const name = (rowData.name || '').trim();
    if (!name) {
      errors.push('Name is required');
    }

    // Extract phone number (required) - try different column names
    let phone_number = (rowData.phone_number || rowData.phone || '').trim();
    if (!phone_number) {
      errors.push('Phone number is required');
    } else {
      // Basic phone validation and normalization
      phone_number = this.normalizePhoneNumber(phone_number);
      if (!this.isValidPhoneNumber(phone_number)) {
        errors.push('Invalid phone number format');
      }
    }

    // Extract date field (required)
    const dateStr = (rowData.date || '').trim();
    let date: string;
    
    if (!dateStr) {
      // Default to current date if not provided
      date = new Date().toISOString();
    } else {
      // Validate date format
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        errors.push('Invalid date format. Please use YYYY-MM-DD format');
        date = new Date().toISOString(); // Fallback
      } else {
        date = parsedDate.toISOString();
      }
    }

    // Extract optional fields
    const email = (rowData.email || '').trim() || undefined;
    const purpose = (rowData.purpose || '').trim() || undefined;
    const notes = (rowData.notes || '').trim() || undefined;
    
    // Handle call_status field - map it to status
    let status: 'pending' | 'called' | 'scheduled' | 'completed' | 'failed' = 'pending';
    const callStatus = (rowData.call_status || rowData.status || '').trim().toLowerCase();
    
    if (callStatus && ['pending', 'called', 'scheduled', 'completed', 'failed'].includes(callStatus)) {
      status = callStatus as 'pending' | 'called' | 'scheduled' | 'completed' | 'failed';
    }

    // Validate email if provided
    if (email && !this.isValidEmail(email)) {
      errors.push('Invalid email format');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    return {
      tenant_id: tenantId,
      date,
      name,
      phone_number,
      email,
      purpose,
      notes,
      status
    };
  }

  /**
   * Normalize phone number format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except + at the start
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // If no country code, assume US (+1)
    if (!normalized.startsWith('+')) {
      if (normalized.length === 10) {
        normalized = '+1' + normalized;
      } else if (normalized.length === 11 && normalized.startsWith('1')) {
        normalized = '+' + normalized;
      }
    }
    
    return normalized;
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Basic validation for international phone numbers
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Find existing lead by phone number within tenant
   */
  private async findLeadByPhone(phoneNumber: string, tenantId: string): Promise<Lead | null> {
    try {
      const result = await this.query<Lead>(
        'SELECT * FROM leads WHERE phone_number = $1 AND tenant_id = $2',
        [phoneNumber, tenantId]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding lead by phone:', error);
      return null;
    }
  }

  /**
   * Create new lead in database
   */
  public async createLead(lead: Lead): Promise<Lead> {
    const result = await this.query<Lead>(
      `INSERT INTO leads (tenant_id, assigned_user_id, date, name, phone_number, email, purpose, status, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [lead.tenant_id, lead.assigned_user_id, lead.date, lead.name, lead.phone_number, lead.email, lead.purpose, lead.status, lead.notes]
    );

    return result.rows[0];
  }

  /**
   * Update an existing lead
   */
  async updateLead(leadId: string, updates: Partial<Lead>, tenantId: string): Promise<Lead> {
    try {
      // First, verify the lead exists and belongs to the tenant
      const existingLead = await this.query<Lead>(
        'SELECT * FROM leads WHERE id = $1 AND tenant_id = $2',
        [leadId, tenantId]
      );

      if (existingLead.rows.length === 0) {
        throw new Error('Lead not found or access denied');
      }

      // Build dynamic update query based on provided fields
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCounter = 1;

      // Handle each possible update field
      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramCounter}`);
        updateValues.push(updates.name.trim());
        paramCounter++;
      }

      if (updates.phone_number !== undefined) {
        const normalizedPhone = this.normalizePhoneNumber(updates.phone_number.trim());
        if (!this.isValidPhoneNumber(normalizedPhone)) {
          throw new Error('Invalid phone number format');
        }
        
        // Check for duplicate phone numbers within tenant (excluding current lead)
        const duplicateCheck = await this.query<Lead>(
          'SELECT id FROM leads WHERE phone_number = $1 AND tenant_id = $2 AND id != $3',
          [normalizedPhone, tenantId, leadId]
        );
        
        if (duplicateCheck.rows.length > 0) {
          throw new Error('Phone number already exists for another lead');
        }

        updateFields.push(`phone_number = $${paramCounter}`);
        updateValues.push(normalizedPhone);
        paramCounter++;
      }

      if (updates.email !== undefined) {
        const email = updates.email.trim();
        if (email && !this.isValidEmail(email)) {
          throw new Error('Invalid email format');
        }
        updateFields.push(`email = $${paramCounter}`);
        updateValues.push(email || null);
        paramCounter++;
      }

      if (updates.purpose !== undefined) {
        updateFields.push(`purpose = $${paramCounter}`);
        updateValues.push(updates.purpose.trim() || null);
        paramCounter++;
      }

      if (updates.status !== undefined) {
        const validStatuses = ['pending', 'called', 'scheduled', 'completed', 'failed'];
        if (!validStatuses.includes(updates.status)) {
          throw new Error('Invalid status value');
        }
        updateFields.push(`status = $${paramCounter}`);
        updateValues.push(updates.status);
        paramCounter++;
      }

      if (updates.notes !== undefined) {
        updateFields.push(`notes = $${paramCounter}`);
        updateValues.push(updates.notes.trim() || null);
        paramCounter++;
      }

      if (updates.date !== undefined) {
        const date = new Date(updates.date);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date format');
        }
        updateFields.push(`date = $${paramCounter}`);
        updateValues.push(date.toISOString());
        paramCounter++;
      }

      if (updates.assigned_user_id !== undefined) {
        updateFields.push(`assigned_user_id = $${paramCounter}`);
        updateValues.push(updates.assigned_user_id);
        paramCounter++;
      }

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = $${paramCounter}`);
      updateValues.push(new Date().toISOString());
      paramCounter++;

      if (updateFields.length === 1) { // Only updated_at was added
        throw new Error('No fields provided for update');
      }

      // Add WHERE clause parameters
      updateValues.push(leadId, tenantId);
      
      const query = `
        UPDATE leads 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCounter} AND tenant_id = $${paramCounter + 1}
        RETURNING *
      `;

      const result = await this.query<Lead>(query, updateValues);

      if (result.rows.length === 0) {
        throw new Error('Failed to update lead');
      }

      return result.rows[0];

    } catch (error) {
      console.error('Error updating lead:', error);
      throw error;
    }
  }

  /**
   * Get all leads with pagination, search, and filtering for a tenant
   */
  async getLeads(
    tenantId: string, 
    page: number = 1, 
    pageSize: number = 50, 
    search: string = '', 
    status: string = ''
  ): Promise<{
    leads: Lead[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * pageSize;

    // Build WHERE conditions
    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramCounter = 2;

    // Add search condition
    if (search.trim()) {
      conditions.push(`(
        name ILIKE $${paramCounter} OR 
        phone_number ILIKE $${paramCounter} OR 
        email ILIKE $${paramCounter} OR 
        purpose ILIKE $${paramCounter}
      )`);
      params.push(`%${search.trim()}%`);
      paramCounter++;
    }

    // Add status filter
    if (status.trim() && status !== 'all') {
      conditions.push(`status = $${paramCounter}`);
      params.push(status.trim());
      paramCounter++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Get total count with filters
    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM leads ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated leads with filters
    const leadsResult = await this.query<Lead>(
      `SELECT * FROM leads 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`,
      [...params, pageSize, offset]
    );

    return {
      leads: leadsResult.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }
}