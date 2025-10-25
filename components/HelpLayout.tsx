import { ReactNode } from 'react'
import { useRouter } from 'next/router'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import packageJson from '../package.json'

interface HelpLayoutProps {
  children: ReactNode
  title?: string
}

export default function HelpLayout({ children, title }: HelpLayoutProps) {
  const router = useRouter()
  const { data: session } = useSession()

  const handleSignOut = async () => {
    await signOut({ redirect: true })
    window.location.href = '/auth/signin'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">JW</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-semibold text-gray-900">
                    {title || 'JW Attendant Scheduler'}
                  </h1>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Navigation Links */}
              <Link
                href="/help"
                className={`text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium ${
                  router.pathname === '/help' ? 'text-blue-600 bg-blue-50' : ''
                }`}
              >
                Help Center
              </Link>
              <Link
                href="/release-notes"
                className={`text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium ${
                  router.pathname === '/release-notes' ? 'text-blue-600 bg-blue-50' : ''
                }`}
              >
                Release Notes
              </Link>
              <Link
                href="/help/feedback"
                className={`text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium ${
                  router.pathname === '/help/feedback' ? 'text-blue-600 bg-blue-50' : ''
                }`}
              >
                Send Feedback
              </Link>
              <Link
                href="/help/my-feedback"
                className={`text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium ${
                  router.pathname === '/help/my-feedback' ? 'text-blue-600 bg-blue-50' : ''
                }`}
              >
                My Feedback
              </Link>

              {/* User Menu */}
              <div className="flex items-center space-x-4">
                {session?.user?.name && (
                  <span className="text-sm text-gray-700">
                    Welcome, {session.user.name}
                  </span>
                )}
                
                {/* Back to App Button */}
                <Link
                  href={session?.user?.role === 'ADMIN' ? '/admin' : '/events/select'}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Back to App
                </Link>
                
                <button
                  onClick={handleSignOut}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            <p>JW Attendant Scheduler v{packageJson.version}</p>
            <p className="mt-1">Secure Event Management System</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
