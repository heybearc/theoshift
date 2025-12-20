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
            Creating, editing, and managing events in Theocratic Shift Scheduler
          </p>
        </div>

        {/* Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">Event Management Overview</h2>
          <p className="text-blue-800">
            Events are the core of the Theocratic Shift Scheduler system. They represent assemblies, conventions, 
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

          {/* Announcements */}
          {(userRole === 'ADMIN' || userRole === 'OVERSEER' || userRole === 'ASSISTANT_OVERSEER' || userRole === 'KEYMAN') && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📢 Event Announcements</h2>
              
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Creating and Managing Announcements</h3>
                
                <p className="text-gray-600 mb-4">
                  Announcements allow you to communicate important information to attendants. They appear as banners 
                  on the attendant dashboard when active.
                </p>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Announcement Types</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">ℹ️</span>
                        <div>
                          <strong>INFO:</strong> General information (e.g., arrival times, parking instructions)
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-500 mr-2">⚠️</span>
                        <div>
                          <strong>WARNING:</strong> Important notices that require attention
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-500 mr-2">🚨</span>
                        <div>
                          <strong>URGENT:</strong> Critical information requiring immediate action
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">How to Create an Announcement</h4>
                    <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
                      <li>Navigate to the event detail page</li>
                      <li>Click the "📢 Announcements" button</li>
                      <li>Click "+ New Announcement"</li>
                      <li>Enter title and message</li>
                      <li>Select announcement type (INFO, WARNING, or URGENT)</li>
                      <li>Optionally set start and end dates</li>
                      <li>Click "Create" to publish</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Date Ranges</h4>
                    <p className="text-sm text-gray-600">
                      Set start and end dates to control when announcements are visible. Announcements will only 
                      appear to attendants during the specified date range. Leave dates blank to show indefinitely.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Managing Announcements</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• <strong>Edit:</strong> Update title, message, type, or dates</li>
                      <li>• <strong>Deactivate:</strong> Hide announcement without deleting it</li>
                      <li>• <strong>Delete:</strong> Permanently remove announcement</li>
                      <li>• <strong>Reactivate:</strong> Make inactive announcements visible again</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> Announcements are visible to all attendants assigned to the event. 
                    Use them for important communications like arrival times, parking changes, or safety reminders.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Exporting Data */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📄 Exporting Position Data</h2>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export to PDF</h3>
              <p className="text-gray-600 mb-4">
                Export your event positions to a professionally formatted PDF document. Perfect for printing
                or sharing with your team.
              </p>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-gray-900">How to Export PDF:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-gray-600 ml-4">
                    <li>Go to the event's Positions page</li>
                    <li>Apply any filters you want (optional)</li>
                    <li>Click the "📄 Export PDF" button in the header</li>
                    <li>The PDF will download automatically</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900">What's Included:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                    <li>All position details and requirements</li>
                    <li>Shift information and timing</li>
                    <li>Assigned attendants</li>
                    <li>Oversight assignments</li>
                    <li>Color-coded sections for easy reading</li>
                    <li>Professional formatting with proper page breaks</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export to Excel</h3>
              <p className="text-gray-600 mb-4">
                Download position data as a fully formatted Excel (.xlsx) file. Great for further analysis,
                record keeping, or importing into other systems.
              </p>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-gray-900">How to Export Excel:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-gray-600 ml-4">
                    <li>Go to the event's Positions page</li>
                    <li>Apply any filters you want (optional)</li>
                    <li>Click the "📊 Export Excel" button in the header</li>
                    <li>The Excel file will download automatically</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900">What's Included:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                    <li>Structured data in spreadsheet format</li>
                    <li>Proper column headers</li>
                    <li>All position and assignment information</li>
                    <li>Easy to sort, filter, and analyze</li>
                    <li>Compatible with Excel, Google Sheets, and other spreadsheet programs</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Export Tips</h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• <strong>Filter First:</strong> Apply filters before exporting to get only the data you need</li>
                <li>• <strong>Overseer Reports:</strong> Filter by overseer, then export to create individual team reports</li>
                <li>• <strong>PDF for Printing:</strong> Use PDF when you need to print or share a formatted document</li>
                <li>• <strong>Excel for Analysis:</strong> Use Excel when you need to manipulate or analyze the data</li>
                <li>• <strong>File Naming:</strong> Export files are automatically named with the event name and current date</li>
              </ul>
            </div>
          </div>

          {/* Event Permissions */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🔐 Event Permissions</h2>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Who Can See Events</h3>
              <p className="text-gray-600 mb-4">
                Not everyone can see all events. Access is controlled through the event permissions system.
              </p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900">Administrators</h4>
                  <p className="text-gray-600">
                    System administrators automatically have full access to all events without needing to be
                    explicitly added. They can see, edit, and manage any event in the system.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900">Overseers and Keymen</h4>
                  <p className="text-gray-600">
                    Overseers and Keymen only see events they've been given permission to access. If you don't
                    see an event in your list, you haven't been added to that event's permissions yet.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900">Managing Permissions</h4>
                  <p className="text-gray-600 mb-2">
                    Event creators and administrators can add users to events:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-600 ml-4">
                    <li>Go to the event page</li>
                    <li>Click "Permissions" in the navigation</li>
                    <li>Click "Invite User"</li>
                    <li>Select the user and assign their role</li>
                    <li>Click "Add Permission"</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900">
                <strong>Note:</strong> If you need access to an event and don't see it in your list, contact
                your system administrator or the event creator to request permission.
              </p>
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
