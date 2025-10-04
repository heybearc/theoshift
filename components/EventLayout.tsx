import { ReactNode } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface EventLayoutProps {
  children: ReactNode
  title?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  selectedEvent?: {
    id: string
    name: string
    status?: string
  }
}

export default function EventLayout({ 
  children, 
  title = 'JW Attendant Scheduler',
  breadcrumbs = [],
  selectedEvent
}: EventLayoutProps) {
  const { data: session } = useSession()
  const router = useRouter()

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  const navigationItems = [
    {
      label: 'Events',
      href: '/events',
      icon: '📅',
      roles: ['ADMIN', 'OVERSEER', 'ATTENDANT']
    },
    {
      label: 'Event Selection',
      href: '/events/select',
      icon: '🎯',
      roles: ['ADMIN', 'OVERSEER', 'ATTENDANT']
    }
  ]

  // Add attendant management for admin/overseer users
  if (['ADMIN', 'OVERSEER'].includes(session?.user?.role || '')) {
    navigationItems.push({
      label: 'Attendants',
      href: '/attendants',
      icon: '👥',
      roles: ['ADMIN', 'OVERSEER']
    })
  }

  // Add admin navigation for admin users
  if (session?.user?.role === 'ADMIN') {
    navigationItems.push({
      label: 'Admin Portal',
      href: '/admin',
      icon: '🛡️',
      roles: ['ADMIN']
    })
  }

  const filteredNavigation = navigationItems.filter(item => 
    item.roles.includes(session?.user?.role || '')
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side - Logo and Navigation */}
            <div className="flex items-center">
              <Link href="/events/select" className="flex items-center">
                <span className="text-2xl font-bold text-blue-600">📋</span>
                <span className="ml-2 text-xl font-semibold text-gray-900">
                  JW Attendant Scheduler
                </span>
              </Link>
              
              {/* Navigation Items */}
              <div className="hidden md:ml-8 md:flex md:space-x-4">
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

            {/* Right side - Selected Event and User Menu */}
            <div className="flex items-center space-x-4">
              {/* Selected Event Indicator */}
              {selectedEvent && (
                <div className="hidden md:flex items-center bg-blue-50 px-3 py-1 rounded-lg">
                  <span className="text-sm text-blue-600 font-medium">
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
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-700">
                    {session.user.name}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    session.user.role === 'ADMIN' 
                      ? 'bg-red-100 text-red-800'
                      : session.user.role === 'OVERSEER'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {session.user.role}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {title && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
