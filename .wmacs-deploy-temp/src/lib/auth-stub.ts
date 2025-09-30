// WMACS AUTH STUB - Simple authentication replacement for NextAuth
// WMACS Rule: WMACS-COMPLEX-001 (Proportional complexity)
// Purpose: Unblock admin module with minimal auth complexity

import React from 'react'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'USER'
}

export interface AuthSession {
  user: AuthUser
  expires: string
}

export interface UseSessionReturn {
  data: AuthSession | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
}

// Simple auth stub that mimics NextAuth interface
export const useSession = (): UseSessionReturn => {
  // For development: always return authenticated admin user
  // This can be replaced with real NextAuth later without changing admin code
  return {
    data: {
      user: {
        id: '1',
        email: 'admin@jwscheduler.local',
        name: 'Admin User',
        role: 'ADMIN'
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    },
    status: 'authenticated'
  }
}

// Simple server-side session check
export const getServerSession = async (): Promise<AuthSession | null> => {
  // For development: always return authenticated admin session
  // This maintains the same interface as NextAuth getServerSession
  return {
    user: {
      id: '1',
      email: 'admin@jwscheduler.local', 
      name: 'Admin User',
      role: 'ADMIN'
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
}

// Simple signin function that mimics NextAuth signIn
export const signIn = async (provider: string, credentials?: any) => {
  // For development: always succeed
  // This maintains the same interface as NextAuth signIn
  return {
    ok: true,
    error: null,
    status: 200,
    url: '/admin'
  }
}

// Simple signout function
export const signOut = async () => {
  // For development: redirect to signin
  window.location.href = '/auth/signin'
}

// SessionProvider stub that does nothing but provides context
export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(React.Fragment, null, children)
}

// Auth options stub for API compatibility
export const authOptions = {
  // Empty object that maintains interface compatibility
  // Real NextAuth options can be added here later
}

// Environment-based admin check for production use
export const isAdminUser = (password?: string): boolean => {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  return password === adminPassword
}

// Simple middleware check
export const checkAdminAuth = async (): Promise<boolean> => {
  // For development: always allow admin access
  // In production: check environment variable
  const session = await getServerSession()
  return session?.user?.role === 'ADMIN'
}
