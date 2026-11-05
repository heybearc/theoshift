import { ReactNode, useState } from 'react'
import packageJson from "../package.json"
import { useRouter } from 'next/router'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import ReleaseBanner from './ReleaseBanner'
import GlobalAnnouncementBanner from './GlobalAnnouncementBanner'
import ServerIndicator from './ServerIndicator'
import BottomNav from './BottomNav'

interface AdminLayoutProps {
  children: ReactNode
  title?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  userLastSeenVersion?: string | null
  releaseSummary?: string
}

type TopLevelSection = 'admin' | 'events' | 'help'

export default function AdminLayout({ children, title, breadcrumbs = [], userLastSeenVersion, releaseSummary }: AdminLayoutProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut({ redirect: true })
    window.location.href = '/auth/signin'
  }

  // Determine which top-level section we're in
  const getCurrentSection = (): TopLevelSection => {
    if (router.pathname.startsWith('/events')) return 'events'
    if (router.pathname.startsWith('/help') || router.pathname === '/release-notes') return 'help'
    return 'admin'
  }

  const currentSection = getCurrentSection()

  const adminTabs = [
    { label: 'Dashboard', href: '/admin', icon: '🏠' },
    { label: 'Users', href: '/admin/users', icon: '👥' },
    { label: 'Locations', href: '/admin/locations', icon: '📍' },
    { label: 'Announcements', href: '/admin/global-announcements', icon: '📢' },
    { label: 'Feedback', href: '/admin/feedback', icon: '💬' },
    { label: 'Health', href: '/admin/health', icon: '💚' },
    { label: 'API Status', href: '/admin/api-status', icon: '📊' },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: '📝' },
    { label: 'System Ops', href: '/admin/system-ops', icon: '⚡' },
    { label: 'Email Config', href: '/admin/email-config', icon: '📧' },
    { label: 'Review sign-in', href: '/admin/review-signin', icon: '⭐' },
  ]

  const eventTabs = [
    { label: 'Event Selection', href: '/events/select', icon: '🎯' },
    { label: 'Create Event', href: '/events/create', icon: '➕' },
  ]

  const helpTabs = [
    { label: 'Help Center', href: '/help', icon: '❓' },
    { label: 'Release Notes', href: '/release-notes', icon: '📋' },
    { label: 'Send Feedback', href: '/help/feedback', icon: '💡' },
  ]

  const getSecondLevelTabs = () => {
    switch (currentSection) {
      case 'admin': return adminTabs
      case 'events': return eventTabs
      case 'help': return helpTabs
    }
  }

  const secondLevelTabs = getSecondLevelTabs()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Release Banner */}
      <ReleaseBanner 
        currentVersion={packageJson.version}
        userLastSeenVersion={userLastSeenVersion}
        releaseSummary={releaseSummary}
      />

      {/* Global Announcement Banner */}
      <GlobalAnnouncementBanner />
      
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin" className="flex items-center">
                <div className="flex-shrink-0">
                  <img src="/logo.svg" alt="TheoShift Logo" className="h-10 w-10" />
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-semibold text-gray-900">TheoShift</h1>
                  <p className="text-xs text-gray-500">Admin Portal</p>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/profile"
                className="text-sm text-gray-700 hidden sm:inline hover:text-blue-700 underline-offset-2 hover:underline"
              >
                Welcome, {session?.user?.name}
              </Link>
              <Link
                href="/profile"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop: Two-Level Tab Navigation */}
      <div className="hidden md:block bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Level Tabs */}
          <div className="flex gap-8 border-b border-gray-200">
            <Link
              href="/admin"
              className={`px-1 py-4 text-sm font-semibold border-b-2 transition-colors ${
                currentSection === 'admin'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Admin
            </Link>
            <Link
              href="/events/select"
              className={`px-1 py-4 text-sm font-semibold border-b-2 transition-colors ${
                currentSection === 'events'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Events
            </Link>
            <Link
              href="/help"
              className={`px-1 py-4 text-sm font-semibold border-b-2 transition-colors ${
                currentSection === 'help'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Help
            </Link>
          </div>

          {/* Second Level Tabs */}
          <div className="overflow-x-auto -mb-px">
            <nav className="flex gap-1 min-w-max py-2">
              {secondLevelTabs.map((tab) => {
                const isActive = router.pathname === tab.href || 
                  (tab.href !== '/admin' && tab.href !== '/help' && router.pathname.startsWith(tab.href))
                
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors ${
                      isActive
                        ? 'bg-gray-50 text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile: Hamburger Menu Button */}
      <div className="md:hidden bg-white border-b border-gray-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {currentSection === 'admin' && 'Admin'}
            {currentSection === 'events' && 'Events'}
            {currentSection === 'help' && 'Help'}
          </h2>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile: Slide-out Menu (PWA-friendly) */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="md:hidden fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white shadow-xl z-50 overflow-y-auto">
            <div className="p-4">
              {/* Close Button */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Navigation</h3>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Admin Functions */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                  Admin Functions
                </h4>
                <nav className="space-y-1">
                  {adminTabs.map((tab) => {
                    const isActive = router.pathname === tab.href || 
                      (tab.href !== '/admin' && router.pathname.startsWith(tab.href))
                    
                    return (
                      <Link
                        key={tab.href}
                        href={tab.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors touch-manipulation ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        }`}
                      >
                        <span className="text-xl">{tab.icon}</span>
                        <span>{tab.label}</span>
                      </Link>
                    )
                  })}
                </nav>
              </div>

              {/* Event Management */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                  Event Management
                </h4>
                <nav className="space-y-1">
                  {eventTabs.map((tab) => {
                    const isActive = router.pathname === tab.href || 
                      (tab.href !== '/events/select' && router.pathname.startsWith(tab.href))
                    
                    return (
                      <Link
                        key={tab.href}
                        href={tab.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors touch-manipulation ${
                          isActive
                            ? 'bg-green-50 text-green-700'
                            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        }`}
                      >
                        <span className="text-xl">{tab.icon}</span>
                        <span>{tab.label}</span>
                      </Link>
                    )
                  })}
                </nav>
              </div>

              {/* Help & Support */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                  Help & Support
                </h4>
                <nav className="space-y-1">
                  {helpTabs.map((tab) => {
                    const isActive = router.pathname === tab.href || 
                      (tab.href !== '/help' && router.pathname.startsWith(tab.href))
                    
                    return (
                      <Link
                        key={tab.href}
                        href={tab.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors touch-manipulation ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        }`}
                      >
                        <span className="text-xl">{tab.icon}</span>
                        <span>{tab.label}</span>
                      </Link>
                    )
                  })}
                </nav>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <div className="mb-6">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm">
                <li>
                  <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                    Dashboard
                  </Link>
                </li>
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className="flex items-center">
                    <svg className="flex-shrink-0 h-4 w-4 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    {crumb.href ? (
                      <Link href={crumb.href} className="text-gray-500 hover:text-gray-700">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-gray-900 font-medium">{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        )}

        {/* Page Title */}
        {title && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          </div>
        )}

        {/* Page Content */}
        {children}

        {/* Footer with Version */}
        <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span>TheoShift v{packageJson.version}</span>
            <span>•</span>
            <span>© 2026</span>
            <span>•</span>
            <Link href="/release-notes" className="text-blue-600 hover:text-blue-800">
              Release Notes
            </Link>
            <span>•</span>
            <ServerIndicator />
          </div>
        </footer>
      </main>
      
      {/* Bottom Navigation (Mobile Only) */}
      <BottomNav />
    </div>
  )
}
