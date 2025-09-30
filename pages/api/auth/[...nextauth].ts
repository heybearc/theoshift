import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '../../../src/lib/prisma'
import bcrypt from 'bcryptjs'

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
          console.log('[AUTH] Starting authorization for:', credentials?.email)
          
          if (!credentials?.email || !credentials?.password) {
            console.log('[AUTH] Missing credentials')
            return null
          }

          console.log('[AUTH] Looking up user in database...')
          const user = await prisma.users.findUnique({
            where: {
              email: credentials.email
            }
          })

          if (!user) {
            console.log('[AUTH] User not found:', credentials.email)
            return null
          }

          if (!user.passwordHash) {
            console.log('[AUTH] User has no password hash')
            return null
          }

          console.log('[AUTH] Comparing password...')
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          )

          console.log('[AUTH] Password valid:', isPasswordValid)

          if (!isPasswordValid) {
            console.log('[AUTH] Invalid password for:', credentials.email)
            return null
          }

          console.log('[AUTH] Authentication successful for:', user.email)
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            image: user.image || null,
            role: user.role,
          }
        } catch (error) {
          console.error('[AUTH] Error during authorization:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
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
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}

export default NextAuth(authOptions)
