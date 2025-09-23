<<<<<<< HEAD
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (session && session.user) {
      // User is authenticated with valid session, redirect to dashboard
      router.push('/dashboard')
    } else {
      // User is not authenticated, redirect to signin
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Show loading while determining authentication status
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <h1 className="text-4xl font-bold text-gray-900 mt-6 mb-4">
          JW Attendant Scheduler
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Clean Next.js 15 Implementation
        </p>
        <div className="text-lg text-gray-500">
          {status === 'loading' ? 'Loading...' : 'Redirecting...'}
        </div>
      </div>
    </div>
  )
}
=======
import { redirect } from 'next/navigation'
import { getSession } from '@/auth'

export default async function HomePage() {
  const session = await getSession()
  
  if (session) {
    redirect('/dashboard')
  } else {
    redirect('/api/auth/signin')
  }
}
>>>>>>> feature/api-foundation
