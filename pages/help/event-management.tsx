import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import HelpLayout from '../../components/HelpLayout'
import Link from 'next/link'

interface EventManagementProps {
  userRole: string
}

export default function EventManagementPage({ userRole }: EventManagementProps) {
  return (
    <HelpLayout title="Event Management">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📅 Event Management</h1>
          <p className="text-gray-600">
            Creating, editing, and managing events in JW Attendant Scheduler
          </p>
        </div>

        {/* Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">Event Management Overview</h2>
          <p className="text-blue-800">
            Events are the core of the JW Attendant Scheduler system. They represent assemblies, conventions, 
            and other gatherings that require attendant coordination and management.
          </p>
        </div>

        <div className="space-y-8">
          {/* Event Creation */}
          {(userRole === 'ADMIN' || userRole === 'OVERSEER') && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">➕ Creating Events</h2>
              
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Step-by-Step Event Creation</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Basic Information</h4>
                      <p className="text-gray-600">Enter event name, type, dates, and location details</p>
                      <ul className="mt-2 text-sm text-gray-600 space-y-1">
                        <li>• Event name (e.g., "Circuit Assembly - Fall 2025")</li>
                        <li>• Event type (Assembly, Convention, Special Event)</li>
                        <li>• Start and end dates/times</li>
                        <li>• Venue information and address</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Positions & Requirements</h4>
                      <p className="text-gray-600">Define attendant positions and their requirements</p>
                      <ul className="mt-2 text-sm text-gray-600 space-y-1">
                        <li>• Security positions (entrance, parking, roving)</li>
                        <li>• Cleaning assignments (restrooms, auditorium, grounds)</li>
                        <li>• Technical support (sound, video, IT)</li>
                        <li>• First aid and medical assistance</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Capacity & Scheduling</h4>
                      <p className="text-gray-600">Set capacity needs and shift schedules</p>
                      <ul className="mt-2 text-sm text-gray-600 space-y-1">
                        <li>• Number of attendants needed per position</li>
                        <li>• Shift times and rotations</li>
                        <li>• Break schedules and coverage</li>
                        <li>• Special requirements or qualifications</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <Link href="/events/create" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-block">
                    Create New Event
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Event Selection */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 Event Selection</h2>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Select and Manage Events</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Viewing Available Events</h4>
                  <p className="text-gray-600 mb-2">
                    The Event Selection page shows all events you have access to based on your role:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>Admins:</strong> See all events in the system</li>
                    <li>• <strong>Overseers:</strong> See events they're assigned to manage</li>
                    <li>• <strong>Keymen:</strong> See events in their areas of responsibility</li>
                    <li>• <strong>Attendants:</strong> See events they're assigned to</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Event Information</h4>
                  <p className="text-gray-600 mb-2">Each event card displays:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Event name, type, and status</li>
                    <li>• Date, time, and location</li>
                    <li>• Attendant capacity and current assignments</li>
                    <li>• Your role and responsibilities</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Selecting an Event</h4>
                  <p className="text-gray-600 mb-2">
                    Click "Select Event" to access the event management interface where you can:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• View detailed event information</li>
                    <li>• Manage attendant assignments</li>
                    <li>• Track attendance and check-ins</li>
                    <li>• Generate reports and documentation</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <Link href="/events/select" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-block">
                  View Events
                </Link>
              </div>
            </div>
          </div>

          {/* Managing Assignments */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">👥 Managing Assignments</h2>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendant Assignment Process</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">For Overseers & Keymen</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Review position requirements and qualifications</li>
                    <li>• Assign attendants to specific positions and shifts</li>
                    <li>• Monitor assignment coverage and gaps</li>
                    <li>• Handle last-minute changes and substitutions</li>
                    <li>• Communicate with attendants about their assignments</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">For Attendants</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• View your current and upcoming assignments</li>
                    <li>• Check event details, times, and locations</li>
                    <li>• See your oversight contact information</li>
                    <li>• Report availability issues or conflicts</li>
                    <li>• Confirm attendance and check-in status</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Count Times */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">⏰ Count Times & Attendance</h2>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recording and Managing Attendance</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Attendance Tracking</h4>
                  <p className="text-gray-600 mb-2">
                    The system helps track attendance counts throughout the event:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Real-time attendant check-in and check-out</li>
                    <li>• Position coverage monitoring</li>
                    <li>• Shift rotation tracking</li>
                    <li>• Break and meal period management</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Count Reporting</h4>
                  <p className="text-gray-600 mb-2">Generate reports for:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Total attendance by session</li>
                    <li>• Position coverage statistics</li>
                    <li>• Attendant participation records</li>
                    <li>• Event summary and analytics</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Best Practices */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-900 mb-4">✅ Best Practices</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-green-800 mb-3">Event Planning</h3>
                <ul className="space-y-2 text-sm text-green-700">
                  <li>• Plan events well in advance</li>
                  <li>• Clearly define position requirements</li>
                  <li>• Allow buffer time for assignments</li>
                  <li>• Communicate changes promptly</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-green-800 mb-3">Assignment Management</h3>
                <ul className="space-y-2 text-sm text-green-700">
                  <li>• Confirm attendant availability</li>
                  <li>• Provide clear instructions</li>
                  <li>• Have backup plans ready</li>
                  <li>• Monitor coverage regularly</li>
                </ul>
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
