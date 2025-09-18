'use client'

import { SessionProvider, useSession } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  )
}

// Legacy auth hook for backward compatibility
export function useAuth() {
  const { data: session, status } = useSession()
  
  return {
    user: session?.user ? {
      id: session.user.id || '',
      email: session.user.email || '',
      name: session.user.name || '',
      role: session.user.role || 'USER'
    } : null,
    loading: status === 'loading',
    login: async () => false, // Deprecated
    logout: async () => {} // Deprecated
  }
}
