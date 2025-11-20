import express from 'express';
import { Pool } from 'pg';
import { Config } from '../config';
import { AuthService } from '../services/authService';
import { AuthController } from '../controllers/AuthController';
import { UserRepository } from '../repositories/UserRepository';
import { createAuthMiddleware, requireRole } from '../middleware/auth';

export const createAuthRoutes = (pool: Pool, config: Config) => {
  const router = express.Router();
  
  // Create dependencies
  const userRepository = new UserRepository({ pool });
  const authService = new AuthService(config, userRepository);
  const authController = new AuthController(authService, userRepository);
  const authenticateToken = createAuthMiddleware(pool, config);

  // Routes
  router.post('/login', authController.login);
  router.post('/logout', authenticateToken, authController.logout);
  router.get('/me', authenticateToken, authController.getCurrentUser);
  router.post('/users', authenticateToken, requireRole(['admin']), authController.createUser);
  router.get('/users', authenticateToken, requireRole(['admin']), authController.getUsers);
  router.get('/users/:id', authenticateToken, requireRole(['admin']), authController.getUser);
  router.put('/users/:id', authenticateToken, requireRole(['admin']), authController.updateUser);
  router.delete('/users/:id', authenticateToken, requireRole(['admin']), authController.deleteUser);
  router.get('/validate-token', authenticateToken, authController.validateToken);

  return router;
};