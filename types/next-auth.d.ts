import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
    }
    sid?: string
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string
    role: string
    sid?: string
    signinRevoked?: boolean
  }
}
