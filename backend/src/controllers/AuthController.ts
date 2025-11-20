import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { AuthService } from '../services/authService';
import { UserRepository } from '../repositories/UserRepository';

export class AuthController extends BaseController {
  constructor(private authService: AuthService, private userRepository: UserRepository) {
    super();
  }

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      const missingFields = this.validateRequired({ email, password });
      if (missingFields.length > 0) {
        this.sendError(res, `Missing required fields: ${missingFields.join(', ')}`);
        return;
      }

      const result = await this.authService.login(email, password);
      this.sendSuccess(res, result, 'Login successful');

    } catch (error: any) {
      console.error('Login controller error:', error);
      
      if (error.message === 'Invalid credentials' || error.message === 'Login failed') {
        this.sendUnauthorized(res, 'Invalid email or password');
      } else {
        this.sendInternalError(res, 'Login failed');
      }
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      this.sendSuccess(res, undefined, 'Logged out successfully');
    } catch (error: any) {
      console.error('Logout controller error:', error);
      this.sendInternalError(res, 'Logout failed');
    }
  };

  getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = this.getUserFromRequest(req);
      this.sendSuccess(res, req.user, 'User retrieved successfully');
    } catch (error: any) {
      console.error('Get current user controller error:', error);
      this.sendInternalError(res, 'Failed to get user information');
    }
  };

  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name, role } = req.body;
      const currentUser = this.getUserFromRequest(req);

      const missingFields = this.validateRequired({ email, password, name, role });
      if (missingFields.length > 0) {
        this.sendError(res, `Missing required fields: ${missingFields.join(', ')}`);
        return;
      }

      if (!['admin', 'agent', 'viewer'].includes(role)) {
        this.sendError(res, 'Invalid role. Must be: admin, agent, or viewer');
        return;
      }

      const userData = {
        email,
        password,
        name,
        role,
        tenantId: currentUser.tenant_id
      };

      const user = await this.authService.createUser(userData);
      this.sendCreated(res, user, 'User created successfully');

    } catch (error: any) {
      console.error('Create user controller error:', error);
      
      if (error.message.includes('duplicate key value') || error.message.includes('Email already exists')) {
        this.sendError(res, 'Email already exists');
      } else {
        this.sendInternalError(res, 'Failed to create user');
      }
    }
  };

  validateToken = async (req: Request, res: Response): Promise<void> => {
    try {
      this.sendSuccess(res, undefined, 'Token is valid');
    } catch (error: any) {
      console.error('Validate token controller error:', error);
      this.sendUnauthorized(res, 'Invalid token');
    }
  };

  getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUser = this.getUserFromRequest(req);
      const { limit, offset } = this.getPagination(req);

      const users = await this.userRepository.findByTenantId(currentUser.tenant_id, limit, offset);
      const total = await this.userRepository.countByTenantId(currentUser.tenant_id);

      const usersWithoutPassword = users.map(user => {
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      this.sendSuccess(res, {
        users: usersWithoutPassword,
        total,
        page: Math.floor((offset || 0) / (limit || 20)) + 1,
        limit
      }, 'Users retrieved successfully');

    } catch (error: any) {
      console.error('Get users controller error:', error);
      this.sendInternalError(res, 'Failed to retrieve users');
    }
  };

  getUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const currentUser = this.getUserFromRequest(req);

      const user = await this.userRepository.findById(id);
      if (!user) {
        this.sendNotFound(res, 'User not found');
        return;
      }

      if (user.tenant_id !== currentUser.tenant_id) {
        this.sendForbidden(res, 'Access denied');
        return;
      }

      const { password_hash, ...userWithoutPassword } = user;
      this.sendSuccess(res, userWithoutPassword, 'User retrieved successfully');

    } catch (error: any) {
      console.error('Get user controller error:', error);
      this.sendInternalError(res, 'Failed to retrieve user');
    }
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { email, name, role } = req.body;
      const currentUser = this.getUserFromRequest(req);

      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        this.sendNotFound(res, 'User not found');
        return;
      }

      if (existingUser.tenant_id !== currentUser.tenant_id) {
        this.sendForbidden(res, 'Access denied');
        return;
      }

      const updateData: any = {};
      if (email !== undefined) updateData.email = email;
      if (name !== undefined) updateData.name = name;
      if (role !== undefined) {
        if (!['admin', 'agent', 'viewer'].includes(role)) {
          this.sendError(res, 'Invalid role. Must be: admin, agent, or viewer');
          return;
        }
        updateData.role = role;
      }

      if (Object.keys(updateData).length === 0) {
        this.sendError(res, 'No fields to update');
        return;
      }

      const updatedUser = await this.userRepository.update(id, updateData);
      if (!updatedUser) {
        this.sendNotFound(res, 'User not found');
        return;
      }

      const { password_hash, ...userWithoutPassword } = updatedUser;
      this.sendSuccess(res, userWithoutPassword, 'User updated successfully');

    } catch (error: any) {
      console.error('Update user controller error:', error);
      
      if (error.message.includes('duplicate key value')) {
        this.sendError(res, 'Email already exists');
      } else {
        this.sendInternalError(res, 'Failed to update user');
      }
    }
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const currentUser = this.getUserFromRequest(req);

      if (id === currentUser.id) {
        this.sendError(res, 'Cannot delete your own account');
        return;
      }

      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        this.sendNotFound(res, 'User not found');
        return;
      }

      if (existingUser.tenant_id !== currentUser.tenant_id) {
        this.sendForbidden(res, 'Access denied');
        return;
      }

      const deleted = await this.userRepository.delete(id);
      if (!deleted) {
        this.sendNotFound(res, 'User not found');
        return;
      }

      this.sendSuccess(res, undefined, 'User deleted successfully');

    } catch (error: any) {
      console.error('Delete user controller error:', error);
      this.sendInternalError(res, 'Failed to delete user');
    }
  };
}