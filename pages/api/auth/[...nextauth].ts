import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '../../../src/lib/prisma'
import bcrypt from 'bcryptjs'
import fs from 'fs'

const logAuth = (message: string) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}\n`
  try {
    fs.appendFileSync('/tmp/nextauth-debug.log', logMessage)
  } catch (e) {
    // Ignore write errors
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          logAuth(`Starting authorization for: ${credentials?.email}`)
          
          if (!credentials?.email || !credentials?.password) {
            logAuth('Missing credentials')
            return null
          }

          logAuth('Looking up user in database...')
          const user = await prisma.users.findUnique({
            where: {
              email: credentials.email
            }
          })

          if (!user) {
            logAuth(`User not found: ${credentials.email}`)
            return null
          }

          if (!user.passwordHash) {
            logAuth('User has no password hash')
            return null
          }

          logAuth('Comparing password...')
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          )

          logAuth(`Password valid: ${isPasswordValid}`)

          if (!isPasswordValid) {
            logAuth(`Invalid password for: ${credentials.email}`)
            return null
          }

          logAuth(`Authentication successful for: ${user.email}`)
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            image: user.image || null,
            role: user.role,
          }
        } catch (error) {
          logAuth(`Error during authorization: ${error}`)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.image = user.image
      }
      return token
    },
    async session({ session, token }) {
      logAuth(`Session callback - token exists: ${!!token}`)
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        logAuth(`Session created for: ${session.user.email} (${session.user.role})`)
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signin',
  },
}

const handler = NextAuth(authOptions)

// Log all auth requests
export default async function auth(req: any, res: any) {
  logAuth(`Auth request: ${req.method} ${req.url}`)
  return await handler(req, res)
}
