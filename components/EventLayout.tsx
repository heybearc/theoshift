import { ReactNode, useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import packageJson from '../package.json'
import MobileNav from './MobileNav'
import BottomNav from './BottomNav'
import dynamic from 'next/dynamic'
import FloatingActionButton from './FloatingActionButton'
import QuickVolunteerLookup from './QuickVolunteerLookup'
import QuickAssignmentForm from './QuickAssignmentForm'
import { getViewAsVolunteerId } from '@/lib/viewAsClient'
import { eventPositionsHref } from '../lib/eventPositionsHref'

// Lazy load QR scanner (only loaded when needed)
const QRScanner = dynamic(() => import('./QRScanner'), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>,
  ssr: false
})

interface EventLayoutProps {
  children: ReactNode
  title?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  selectedEvent?: {
    id: string
    name: string
    status?: string
  }
  hideSidebar?: boolean
  hideTitle?: boolean
}

export default function EventLayout({ 
  children, 
  title = 'Theocratic Shift Scheduler',
  breadcrumbs = [],
  selectedEvent,
  hideSidebar = false,
  hideTitle = false
}: EventLayoutProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [showVolunteerLookup, setShowVolunteerLookup] = useState(false)
  const [showAssignmentForm, setShowAssignmentForm] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [viewAsVolunteerActive, setViewAsVolunteerActive] = useState(false)

  useEffect(() => {
    const sync = () => setViewAsVolunteerActive(!!getViewAsVolunteerId())
    sync()
    window.addEventListener('theoshift-view-as-volunteer-changed', sync)
    return () => window.removeEventListener('theoshift-view-as-volunteer-changed', sync)
  }, [router.asPath])

  const hideStaffQuickFab =
    typeof router.query.viewAsVolunteerId === 'string' || viewAsVolunteerActive

  const handleSignOut = () => {
    // Don't specify callbackUrl - let next-auth use the current origin
    signOut({ redirect: true }).then(() => {
      window.location.href = '/auth/signin'
    })
  }

  const navigationItems = [
    {
      label: 'Event Selection',
      href: '/events/select',
      icon: '🎯',
      roles: ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'VOLUNTEER', 'ATTENDANT']
    },
    {
      label: 'My Profile',
      href: '/profile',
      icon: '👤',
      roles: ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'VOLUNTEER', 'ATTENDANT']
    }
  ]


  // Add admin navigation for admin users
  if (session?.user?.role === 'ADMIN' || session?.user?.role === 'admin') {
    navigationItems.push({
      label: 'Admin Portal',
      href: '/admin',
      icon: '🛡️',
      roles: ['ADMIN', 'admin']
    })
  }

  const filteredNavigation = navigationItems.filter(item => 
    item.roles.includes(session?.user?.role || '')
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0">
          <div className="flex justify-between items-center gap-2 min-h-16 min-w-0 py-2 md:py-0 md:h-16">
            {/* Left side - Logo and Navigation */}
            <div className="flex items-center min-w-0 flex-1">
              <Link href="/events/select" className="flex items-center min-w-0">
                <img
                  src="/logo.svg"
                  alt="TheoShift Logo"
                  className="h-10 w-10 sm:h-12 sm:w-12 shrink-0"
                />
                <span className="ml-2 sm:ml-3 text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  TheoShift
                </span>
              </Link>

              {/* Navigation Items */}
              <div className="hidden md:ml-8 md:flex md:space-x-4 shrink-0">
                {filteredNavigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      router.pathname.startsWith(item.href)
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right side - Mobile Menu and User Menu */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
              {/* Mobile Navigation Button */}
              <MobileNav selectedEvent={selectedEvent} />
              {/* Selected Event Indicator */}
              {selectedEvent && (
                <div className="hidden md:flex items-center bg-blue-50 px-3 py-1 rounded-lg max-w-[14rem] lg:max-w-md min-w-0">
                  <span className="text-sm text-blue-600 font-medium truncate">
                    📅 {selectedEvent.name}
                  </span>
                  {selectedEvent.status && (
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                      selectedEvent.status === 'current' 
                        ? 'bg-green-100 text-green-800'
                        : selectedEvent.status === 'upcoming'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedEvent.status}
                    </span>
                  )}
                </div>
              )}

              {/* User Menu */}
              {session?.user && (
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Link
                    href="/profile"
                    className="hidden sm:inline text-sm text-gray-700 hover:text-blue-700 truncate max-w-[8rem] md:max-w-[14rem] underline-offset-2 hover:underline"
                    title="My Profile"
                  >
                    {session.user.name}
                  </Link>
                  <span
                    className={`hidden sm:inline-flex px-2 py-1 text-xs rounded-full shrink-0 ${
                      session.user.role === 'ADMIN'
                        ? 'bg-red-100 text-red-800'
                        : session.user.role === 'OVERSEER'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {session.user.role}
                  </span>
                  <Link
                    href="/profile"
                    className="sm:hidden text-xs text-blue-600 hover:text-blue-800 px-1 py-2 min-h-[44px] inline-flex items-center touch-manipulation"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap px-1 py-2 min-h-[44px] sm:min-h-0 touch-manipulation"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 min-w-0">
            <nav className="flex overflow-x-auto theoshift-x-scroll pb-1" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 flex-nowrap min-w-0">
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className="flex items-center">
                    {index > 0 && (
                      <svg className="w-4 h-4 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {crumb.href ? (
                      <Link href={crumb.href} className="text-sm text-blue-600 hover:text-blue-800">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-500">{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8 min-w-0 w-full">
        {title && !hideTitle && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          </div>
        )}
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600">
            <p>© 2026 TheoShift. All rights reserved.</p>
            <p className="mt-2 sm:mt-0">Version {packageJson.version}</p>
          </div>
        </div>
      </footer>

      {/* Bottom Navigation for Mobile */}
      <BottomNav selectedEventId={selectedEvent?.id} />

      {/* Floating Action Button with Quick Actions */}
      {selectedEvent && !hideStaffQuickFab && (
        <>
          <FloatingActionButton
            primaryAction={{
              id: 'main',
              label: 'Quick Actions',
              icon: '+',
              onClick: () => {}
            }}
            actions={[
              {
                id: 'scan-qr',
                label: 'Scan QR Code',
                icon: '📱',
                onClick: () => setShowQRScanner(true),
                color: 'bg-indigo-600 hover:bg-indigo-700'
              },
              {
                id: 'find-volunteer',
                label: 'Find Volunteer',
                icon: '🔍',
                onClick: () => setShowVolunteerLookup(true),
                color: 'bg-purple-600 hover:bg-purple-700'
              },
              {
                id: 'create-assignment',
                label: 'Create Assignment',
                icon: '➕',
                onClick: () => setShowAssignmentForm(true),
                color: 'bg-green-600 hover:bg-green-700'
              },
              {
                id: 'view-positions',
                label: 'View Positions',
                icon: '📋',
                onClick: () => router.push(eventPositionsHref(selectedEvent.id)),
                color: 'bg-orange-600 hover:bg-orange-700'
              },
              {
                id: 'view-volunteers',
                label: 'View Volunteers',
                icon: '👥',
                onClick: () => router.push(`/events/${selectedEvent.id}/volunteers`),
                color: 'bg-blue-600 hover:bg-blue-700'
              }
            ]}
          />

          <QuickVolunteerLookup
            isOpen={showVolunteerLookup}
            onClose={() => setShowVolunteerLookup(false)}
            eventId={selectedEvent.id}
            onSelect={(volunteer) => {
              setShowVolunteerLookup(false)
              // Could open assignment form with preselected volunteer
            }}
          />

          <QuickAssignmentForm
            isOpen={showAssignmentForm}
            onClose={() => setShowAssignmentForm(false)}
            eventId={selectedEvent.id}
            onSuccess={() => {
              // Refresh the page or show success message
              router.reload()
            }}
          />

          <QRScanner
            isOpen={showQRScanner}
            onClose={() => setShowQRScanner(false)}
          />
        </>
      )}
    </div>
  )
}
