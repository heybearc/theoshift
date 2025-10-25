import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '../../../src/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  trustHost: true,
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
        try {
          console.log('🔐 LOGIN ATTEMPT:', credentials?.email)
          
          if (!credentials?.email || !credentials?.password) {
            console.log('❌ Missing credentials')
            return null
          }

          console.log('🔍 Looking up user in database...')
          const user = await prisma.users.findUnique({
            where: { email: credentials.email }
          })

          if (!user || !user.passwordHash) {
            console.log('❌ User not found or no password hash')
            return null
          }

          console.log('✅ User found:', user.email, 'Role:', user.role)
          const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash)
          console.log('🔑 Password valid:', isValidPassword)

          if (!isValidPassword) {
            console.log('❌ Invalid password')
            return null
          }

          console.log('✅ Login successful for:', user.email)
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
          }
        } catch (error) {
          console.error('💥 AUTHORIZE ERROR:', error)
          return null
        }
      }
    }),
    // Attendant login with PIN
    CredentialsProvider({
      id: 'attendant-pin',
      name: 'Attendant Login',
      credentials: {
        firstName: { label: 'First Name', type: 'text' },
        lastName: { label: 'Last Name', type: 'text' },
        congregation: { label: 'Congregation', type: 'text' },
        pin: { label: 'PIN', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.firstName || !credentials?.lastName || !credentials?.congregation || !credentials?.pin) {
          return null
        }

        // Find attendant by name and congregation
        const attendant = await prisma.attendants.findFirst({
          where: {
            firstName: { equals: credentials.firstName.trim(), mode: 'insensitive' },
            lastName: { equals: credentials.lastName.trim(), mode: 'insensitive' },
            congregation: { equals: credentials.congregation.trim(), mode: 'insensitive' }
          }
        })

        if (!attendant) {
          return null
        }

        // Verify PIN using raw query
        const pinResult = await prisma.$queryRaw<Array<{ pinHash: string | null }>>`
          SELECT "pinHash" FROM attendants WHERE id = ${attendant.id}
        `
        
        const pinHash = pinResult[0]?.pinHash
        if (!pinHash) {
          return null
        }
        
        const pinValid = await bcrypt.compare(credentials.pin, pinHash)
        if (!pinValid) {
          return null
        }

        // Return attendant as user
        return {
          id: attendant.id,
          email: attendant.email || `${attendant.id}@attendant.local`,
          name: `${attendant.firstName} ${attendant.lastName}`,
          role: 'ATTENDANT',
          congregation: attendant.congregation
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.congregation = (user as any).congregation
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.congregation = token.congregation as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // After login, redirect to event selection page
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/events/select`
      }
      // Allow callback URLs on the same origin
      if (url.startsWith(baseUrl)) {
        return url
      }
      return baseUrl
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
