import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { LeadService } from '../services/leadService';
import { LeadRepository, LeadFilters } from '../repositories/LeadRepository';

export class LeadsController extends BaseController {
  constructor(private leadService: LeadService, private leadRepository: LeadRepository) {
    super();
  }

  getLeads = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUser = this.getUserFromRequest(req);
      const { limit, offset } = this.getPagination(req);

      const filters: LeadFilters = {};
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.assigned_user_id) filters.assigned_user_id = req.query.assigned_user_id as string;
      if (req.query.date_from) filters.date_from = req.query.date_from as string;
      if (req.query.date_to) filters.date_to = req.query.date_to as string;
      if (req.query.search) filters.search = req.query.search as string;

      // If user is not admin, only show their assigned leads
      if (currentUser.role !== 'admin') {
        filters.assigned_user_id = currentUser.id;
      }

      const leads = await this.leadRepository.findByTenantId(currentUser.tenant_id, filters, limit, offset);
      const total = await this.leadRepository.countByTenantId(currentUser.tenant_id, filters);

      this.sendSuccess(res, {
        leads,
        total,
        page: Math.floor((offset || 0) / (limit || 20)) + 1,
        limit
      }, 'Leads retrieved successfully');

    } catch (error: any) {
      console.error('Get leads controller error:', error);
      this.sendInternalError(res, 'Failed to retrieve leads');
    }
  };

  getLead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const currentUser = this.getUserFromRequest(req);

      const lead = await this.leadRepository.findById(id);
      if (!lead) {
        this.sendNotFound(res, 'Lead not found');
        return;
      }

      if (lead.tenant_id !== currentUser.tenant_id) {
        this.sendForbidden(res, 'Access denied');
        return;
      }

      // If user is not admin, only allow access to their assigned leads
      if (currentUser.role !== 'admin' && lead.assigned_user_id !== currentUser.id) {
        this.sendForbidden(res, 'Access denied');
        return;
      }

      this.sendSuccess(res, lead, 'Lead retrieved successfully');

    } catch (error: any) {
      console.error('Get lead controller error:', error);
      this.sendInternalError(res, 'Failed to retrieve lead');
    }
  };

  createLead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, phone_number, email, purpose, status, notes, assigned_user_id, date } = req.body;
      const currentUser = this.getUserFromRequest(req);

      const missingFields = this.validateRequired({ name, phone_number });
      if (missingFields.length > 0) {
        this.sendError(res, `Missing required fields: ${missingFields.join(', ')}`);
        return;
      }

      if (status && !['pending', 'called', 'scheduled', 'completed', 'failed'].includes(status)) {
        this.sendError(res, 'Invalid status. Must be: pending, called, scheduled, completed, or failed');
        return;
      }

      const leadData = {
        tenant_id: currentUser.tenant_id,
        assigned_user_id: assigned_user_id || currentUser.id,
        date: date || new Date().toISOString(),
        name,
        phone_number,
        email,
        purpose,
        status,
        notes
      };

      const lead = await this.leadRepository.create(leadData);
      this.sendCreated(res, lead, 'Lead created successfully');

    } catch (error: any) {
      console.error('Create lead controller error:', error);
      this.sendInternalError(res, 'Failed to create lead');
    }
  };

  updateLead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, phone_number, email, purpose, status, notes, assigned_user_id, date } = req.body;
      const currentUser = this.getUserFromRequest(req);

      const existingLead = await this.leadRepository.findById(id);
      if (!existingLead) {
        this.sendNotFound(res, 'Lead not found');
        return;
      }

      if (existingLead.tenant_id !== currentUser.tenant_id) {
        this.sendForbidden(res, 'Access denied');
        return;
      }

      // If user is not admin, only allow updating their assigned leads
      if (currentUser.role !== 'admin' && existingLead.assigned_user_id !== currentUser.id) {
        this.sendForbidden(res, 'Access denied');
        return;
      }

      if (status && !['pending', 'called', 'scheduled', 'completed', 'failed'].includes(status)) {
        this.sendError(res, 'Invalid status. Must be: pending, called, scheduled, completed, or failed');
        return;
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (phone_number !== undefined) updateData.phone_number = phone_number;
      if (email !== undefined) updateData.email = email;
      if (purpose !== undefined) updateData.purpose = purpose;
      if (status !== undefined) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (date !== undefined) updateData.date = date;
      
      // Only admins can reassign leads
      if (assigned_user_id !== undefined && currentUser.role === 'admin') {
        updateData.assigned_user_id = assigned_user_id;
      }

      if (Object.keys(updateData).length === 0) {
        this.sendError(res, 'No fields to update');
        return;
      }

      const updatedLead = await this.leadRepository.update(id, updateData);
      if (!updatedLead) {
        this.sendNotFound(res, 'Lead not found');
        return;
      }

      this.sendSuccess(res, updatedLead, 'Lead updated successfully');

    } catch (error: any) {
      console.error('Update lead controller error:', error);
      this.sendInternalError(res, 'Failed to update lead');
    }
  };

  deleteLead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const currentUser = this.getUserFromRequest(req);

      const existingLead = await this.leadRepository.findById(id);
      if (!existingLead) {
        this.sendNotFound(res, 'Lead not found');
        return;
      }

      if (existingLead.tenant_id !== currentUser.tenant_id) {
        this.sendForbidden(res, 'Access denied');
        return;
      }

      // If user is not admin, only allow deleting their assigned leads
      if (currentUser.role !== 'admin' && existingLead.assigned_user_id !== currentUser.id) {
        this.sendForbidden(res, 'Access denied');
        return;
      }

      const deleted = await this.leadRepository.delete(id);
      if (!deleted) {
        this.sendNotFound(res, 'Lead not found');
        return;
      }

      this.sendSuccess(res, undefined, 'Lead deleted successfully');

    } catch (error: any) {
      console.error('Delete lead controller error:', error);
      this.sendInternalError(res, 'Failed to delete lead');
    }
  };

  importLeads = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUser = this.getUserFromRequest(req);

      if (!req.file) {
        this.sendError(res, 'No file uploaded');
        return;
      }

      // Use the actual LeadService method signature
      const result = await this.leadService.uploadLeads(req.file.path, req.file.filename || 'upload', currentUser.tenant_id);
      this.sendSuccess(res, result, 'Leads imported successfully');

    } catch (error: any) {
      console.error('Import leads controller error:', error);
      
      if (error.message.includes('Invalid file format') || error.message.includes('required columns')) {
        this.sendError(res, error.message);
      } else {
        this.sendInternalError(res, 'Failed to import leads');
      }
    }
  };

  getLeadStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUser = this.getUserFromRequest(req);

      const filters: LeadFilters = {};
      if (currentUser.role !== 'admin') {
        filters.assigned_user_id = currentUser.id;
      }

      const statusCounts = await this.leadRepository.countByStatus(currentUser.tenant_id);
      const totalLeads = await this.leadRepository.countByTenantId(currentUser.tenant_id, filters);

      this.sendSuccess(res, {
        total: totalLeads,
        byStatus: statusCounts
      }, 'Lead statistics retrieved successfully');

    } catch (error: any) {
      console.error('Get lead statistics controller error:', error);
      this.sendInternalError(res, 'Failed to retrieve lead statistics');
    }
  };

}