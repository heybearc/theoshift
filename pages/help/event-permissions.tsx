import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import HelpLayout from '../../components/HelpLayout'
import Link from 'next/link'

interface EventPermissionsProps {
  userRole: string
}

export default function EventPermissionsPage({ userRole }: EventPermissionsProps) {
  return (
    <HelpLayout title="Event Permissions">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔐 Event Permissions</h1>
          <p className="text-gray-600">
            Understanding and managing who can access and manage your events
          </p>
        </div>

        {/* Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">What Are Event Permissions?</h2>
          <p className="text-blue-800 mb-3">
            Event permissions control who can view and manage specific events. Each person can be 
            granted one of four permission levels, giving them different capabilities within the event.
          </p>
          <p className="text-blue-800">
            <strong>New in v3.9.0:</strong> We've simplified permissions from 5 roles to 3 roles, 
            making it easier to understand and manage access.
          </p>
        </div>

        <div className="space-y-8">
          {/* Permission Roles */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">👥 Permission Roles</h2>
            
            <div className="space-y-4">
              {/* ADMIN */}
              <div className="bg-white border-l-4 border-red-500 rounded-lg p-6">
                <div className="flex items-center mb-3">
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold mr-3">
                    ADMIN
                  </span>
                  <span className="text-gray-600">Full Control</span>
                </div>
                <p className="text-gray-700 mb-3">
                  Admins have complete control over the event and can perform all actions.
                </p>
                <h4 className="font-semibold text-gray-900 mb-2">What Admins Can Do:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>✅ Edit event details (name, dates, location)</li>
                  <li>✅ Delete the event</li>
                  <li>✅ Manage all volunteers and positions</li>
                  <li>✅ Create and manage assignments</li>
                  <li>✅ Publish documents</li>
                  <li>✅ Grant and remove permissions for other users</li>
                  <li>✅ View all event data and reports</li>
                </ul>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> Every event must have at least one Admin. 
                    You cannot remove the last Admin from an event.
                  </p>
                </div>
              </div>

              {/* SUPPORT */}
              <div className="bg-white border-l-4 border-teal-500 rounded-lg p-6">
                <div className="flex items-center mb-3">
                  <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-semibold mr-3">
                    SUPPORT
                  </span>
                  <span className="text-gray-600">Event help</span>
                </div>
                <p className="text-gray-700 mb-3">
                  Support can sign in and help manage volunteers, positions, and assignments for events they are added to.
                  This is the role to use when a sister is helping with an event.
                </p>
              </div>

              {/* COORDINATOR */}
              <div className="bg-white border-l-4 border-blue-500 rounded-lg p-6">
                <div className="flex items-center mb-3">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold mr-3">
                    COORDINATOR
                  </span>
                  <span className="text-gray-600">Day-to-Day Management</span>
                </div>
                <p className="text-gray-700 mb-3">
                  Coordinators can manage volunteers, positions, and assignments but cannot change 
                  event settings or delete the event.
                </p>
                <h4 className="font-semibold text-gray-900 mb-2">What Coordinators Can Do:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>✅ Manage volunteers (add, edit, remove)</li>
                  <li>✅ Create and edit positions</li>
                  <li>✅ Create and manage assignments</li>
                  <li>✅ Publish documents</li>
                  <li>✅ View all event data and reports</li>
                  <li>❌ Cannot edit event details</li>
                  <li>❌ Cannot delete the event</li>
                  <li>❌ Cannot manage permissions</li>
                </ul>
              </div>

              {/* VIEWER */}
              <div className="bg-white border-l-4 border-gray-400 rounded-lg p-6">
                <div className="flex items-center mb-3">
                  <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold mr-3">
                    VIEWER
                  </span>
                  <span className="text-gray-600">Read-Only Access</span>
                </div>
                <p className="text-gray-700 mb-3">
                  Viewers can see event information but cannot make any changes. This is useful 
                  for training or observation purposes.
                </p>
                <h4 className="font-semibold text-gray-900 mb-2">What Viewers Can Do:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>✅ View event details</li>
                  <li>✅ View volunteers and positions</li>
                  <li>✅ View assignments</li>
                  <li>✅ View published documents</li>
                  <li>❌ Cannot make any changes</li>
                  <li>❌ Cannot add or edit anything</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Managing Permissions */}
          {(userRole === 'ADMIN' || userRole === 'OVERSEER') && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">⚙️ Managing Permissions</h2>
              
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Grant Permissions</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Navigate to Event Permissions</h4>
                      <p className="text-gray-600">Go to your event and click the "Permissions" tab</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Click "Add Permission"</h4>
                      <p className="text-gray-600">Select the user you want to grant access to</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Choose Permission Level</h4>
                      <p className="text-gray-600">Select ADMIN, COORDINATOR, or VIEWER based on what they need to do</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Save</h4>
                      <p className="text-gray-600">The user will immediately have access to the event</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Changing or Removing Permissions</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• To change someone's role, click "Edit" next to their name and select a new role</li>
                  <li>• To remove access, click "Remove" next to their name</li>
                  <li>• You cannot remove the last Admin from an event</li>
                  <li>• System Admins always have access to all events</li>
                </ul>
              </div>
            </div>
          )}

          {/* FAQ */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">❓ Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">What happened to the old roles (OWNER, MANAGER, OVERSEER, KEYMAN)?</h3>
                <p className="text-gray-600">
                  We simplified the permission system in v3.9.0 to make it easier to understand. 
                  The old roles were automatically converted:
                </p>
                <ul className="mt-2 space-y-1 text-gray-600">
                  <li>• <strong>OWNER</strong> became <strong>ADMIN</strong></li>
                  <li>• <strong>MANAGER, OVERSEER, and KEYMAN</strong> became <strong>COORDINATOR</strong></li>
                  <li>• <strong>VIEWER</strong> stayed the same</li>
                </ul>
                <p className="mt-2 text-gray-600">
                  All existing permissions were automatically updated, so no action is needed.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Who can grant permissions?</h3>
                <p className="text-gray-600">
                  Only users with the ADMIN role for an event can grant or change permissions. 
                  System Admins can also manage permissions for any event.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Can someone have different roles for different events?</h3>
                <p className="text-gray-600">
                  Yes! Permissions are set per event. Someone could be an ADMIN for one event, 
                  a COORDINATOR for another, and a VIEWER for a third.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">What's the difference between a System Admin and an Event Admin?</h3>
                <p className="text-gray-600">
                  <strong>System Admins</strong> have full access to the entire TheoShift system, 
                  including all events, users, and settings. <strong>Event Admins</strong> only have 
                  full control over specific events they've been granted access to.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Do I need to grant permissions to volunteers?</h3>
                <p className="text-gray-600">
                  No. Volunteers automatically have access to view their own assignments through 
                  the volunteer dashboard. Event permissions are only for users who need to manage 
                  or view the entire event.
                </p>
              </div>
            </div>
          </div>

          {/* Best Practices */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-900 mb-3">💡 Best Practices</h2>
            <ul className="space-y-2 text-green-800">
              <li>✅ Grant ADMIN role to 2-3 trusted coordinators for backup</li>
              <li>✅ Use COORDINATOR role for day-to-day event management</li>
              <li>✅ Use SUPPORT for a sister who helps manage volunteers and assignments on an event</li>
              <li>✅ Use VIEWER role for training new coordinators</li>
              <li>✅ Review permissions regularly and remove access when no longer needed</li>
              <li>✅ Keep at least 2 Admins per event to avoid lockouts</li>
            </ul>
          </div>

          {/* Related Help */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">📚 Related Help Topics</h3>
            <div className="space-y-2">
              <Link href="/help/event-management" className="text-blue-600 hover:text-blue-800 block">
                → Event Management
              </Link>
              <Link href="/help/volunteer-management" className="text-blue-600 hover:text-blue-800 block">
                → Volunteer Management
              </Link>
              <Link href="/help/getting-started" className="text-blue-600 hover:text-blue-800 block">
                → Getting Started Guide
              </Link>
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
      userRole: session.user.role,
    },
  }
}
