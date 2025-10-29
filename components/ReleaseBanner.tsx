import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface ReleaseBannerProps {
  currentVersion: string
  userLastSeenVersion?: string | null
}

export default function ReleaseBanner({ currentVersion, userLastSeenVersion }: ReleaseBannerProps) {
  const { data: session } = useSession()
  const [dismissed, setDismissed] = useState(false)

  // Don't show if user has seen this version or banner is dismissed
  const shouldShow = session && !dismissed && userLastSeenVersion !== currentVersion

  const handleDismiss = async () => {
    try {
      const response = await fetch('/api/user/dismiss-release-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: currentVersion })
      })

      if (response.ok) {
        setDismissed(true)
      }
    } catch (error) {
      console.error('Failed to dismiss banner:', error)
    }
  }

  if (!shouldShow) return null

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between flex-wrap">
          <div className="flex items-center flex-1">
            <span className="flex p-2 rounded-lg bg-white bg-opacity-20">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            <p className="ml-3 font-medium">
              <span className="md:hidden">New in v{currentVersion}!</span>
              <span className="hidden md:inline">
                🎉 New in v{currentVersion}: Enhanced filtering, colored badges, ADMIN access, and more!
              </span>
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-2 sm:mt-0">
            <Link
              href="/release-notes"
              className="text-sm font-medium hover:text-blue-100 underline"
            >
              View Release Notes →
            </Link>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 rounded-md hover:bg-white hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Dismiss"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
