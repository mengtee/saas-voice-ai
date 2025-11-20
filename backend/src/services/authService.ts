import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Config } from '../config';
import { UserRepository, User } from '../repositories/UserRepository';

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

export class AuthService {
  private config: Config;
  private userRepository: UserRepository;

  constructor(config: Config, userRepository: UserRepository) {
    this.config = config;
    this.userRepository = userRepository;
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
      const user = await this.userRepository.findByEmail(email);

      if (!user) {
        throw new Error('Invalid credentials');
      }

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
      await this.userRepository.updateLastLogin(user.id);

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
      // normal token: headerEncoded.payloadEncoded.signatureEncoded (seperated by .)
      const decoded = (jwt as any).verify(token, this.config.jwtSecret) as JWTPayload;

      // Optional: Refresh user data from database (to get latest role changes)
      const user = await this.userRepository.findById(decoded.userId);

      if (!user) {
        throw new Error('User not found');
      }

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
      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        return null;
      }

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
    tenantId: string;
  }): Promise<Omit<User, 'password_hash'>> {
    try {
      // Hash password before storing (matching seed.ts)
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Check if email already exists for this tenant
      const existingUser = await this.userRepository.findByTenantIdAndEmail(userData.tenantId, userData.email);
      if (existingUser) {
        throw new Error('Email already exists');
      }

      const createData = {
        tenant_id: userData.tenantId,
        email: userData.email,
        password_hash: hashedPassword,
        name: userData.name,
        role: userData.role
      };

      const user = await this.userRepository.create(createData);
      const { password_hash, ...userWithoutPassword } = user;
      
      return userWithoutPassword;
    } catch (error) {
      console.error('Create user error:', error);
      if (error instanceof Error && error.message === 'Email already exists') {
        throw error;
      }
      throw new Error('User creation failed');
    }
  }
}