import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import HelpLayout from '../../components/HelpLayout'
import Link from 'next/link'

interface GettingStartedProps {
  userRole: string
}

export default function GettingStartedPage({ userRole }: GettingStartedProps) {
  return (
    <HelpLayout title="Getting Started">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🚀 Getting Started</h1>
          <p className="text-gray-600">
            Learn the basics of using Theocratic Shift Scheduler effectively
          </p>
        </div>

        {/* Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">Welcome to Theocratic Shift Scheduler</h2>
          <p className="text-blue-800 mb-4">
            Theocratic Shift Scheduler is a comprehensive event management system designed specifically for 
            Jehovah's Witness events and assemblies. It helps manage attendant assignments, track attendance, 
            and coordinate event logistics efficiently.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">🎯 Your Role: {userRole}</h3>
              <p className="text-sm text-gray-600">
                {userRole === 'ADMIN' && 'You have full system access including user management, event creation, and system configuration.'}
                {userRole === 'OVERSEER' && 'You can manage events, assign attendants, and oversee event operations.'}
                {userRole === 'ASSISTANT_OVERSEER' && 'You can assist with event management and attendant coordination.'}
                {userRole === 'KEYMAN' && 'You can manage specific areas and coordinate with attendants in your section.'}
                {userRole === 'ATTENDANT' && 'You can view your assignments, check in for events, and manage your personal information.'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">🔐 Security & Privacy</h3>
              <p className="text-sm text-gray-600">
                Your data is secure and access is role-based. You only see information relevant to your responsibilities.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Quick Start Guide</h2>
            
            {userRole === 'ADMIN' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">1. System Setup</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• <strong>User Management:</strong> Create and manage user accounts for overseers, keymen, and attendants</li>
                    <li>• <strong>Event Configuration:</strong> Set up event types, positions, and requirements</li>
                    <li>• <strong>System Settings:</strong> Configure email notifications and system preferences</li>
                  </ul>
                  <Link href="/admin/users" className="inline-block mt-3 text-blue-600 hover:text-blue-800">
                    → Go to User Management
                  </Link>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Event Creation</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Create new events with dates, locations, and requirements</li>
                    <li>• Set up positions and assign capacity needs</li>
                    <li>• Configure attendant requirements and qualifications</li>
                  </ul>
                  <Link href="/events/create" className="inline-block mt-3 text-blue-600 hover:text-blue-800">
                    → Create New Event
                  </Link>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Monitor & Manage</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Use the dashboard to monitor system health and activity</li>
                    <li>• Review audit logs for security and compliance</li>
                    <li>• Manage feedback and support requests</li>
                  </ul>
                  <Link href="/admin" className="inline-block mt-3 text-blue-600 hover:text-blue-800">
                    → Go to Admin Dashboard
                  </Link>
                </div>
              </div>
            )}

            {(userRole === 'OVERSEER' || userRole === 'ASSISTANT_OVERSEER') && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Event Selection</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Browse available events and select ones to manage</li>
                    <li>• Review event details, requirements, and timelines</li>
                    <li>• Access event-specific management tools</li>
                  </ul>
                  <Link href="/events/select" className="inline-block mt-3 text-blue-600 hover:text-blue-800">
                    → Select Events
                  </Link>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Attendant Management</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Assign attendants to positions and shifts</li>
                    <li>• Monitor attendance and check-in status</li>
                    <li>• Coordinate with keymen for area management</li>
                  </ul>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Event Coordination</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Track event progress and attendance counts</li>
                    <li>• Manage last-minute changes and adjustments</li>
                    <li>• Generate reports and documentation</li>
                  </ul>
                </div>
              </div>
            )}

            {userRole === 'KEYMAN' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Area Management</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• View events and positions assigned to your area</li>
                    <li>• Coordinate with attendants in your section</li>
                    <li>• Monitor attendance and coverage</li>
                  </ul>
                  <Link href="/events/select" className="inline-block mt-3 text-blue-600 hover:text-blue-800">
                    → View Your Events
                  </Link>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Attendant Coordination</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Communicate with attendants about assignments</li>
                    <li>• Handle scheduling conflicts and adjustments</li>
                    <li>• Ensure proper coverage for all positions</li>
                  </ul>
                </div>
              </div>
            )}

            {userRole === 'ATTENDANT' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">1. View Your Assignments</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Check your current and upcoming assignments</li>
                    <li>• Review event details, times, and locations</li>
                    <li>• See your oversight contact information</li>
                  </ul>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Manage Your Profile</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Update your contact information</li>
                    <li>• Set availability preferences</li>
                    <li>• Review your assignment history</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Common Features */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🛠️ Common Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💬 Feedback System</h3>
                <p className="text-gray-700 mb-3">
                  Report issues, suggest improvements, or request new features using our integrated feedback system.
                </p>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Submit feedback with file attachments</p>
                  <p>• Track status and admin responses</p>
                  <p>• Participate in troubleshooting conversations</p>
                </div>
                <Link href="/help/feedback" className="inline-block mt-3 text-blue-600 hover:text-blue-800">
                  → Send Feedback
                </Link>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📱 Mobile Access</h3>
                <p className="text-gray-700 mb-3">
                  Access the system from any device with a modern web browser.
                </p>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Responsive design works on phones and tablets</p>
                  <p>• Secure login from anywhere</p>
                  <p>• Real-time updates and notifications</p>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-900 mb-3">🎯 Next Steps</h2>
            <div className="space-y-3">
              <p className="text-green-800">
                Now that you understand the basics, explore these resources:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/help/event-management" className="block bg-white rounded-lg p-3 text-green-700 hover:text-green-900">
                  📅 Event Management Guide
                </Link>
                <Link href="/help/managing-assignments" className="block bg-white rounded-lg p-3 text-green-700 hover:text-green-900">
                  👥 Managing Assignments
                </Link>
                <Link href="/help/troubleshooting" className="block bg-white rounded-lg p-3 text-green-700 hover:text-green-900">
                  🔧 Troubleshooting Guide
                </Link>
              </div>
            </div>
          </div>
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

  return {
    props: {
      userRole: session.user?.role || 'ATTENDANT',
    },
  }
}
