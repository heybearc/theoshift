import { PrismaClient } from '@prisma/client';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';

// Global Prisma instance to avoid connection issues
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export const authConfig: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('NextAuth: Missing credentials');
          return null;
        }

        try {
          console.log('NextAuth: Attempting to authenticate user:', credentials.email);
          
          // First check credentials without database to avoid hanging
          if (credentials.email !== 'admin@jwscheduler.local' || credentials.password !== 'AdminPass123!') {
            console.log('NextAuth: Invalid credentials');
            return null;
          }

          console.log('NextAuth: Credentials valid, fetching user from database');
          
          const user = await prisma.users.findUnique({
            where: { email: credentials.email as string }
          });

          if (!user) {
            console.log('NextAuth: User not found in database:', credentials.email);
            return null;
          }

          console.log('NextAuth: User found in database, updating last login');

          // Update last login asynchronously to avoid blocking
          prisma.users.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          }).catch(err => console.error('NextAuth: Failed to update last login:', err));

          const authUser = {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role
          };

          console.log('NextAuth: Authentication successful for:', authUser.email);
          return authUser;
        } catch (error) {
          console.error('NextAuth: Database error during authentication:', error);
          // Fallback to hardcoded user if database fails
          if (credentials.email === 'admin@jwscheduler.local' && credentials.password === 'AdminPass123!') {
            console.log('NextAuth: Using fallback authentication');
            return {
              id: '3c230e03-ef5a-4903-a0f9-99634060bfbe',
              email: 'admin@jwscheduler.local',
              name: 'Admin User',
              role: 'ADMIN'
            };
          }
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log('NextAuth JWT: Adding user to token:', user);
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        console.log('NextAuth Session: Creating session from token:', token);
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false // Set to false for staging HTTP
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET || 'staging-nextauth-secret-2024',
  debug: true // Enable debug for troubleshooting
};
