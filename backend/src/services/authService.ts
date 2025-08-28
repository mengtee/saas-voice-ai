import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool, PoolClient } from 'pg';
import { BaseService } from './base';
import { Config } from '../config';

// User interface from database
interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'agent' | 'viewer';
  created_at: string;
  updated_at: string;
  last_login?: string;
}

// JWT Payload - what gets stored inside the token
interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  iat?: number; // issued at
  exp?: number; // expires at
}

export class AuthService extends BaseService {
  private config: Config;

  constructor({ pool, client, config }: { pool?: Pool; client?: PoolClient; config: Config }) {
    super({ pool, client });
    this.config = config;
  }

  /**
   * Login Process Explained:
   * 1. Find user by email in database
   * 2. Compare provided password with stored hash using bcrypt
   * 3. If valid, generate JWT token with user info
   * 4. Update last_login timestamp
   * 5. Return token + user data (without password)
   */
  async login(email: string, password: string): Promise<{ token: string; user: Omit<User, 'password_hash'> }> {
    try {
      // Step 1: Find user by email (across all tenants)
      // Note: Same email can exist in different tenants, we get the first match
      const result = await this.query<User>(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = result.rows[0];

      // Step 2: Verify password using bcrypt
      // bcrypt.compare() hashes the plain password and compares with stored hash
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) { 
        throw new Error('Invalid credentials');
      }

      // Step 3: Generate JWT Token
      // JWT Structure: Header.Payload.Signature
      const tokenPayload: JWTPayload = {
        userId: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        name: user.name,
        role: user.role,
      };

      // jwt.sign() creates: Header + Payload + Signature (using secret)
      const token = (jwt as any).sign(
        tokenPayload,
        this.config.jwtSecret,
        { 
          expiresIn: this.config.jwtExpiresIn, // e.g., '7d' = 7 days
        }
      );

      // Step 4: Update last login timestamp
      await this.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );

      // Step 5: Return token and user data (exclude password)
      const { password_hash, ...userWithoutPassword } = user;
      
      return {
        token,
        user: userWithoutPassword
      };

    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Login failed');
    }
  }

  /**
   * JWT Token Verification:
   * 1. Extract token from Authorization header
   * 2. Verify signature using secret key
   * 3. If valid, decode payload to get user info
   * 4. Optionally refresh user data from database
   */
  async verifyToken(token: string): Promise<Omit<User, 'password_hash'>> {
    try {
      // jwt.verify() checks if token signature is valid using secret
      // If valid, returns decoded payload
      const decoded = (jwt as any).verify(token, this.config.jwtSecret) as JWTPayload;

      // Optional: Refresh user data from database (to get latest role changes)
      const result = await this.query<User>(
        'SELECT * FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];
      const { password_hash, ...userWithoutPassword } = user;

      return userWithoutPassword;

    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Get user by ID - for API endpoints that need current user
   */
  async getUserById(userId: string): Promise<Omit<User, 'password_hash'> | null> {
    try {
      const result = await this.query<User>(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      const { password_hash, ...userWithoutPassword } = user;
      
      return userWithoutPassword;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Create new user (for admin functionality)
   */
  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'agent' | 'viewer';
  }): Promise<Omit<User, 'password_hash'>> {
    try {
      // Hash password before storing
      const saltRounds = 12; // Higher = more secure but slower
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      const result = await this.query<User>(
        `INSERT INTO users (email, password_hash, name, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [userData.email, hashedPassword, userData.name, userData.role]
      );

      const user = result.rows[0];
      const { password_hash, ...userWithoutPassword } = user;
      
      return userWithoutPassword;
    } catch (error) {
      console.error('Create user error:', error);
      throw new Error('User creation failed');
    }
  }
}