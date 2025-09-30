import { AuthOptions, getServerSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaClient } from '@prisma/client'

// WMACS Guardian: Proper Prisma singleton pattern
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export const authOptions: AuthOptions = {
  // Remove custom pages to use default NextAuth server-side pages
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      id: "credentials",
      credentials: {
        email: { 
          label: "Email", 
          type: "email", 
          placeholder: "admin@jwscheduler.local" 
        },
        password: { 
          label: "Password", 
          type: "password" 
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter an email and password")
        }

        try {
          // WMACS Guardian: Proper Prisma usage with error handling
          const user = await prisma.users.findUnique({
            where: {
              email: credentials.email
            }
          });

          if (!user) {
            throw new Error("No user found with this email")
          }

          if (!user.passwordHash) {
            throw new Error("User has no password set")
          }

          // WMACS Guardian Fix: Use proper bcrypt validation
          const bcrypt = require('bcryptjs');
          const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

          if (!isPasswordValid) {
            throw new Error("Invalid password")
          }

          // Update last login
          await prisma.users.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          });

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role
          }
        } catch (error) {
          console.error('Auth error:', error)
          throw new Error("Authentication failed")
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development'
}

/**
 * Helper function to get the session on the server without having to import the authOptions object every single time
 * @returns The session object or null
 */
export const getSession = () => getServerSession(authOptions)
