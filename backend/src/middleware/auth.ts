import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { UserRepository } from '../repositories/UserRepository';
import { Pool } from 'pg';
import { Config } from '../config';

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        tenant_id: string;
        email: string;
        name: string;
        role: string;
        created_at: string;
        updated_at: string;
        last_login?: string;
      };
    }
  }
}

/**
 * JWT Authentication Middleware
 * 
 * How it works:
 * 1. Extract JWT token from Authorization header: "Bearer <token>"
 * 2. Verify token signature using AuthService
 * 3. If valid, attach user info to req.user
 * 4. If invalid, return 401 Unauthorized
 * 
 * Usage: Add to routes that need authentication
 * app.get('/protected', authenticateToken, (req, res) => { ... })
 */
export const createAuthMiddleware = (pool: Pool, config: Config) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: 'Authorization header missing'
        });
      }

      // Expected format: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Invalid authorization format. Expected: Bearer <token>'
        });
      }

      // Extract token (remove "Bearer " prefix)
      const token = authHeader.slice(7);

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Token missing'
        });
      }

      // Verify token using AuthService
      const userRepository = new UserRepository({ pool });
      const authService = new AuthService(config, userRepository);
      const user = await authService.verifyToken(token);

      // Attach user info to request object
      req.user = user;

      // Continue to next middleware/route handler
      next();

    } catch (error: any) {
      console.error('Auth middleware error:', error);
      
      // Handle specific JWT errors
      if (error.message === 'Invalid token' || error.message === 'Token expired') {
        return res.status(401).json({
          success: false,
          error: error.message
        });
      }

      // Generic auth error
      return res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }
  };
};

/**
 * Role-based Authorization Middleware
 * 
 * Usage: Restrict routes to specific roles
 * app.get('/admin', authenticateToken, requireRole(['admin']), (req, res) => { ... })
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};