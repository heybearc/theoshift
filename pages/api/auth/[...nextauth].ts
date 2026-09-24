import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '../../../src/lib/prisma'
import { findUserByEmailCaseInsensitive } from '@/lib/userEmailLookup'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  // Cannot use adapter with CredentialsProvider - handle everything in callbacks
  providers: [
    // Admin/Overseer login with email/password
    CredentialsProvider({
      id: 'credentials',
      name: 'Admin Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await findUserByEmailCaseInsensitive(credentials.email)

        if (!user || !user.passwordHash) {
          return null
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash)

        if (!isValidPassword) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.role = user.role
        token.congregation = (user as any).congregation
        // Required for API routes that resolve the actor by email (chat push, etc.).
        token.email = user.email ?? (token.email as string | undefined)
        token.name = user.name ?? (token.name as string | undefined)
      }

      // Older JWTs never stored email — resolve from DB so chat/push APIs keep working without forcing logout.
      if (!token.email && typeof token.sub === 'string') {
        try {
          if (token.role === 'VOLUNTEER') {
            const v = await prisma.volunteers.findUnique({
              where: { id: token.sub },
              select: { email: true, firstName: true, lastName: true },
            })
            if (v?.email) {
              token.email = v.email
              if (!token.name) token.name = `${v.firstName} ${v.lastName}`.trim()
            }
          } else {
            const u = await prisma.users.findUnique({
              where: { id: token.sub },
              select: { email: true, firstName: true, lastName: true },
            })
            if (u?.email) {
              token.email = u.email
              if (!token.name) token.name = `${u.firstName} ${u.lastName}`.trim()
            }
          }
        } catch {
          // ignore
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        ;(session.user as any).congregation = token.congregation as string
        if (token.email) session.user.email = token.email as string
        if (token.name) session.user.name = token.name as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // If callback URL is provided and valid, use it (e.g., /volunteer/select-event)
      if (url.startsWith(baseUrl)) {
        return url
      }
      
      // If it's a default redirect (no specific callback), route to admin event selection
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/events/select`
      }
      
      // Fallback to base URL
      return baseUrl
    },
    async signIn({ user, account }) {
      // For email provider, verify user is a volunteer and add role info
      if (account?.provider === 'email') {
        const volunteer = await prisma.volunteers.findUnique({
          where: { email: user.email! }
        })
        
        if (!volunteer) {
          console.log('❌ Email provider: volunteer not found for', user.email)
          return false // Reject sign-in
        }
        
        // Add role and volunteer info to user object for JWT callback
        user.id = volunteer.id
        user.role = 'VOLUNTEER'
        ;(user as any).congregation = volunteer.congregation
        
        console.log('✅ Email provider: volunteer authenticated', volunteer.firstName, volunteer.lastName)
        return true
      }
      
      // Allow all other sign-ins (credentials providers)
      return true
    },
  },
  pages: {
    signIn: '/auth/signin', // Use our custom unified login page
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
