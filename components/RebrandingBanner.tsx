import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function RebrandingBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if user has dismissed the banner
    const dismissed = localStorage.getItem('rebrandingBannerDismissed')
    const dismissedDate = dismissed ? new Date(dismissed) : null
    
    // Show banner if not dismissed or if dismissed more than 7 days ago (increased urgency)
    if (!dismissedDate || (Date.now() - dismissedDate.getTime()) > 7 * 24 * 60 * 60 * 1000) {
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
    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
      <div className="max-w-7xl mx-auto py-3 px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="w-0 flex-1 flex items-center">
            <span className="flex p-2 rounded-lg bg-yellow-700">
              <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <p className="ml-3 font-medium text-white truncate">
              <span className="md:hidden">
                ⚠️ Domain changing Feb 1, 2026!
              </span>
              <span className="hidden md:inline">
                <strong>⚠️ Important:</strong> We've moved to <strong>theoshift.com</strong>! 
                The old domain (attendant.cloudigan.net) will stop working on <strong>February 1, 2026</strong>. 
                Update your bookmarks now!
              </span>
            </p>
          </div>
          <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
            <Link
              href="/announcement/rebranding"
              className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-yellow-600 bg-white hover:bg-yellow-50 transition-colors"
            >
              Learn more
            </Link>
          </div>
          <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-3">
            <button
              type="button"
              onClick={handleDismiss}
              className="-mr-1 flex p-2 rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-white sm:-mr-2 transition-colors"
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
