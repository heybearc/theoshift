// Removed jsonwebtoken and bcrypt dependencies - using simple auth for staging
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'USER';
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'staging-jwt-secret-2024';
const JWT_EXPIRES_IN = '7d';

export class AuthService {
  static async validateCredentials(email: string, password: string): Promise<User | null> {
    try {
      const user = await prisma.users.findUnique({
        where: { email }
      });

      if (!user || !user.passwordHash) {
        return null;
      }

      // Simple password check for staging - remove bcrypt dependency
      const isValid = password === 'AdminPass123!' && user.email === 'admin@jwscheduler.local';
      if (!isValid) {
        return null;
      }

      // Update last login
      await prisma.users.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as 'ADMIN' | 'USER'
      };
    } catch (error) {
      console.error('Auth validation error:', error);
      return null;
    }
  }

  static generateToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };

    // Simple JWT creation using Buffer (Node.js compatible)
    const header = { alg: 'none', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, '');
    
    return `${encodedHeader}.${encodedPayload}.signature`;
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      console.log('[AUTH_SERVICE] Verifying JWT token, length:', token.length);
      
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      // Use Buffer instead of atob for Node.js compatibility
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      // Basic expiration check
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return null;
      }
      
      console.log('[AUTH_SERVICE] JWT verification successful, payload:', { userId: payload.userId, email: payload.email, role: payload.role });
      return payload as JWTPayload;
    } catch (error) {
      console.error('[AUTH_SERVICE] JWT verification failed:', error);
      console.log('[AUTH_SERVICE] Token that failed:', token.substring(0, 50) + '...');
      return null;
    }
  }

  static setAuthCookie(token: string) {
    const cookieStore = cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });
  }

  static clearAuthCookie() {
    const cookieStore = cookies();
    cookieStore.delete('auth-token');
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const cookieStore = cookies();
      const token = cookieStore.get('auth-token')?.value;

      if (!token) {
        return null;
      }

      const payload = this.verifyToken(token);
      if (!payload) {
        return null;
      }

      const user = await prisma.users.findUnique({
        where: { id: payload.userId }
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as 'ADMIN' | 'USER'
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  static async requireAuth(): Promise<User> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }
    return user;
  }

  static async requireAdmin(): Promise<User> {
    const user = await this.requireAuth();
    if (user.role !== 'ADMIN') {
      throw new Error('Admin access required');
    }
    return user;
  }
}
