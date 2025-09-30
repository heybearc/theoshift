import { ReactNode } from 'react'
import { useRouter } from 'next/router'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'

interface AdminLayoutProps {
  children: ReactNode
  title?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
}

export default function AdminLayout({ children, title, breadcrumbs = [] }: AdminLayoutProps) {
  const router = useRouter()
  const { data: session } = useSession()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const navigationItems = [
    { label: 'Dashboard', href: '/admin', icon: '🏠' },
    { label: 'User Management', href: '/admin/users', icon: '👥' },
    { label: 'Health Monitor', href: '/admin/health', icon: '💚' },
    { label: 'API Status', href: '/admin/api-status', icon: '📊' },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: '📋' },
    { label: 'System Operations', href: '/admin/system-ops', icon: '⚡' },
    { label: 'Email Configuration', href: '/admin/email-config', icon: '📧' },
  ]

  const eventNavigationItems = [
    { label: 'Event Selection', href: '/events/select', icon: '🎯' },
    { label: 'Events Management', href: '/events', icon: '📅' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin" className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">JW</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-semibold text-gray-900">Admin Portal</h1>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {session?.user?.name}
              </span>
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

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white shadow-sm min-h-screen border-r border-gray-200">
          <div className="p-4">
            {/* Event Navigation Section */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Event Management
              </h3>
              <ul className="space-y-1">
                {eventNavigationItems.map((item) => {
                  const isActive = router.pathname === item.href || 
                    (item.href !== '/events/select' && router.pathname.startsWith(item.href))
                  
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-green-50 text-green-700 border-r-2 border-green-600'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span className="mr-3">{item.icon}</span>
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Admin Navigation Section */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Admin Functions
              </h3>
              <ul className="space-y-1">
                {navigationItems.map((item) => {
                  const isActive = router.pathname === item.href || 
                    (item.href !== '/admin' && router.pathname.startsWith(item.href))
                  
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span className="mr-3">{item.icon}</span>
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1">
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="bg-white border-b border-gray-200 px-6 py-3">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
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

          {/* Page Content */}
          <div className="p-6">
            {title && (
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
