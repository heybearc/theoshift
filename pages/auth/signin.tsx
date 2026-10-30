import { useState, useEffect } from 'react'
import { signIn, getSession, useSession, signOut, getCsrfToken } from 'next-auth/react'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'

type UserRole = 'oversight' | 'volunteer'

export default function SignIn() {
  const router = useRouter()
  const { data: session, status } = useSession()
  
  // Auto-redirect authenticated users to their dashboard
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const callbackUrl = router.query.callbackUrl as string
      
      // If they have a callback URL, use it
      if (callbackUrl) {
        router.push(callbackUrl)
        return
      }
      
      // Otherwise, redirect based on role
      if (session.user.role === 'VOLUNTEER') {
        router.push('/volunteer/select-event')
      } else {
        router.push('/events/select')
      }
    }
  }, [status, session, router])
  
  // Role selection
  const [role, setRole] = useState<UserRole>('oversight')
  
  // Form states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  
  // Oversight form
  const [oversightEmail, setOversightEmail] = useState('')
  const [oversightPassword, setOversightPassword] = useState('')
  
  // Volunteer email form
  const [volunteerEmail, setVolunteerEmail] = useState('')

  // Load saved role preference and handle URL params
  useEffect(() => {
    const savedRole = localStorage.getItem('loginRole') as UserRole
    const queryRole = router.query.role as UserRole
    const callbackUrl = router.query.callbackUrl as string
    
    // If callback URL is for volunteer routes, default to volunteer role
    if (callbackUrl?.startsWith('/volunteer')) {
      setRole('volunteer')
      localStorage.setItem('loginRole', 'volunteer')
    } else if (queryRole && (queryRole === 'oversight' || queryRole === 'volunteer')) {
      setRole(queryRole)
      localStorage.setItem('loginRole', queryRole)
    } else if (savedRole && (savedRole === 'oversight' || savedRole === 'volunteer')) {
      setRole(savedRole)
    }
  }, [router.query.role, router.query.callbackUrl])

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole)
    localStorage.setItem('loginRole', newRole)
    setError('')
    setEmailSent(false)
  }

  const handleOversightSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email: oversightEmail,
        password: oversightPassword,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid credentials')
        setLoading(false)
      } else {
        router.push(router.query.callbackUrl as string || '/events/select')
      }
    } catch (error) {
      setError('An error occurred')
      setLoading(false)
    }
  }

  const handleVolunteerEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Call our custom magic link API
      const response = await fetch('/api/auth/magic-link/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: volunteerEmail })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send magic link')
        setLoading(false)
      } else {
        setEmailSent(true)
        setLoading(false)
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  // Email sent confirmation screen
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Check your email</h2>
              <p className="text-gray-600 mb-2">
                We've sent a sign-in link to
              </p>
              <p className="text-lg font-semibold text-gray-900 mb-6">
                {volunteerEmail}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Click the link in the email to sign in to your volunteer dashboard.
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Check your spam folder</strong> if you don't see the email within a few minutes.
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEmailSent(false)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                ← Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* Volunteer Sign-Out Notice */}
          {session?.user?.role === 'VOLUNTEER' && role === 'oversight' && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="text-yellow-400 text-lg mr-3">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-800 mb-1">
                    Volunteer Session Active
                  </h3>
                  <p className="text-xs text-yellow-700 mb-3">
                    You're currently signed in as a volunteer. Sign out to access oversight login.
                  </p>
                  <button
                    onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Sign Out Volunteer Session
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex justify-center">
              <img
                src="/logo.svg"
                alt="TheoShift Logo"
                className="h-24 w-24 drop-shadow-lg"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">TheoShift</h1>
            <p className="text-gray-600">Event Coordination Platform</p>
          </div>

          {/* Role Toggle */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => handleRoleChange('oversight')}
              className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all ${
                role === 'oversight'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              👔 Oversight
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('volunteer')}
              className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all ${
                role === 'volunteer'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🙋 Volunteer
            </button>
          </div>

          {/* Role Indicator */}
          <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
            <p className="text-sm text-blue-700">
              {role === 'oversight' 
                ? '👔 Signing in as Oversight or Support'
                : '🙋 Signing in as Volunteer'
              }
            </p>
          </div>

          {/* Oversight Login Form */}
          {role === 'oversight' && (
            <form onSubmit={handleOversightSubmit} className="space-y-4">
              <div>
                <label htmlFor="oversight-email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="oversight-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={oversightEmail}
                  onChange={(e) => setOversightEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 focus:bg-white text-base"
                  placeholder="Enter your email address"
                />
              </div>

              <div>
                <label htmlFor="oversight-password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="oversight-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={oversightPassword}
                  onChange={(e) => setOversightPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 focus:bg-white text-base"
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Need access?{' '}
                  <a
                    href="mailto:theoshift.team@gmail.com"
                    className="text-blue-600 hover:text-blue-800 transition-colors font-medium"
                  >
                    Contact TheoShift Support
                  </a>
                </p>
              </div>
            </form>
          )}

          {/* Volunteer Login Form */}
          {role === 'volunteer' && (
            <>
              <form onSubmit={handleVolunteerEmailSubmit} className="space-y-4">
                <div>
                  <label htmlFor="volunteer-email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="volunteer-email"
                    type="email"
                    required
                    value={volunteerEmail}
                    onChange={(e) => setVolunteerEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 bg-gray-50 focus:bg-white text-base"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        We&apos;ll send you a secure sign-in link. Click it to access your dashboard.
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-red-700 text-sm font-medium">{error}</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? 'Sending...' : 'Send Sign-In Link'}
                </button>
              </form>

              {/* Support Contact */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                      Need Help?
                    </h3>
                    <p className="text-sm text-gray-700 mb-2">
                      If you need to update your email address or have any questions, please contact us:
                    </p>
                    <a
                      href="mailto:theoshift.team@gmail.com"
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      TheoShift Support
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-white/80 text-sm">
            TheoShift • Volunteer Coordination Platform
          </p>
        </div>
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)
  
  if (session) {
    // If user is a volunteer trying to access admin login, allow it (they'll need to sign out)
    // Otherwise redirect authenticated admin users to home
    if (session.user?.role !== 'VOLUNTEER') {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      }
    }
  }

  return {
    props: {},
  }
}
