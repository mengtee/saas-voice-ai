import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { Config } from '../config';
import { AuthService } from '../services/authService';
import { createAuthMiddleware, requireRole } from '../middleware/auth';

export const createAuthRoutes = (pool: Pool, config: Config) => {
  const router = express.Router();
  const authService = new AuthService({ pool, config });
  const authenticateToken = createAuthMiddleware(pool, config);

  /**
   * POST /api/auth/login
   * 
   * Login endpoint - Frontend calls this with email/password
   * Returns JWT token + user data for successful authentication
   */
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      // Attempt login
      const result = await authService.login(email, password);

      // Success response - matches frontend API client expectations
      res.json({
        success: true,
        data: {
          token: result.token,
          user: result.user
        },
        message: 'Login successful'
      });

    } catch (error: any) {
      console.error('Login route error:', error);
      
      // Return generic error to prevent user enumeration
      res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
  });

  /**
   * POST /api/auth/logout
   * 
   * Logout endpoint - Currently stateless (just tells frontend to remove token)
   * In production, you might implement token blacklisting
   */
  router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
    try {
      // Since JWT is stateless, logout is handled client-side by removing token
      // Optional: Implement token blacklisting in Redis/database for immediate revocation
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error: any) {
      console.error('Logout route error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  });

  /**
   * GET /api/auth/me
   * 
   * Get current user info - Frontend calls this to verify token validity
   * Used by AuthGuard component to check if user is still authenticated
   */
  router.get('/me', authenticateToken, async (req: Request, res: Response) => {
    try {
      // User info is attached to req.user by auth middleware
      res.json({
        success: true,
        data: req.user,
        message: 'User retrieved successfully'
      });

    } catch (error: any) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user information'
      });
    }
  });

  /**
   * POST /api/auth/users (Admin only)
   * 
   * Create new user - Only admins can create users
   * Demonstrates role-based authorization
   */
  router.post('/users', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { email, password, name, role } = req.body;

      // Validate input
      if (!email || !password || !name || !role) {
        return res.status(400).json({
          success: false,
          error: 'Email, password, name, and role are required'
        });
      }

      if (!['admin', 'agent', 'viewer'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role. Must be: admin, agent, or viewer'
        });
      }

      // Create user
      const user = await authService.createUser({ email, password, name, role });

      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
      });

    } catch (error: any) {
      console.error('Create user route error:', error);
      
      if (error.message.includes('duplicate key value')) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create user'
      });
    }
  });

  /**
   * GET /api/auth/validate-token
   * 
   * Quick token validation endpoint - returns just success/failure
   * Useful for quick auth checks without returning full user data
   */
  router.get('/validate-token', authenticateToken, (req: Request, res: Response) => {
    // If we reach here, token is valid (middleware passed)
    res.json({
      success: true,
      message: 'Token is valid'
    });
  });

  return router;
};