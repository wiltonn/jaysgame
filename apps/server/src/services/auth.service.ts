import { PrismaClient } from '@prisma/client';
import type { ApiResponse } from '@jaysgame/shared';
import { hashPassword, comparePassword, signToken } from '../utils/auth';

const prisma = new PrismaClient();

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<ApiResponse<AuthResponse>> {
    try {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        return {
          success: false,
          error: 'User with this email already exists',
        };
      }

      // Hash password
      const passwordHash = await hashPassword(input.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          displayName: input.displayName,
          role: 'HOST', // Default role
        },
      });

      // Generate token
      const token = signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
          },
        },
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Failed to register user',
      };
    }
  }

  /**
   * Login an existing user
   */
  async login(input: LoginInput): Promise<ApiResponse<AuthResponse>> {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Verify password
      const isValid = await comparePassword(input.password, user.passwordHash);

      if (!isValid) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Generate token
      const token = signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
          },
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Failed to login',
      };
    }
  }

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId: string): Promise<ApiResponse<AuthResponse['user']>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
        },
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return {
        success: false,
        error: 'Failed to get user',
      };
    }
  }
}

export const authService = new AuthService();
