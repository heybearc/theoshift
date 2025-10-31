import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import HelpLayout from '../../components/HelpLayout'
import Link from 'next/link'

interface SessionManagementHelpProps {
  userRole: string
}

export default function SessionManagementHelp({ userRole }: SessionManagementHelpProps) {
  return (
    <HelpLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔐 Session Management</h1>
          <p className="text-gray-600">
            Monitor and manage active user sessions in the system
          </p>
        </div>

        {/* Overview */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">📊 Overview</h2>
          <p className="text-gray-700 mb-4">
            The Session Management feature allows administrators to see who is currently logged into the system,
            monitor user activity, and understand how sessions are distributed across servers.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> This feature is only available to administrators.
            </p>
          </div>
        </section>

        {/* Accessing Session Management */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">🚪 Accessing Session Management</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Go to the <strong>Admin Portal</strong></li>
            <li>Click on <strong>Session Management</strong> in the navigation menu</li>
            <li>Or click the <strong>Active Sessions</strong> card on the dashboard</li>
          </ol>
        </section>

        {/* Understanding the Session List */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">📋 Understanding the Session List</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">User Information</h3>
              <p className="text-gray-700">
                Each row shows the user's name, email address, and role (Admin, Overseer, Keyman, etc.)
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Status Indicators</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li><span className="font-semibold">🟢 Online:</span> User has been active within the last 15 minutes</li>
                <li><span className="font-semibold">⚪ Idle:</span> User is logged in but hasn't been active for more than 15 minutes</li>
              </ul>
              <p className="text-gray-600 text-sm mt-2">
                The timestamp shows when the user was last active (e.g., "Just now", "5m ago", "2h ago")
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Server Information</h3>
              <p className="text-gray-700 mb-2">
                Shows which server the session is connected to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li><span className="font-semibold text-blue-600">BLUE:</span> Session on Blue server</li>
                <li><span className="font-semibold text-green-600">GREEN:</span> Session on Green server</li>
                <li><span className="font-semibold text-gray-600">UNKNOWN:</span> Session created before server tracking was enabled</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Details</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li><strong>Session Token:</strong> Unique identifier for the session (truncated for security)</li>
                <li><strong>Expires:</strong> Date when the session will expire</li>
                <li><strong>Days Left:</strong> Number of days until expiration</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Session Behavior */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">⚙️ How Sessions Work</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Creation</h3>
              <p className="text-gray-700">
                A new session is automatically created when you log in. Each device or browser creates
                its own session, so you can be logged in on multiple devices simultaneously.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Activity Tracking</h3>
              <p className="text-gray-700">
                The system automatically updates your activity every 5 minutes while you're using the application.
                This keeps your session marked as "Online" and extends the expiration time.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Expiration</h3>
              <p className="text-gray-700 mb-2">
                Sessions expire after <strong>30 days of inactivity</strong>. The expiration timer resets
                each time you use the application.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-900">
                  <strong>Tip:</strong> Sessions that are close to expiring (less than 7 days) are highlighted in red.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Logout Behavior</h3>
              <p className="text-gray-700">
                When you click "Sign Out", your session is marked as inactive and removed from the active
                sessions list. If you simply close your browser without logging out, the session remains
                active until it expires or you log out from another device.
              </p>
            </div>
          </div>
        </section>

        {/* Multiple Sessions */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">📱 Multiple Sessions</h2>
          <p className="text-gray-700 mb-4">
            It's normal to see multiple sessions for the same user. This happens when:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>User is logged in on multiple devices (phone, tablet, computer)</li>
            <li>User is logged in on different browsers</li>
            <li>User logged in but didn't log out, then logged in again</li>
          </ul>
          <p className="text-gray-700 mt-4">
            Each session is independent and will expire on its own after 30 days of inactivity.
          </p>
        </section>

        {/* Filtering and Search */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">🔍 Filtering and Search</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Search by Name or Email</h3>
              <p className="text-gray-700">
                Use the search box to quickly find sessions for a specific user by typing their name or email address.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Filter by Role</h3>
              <p className="text-gray-700">
                Use the role dropdown to show only sessions for users with a specific role (Admin, Overseer, Keyman, etc.)
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Refresh</h3>
              <p className="text-gray-700">
                Click the <strong>Refresh</strong> button to get the latest session information.
              </p>
            </div>
          </div>
        </section>

        {/* Common Questions */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">❓ Common Questions</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Why do I see so many sessions?</h3>
              <p className="text-gray-700">
                Users can have multiple active sessions from different devices or browsers. Old sessions
                that weren't properly logged out will remain until they expire (30 days).
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What does "UNKNOWN" server mean?</h3>
              <p className="text-gray-700">
                Sessions created before the server tracking feature was added will show as "UNKNOWN".
                Once the user logs out and logs back in, new sessions will show the correct server (BLUE or GREEN).
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I force someone to log out?</h3>
              <p className="text-gray-700">
                Currently, you cannot force logout a specific session. Users must log out themselves,
                or wait for the session to expire after 30 days of inactivity.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What are the Blue and Green servers?</h3>
              <p className="text-gray-700">
                The system uses two servers (Blue and Green) for reliability and zero-downtime updates.
                When you log in, you're automatically connected to one of them. Both servers work identically,
                and you won't notice any difference in functionality.
              </p>
            </div>
          </div>
        </section>

        {/* Back to Help Center */}
        <div className="mt-8">
          <Link
            href="/help"
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← Back to Help Center
          </Link>
        </div>
      </div>
    </HelpLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  // Only admins can access session management help
  if (session.user?.role !== 'ADMIN') {
    return {
      redirect: {
        destination: '/help',
        permanent: false,
      },
    }
  }

  return {
    props: {
      userRole: session.user?.role || 'ATTENDANT',
    },
  }
}
