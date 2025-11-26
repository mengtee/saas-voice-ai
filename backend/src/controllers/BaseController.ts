import { Request, Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export abstract class BaseController {
  protected sendSuccess<T>(res: Response, data?: T, message?: string): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message
    };
    res.json(response);
  }

  protected sendCreated<T>(res: Response, data: T, message?: string): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message
    };
    res.status(201).json(response);
  }

  protected sendError(res: Response, error: string, statusCode: number = 400): void {
    const response: ApiResponse = {
      success: false,
      error
    };
    res.status(statusCode).json(response);
  }

  protected sendNotFound(res: Response, message: string = 'Resource not found'): void {
    this.sendError(res, message, 404);
  }

  protected sendUnauthorized(res: Response, message: string = 'Unauthorized'): void {
    this.sendError(res, message, 401);
  }

  protected sendForbidden(res: Response, message: string = 'Forbidden'): void {
    this.sendError(res, message, 403);
  }

  protected sendInternalError(res: Response, message: string = 'Internal server error'): void {
    this.sendError(res, message, 500);
  }

  protected validateRequired(fields: { [key: string]: any }): string[] {
    const missing: string[] = [];
    
    Object.entries(fields).forEach(([fieldName, value]) => {
      if (value === undefined || value === null || value === '') {
        missing.push(fieldName);
      }
    });
    
    return missing;
  }

  protected getPagination(req: Request): { limit?: number; offset?: number } {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    return {
      limit: limit > 100 ? 100 : limit, // Max 100 items per page
      offset: offset < 0 ? 0 : offset
    };
  }

  protected getUserFromRequest(req: Request): { id: number; tenant_id: number; role: string } {
    if (!req.user) {
      throw new Error('User not found in request');
    }
    return {
      id: parseInt(req.user.id),
      tenant_id: parseInt(req.user.tenant_id),
      role: req.user.role
    };
  }

  protected parseId(idStr: string): number {
    const id = parseInt(idStr);
    if (isNaN(id)) {
      throw new Error('Invalid ID format');
    }
    return id;
  }
}