import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';

export const authConfig: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('NextAuth Test: Checking credentials for:', credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('NextAuth Test: Missing credentials');
          return null;
        }

        // Simple hardcoded check without database - for testing
        if (credentials.email === 'admin@jwscheduler.local' && credentials.password === 'AdminPass123!') {
          console.log('NextAuth Test: Authentication successful');
          return {
            id: '3c230e03-ef5a-4903-a0f9-99634060bfbe',
            email: 'admin@jwscheduler.local',
            name: 'Admin User',
            role: 'ADMIN'
          };
        }

        console.log('NextAuth Test: Invalid credentials');
        return null;
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
        console.log('NextAuth Test JWT: Adding user to token:', user.email);
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        console.log('NextAuth Test Session: Creating session for:', token.email);
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
  secret: process.env.NEXTAUTH_SECRET || 'staging-nextauth-secret-2024',
  debug: true
};
