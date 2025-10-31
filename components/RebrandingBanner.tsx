import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function RebrandingBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if user has dismissed the banner
    const dismissed = localStorage.getItem('rebrandingBannerDismissed')
    const dismissedDate = dismissed ? new Date(dismissed) : null
    
    // Show banner if not dismissed or if dismissed more than 30 days ago
    if (!dismissedDate || (Date.now() - dismissedDate.getTime()) > 30 * 24 * 60 * 60 * 1000) {
      setIsVisible(true)
      setIsDismissed(false)
    } else {
      setIsDismissed(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('rebrandingBannerDismissed', new Date().toISOString())
    setIsVisible(false)
    setIsDismissed(true)
  }

  if (!isVisible || isDismissed) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto py-3 px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="w-0 flex-1 flex items-center">
            <span className="flex p-2 rounded-lg bg-blue-800">
              <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <p className="ml-3 font-medium text-white truncate">
              <span className="md:hidden">
                We're rebranding! New name: Theocratic Shift Scheduler
              </span>
              <span className="hidden md:inline">
                🎉 <strong>We're rebranding!</strong> Same great app, new name: <strong>Theocratic Shift Scheduler</strong>
              </span>
            </p>
          </div>
          <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
            <Link
              href="/announcement/rebranding"
              className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 transition-colors"
            >
              Learn more
            </Link>
          </div>
          <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-3">
            <button
              type="button"
              onClick={handleDismiss}
              className="-mr-1 flex p-2 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-white sm:-mr-2 transition-colors"
              aria-label="Dismiss banner"
            >
              <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
