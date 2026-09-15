import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import HelpLayout from '../../components/HelpLayout'
import Link from 'next/link'

interface VolunteerManagementHelpProps {
  userRole: string
}

export default function VolunteerManagementHelp({ userRole }: VolunteerManagementHelpProps) {
  return (
    <HelpLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">👥 Volunteer Management</h1>
          <p className="text-gray-600">
            Learn how to find, filter, and manage volunteers effectively
          </p>
        </div>

        {/* Overview */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">📊 Overview</h2>
          <p className="text-gray-700 mb-4">
            The volunteer management system helps you quickly find and organize volunteers using
            powerful filtering tools, colored badges, and smart defaults.
          </p>
        </section>

        {/* Email volunteers */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">📧 Email volunteers on an event</h2>
          <p className="text-gray-700 mb-4">
            Open an event and go to the <strong>Volunteers</strong> section. Use <strong>Email volunteers</strong>{' '}
            (near Add / Import) to message <strong>all active roster volunteers</strong> who have an email on file, or
            select rows and use <strong>Email selected</strong> in the blue toolbar.
          </p>
          <p className="text-gray-700 mb-4">
            Before sending, TheoShift shows how many people will receive the email and an estimated time.
            You can cancel there, or use <strong>Abort</strong> if a large send is already running.
            Messages keep your paragraph spacing. IVS-only people (not on the Volunteers roster) are not emailed.
          </p>
          <p className="text-gray-700 mb-4">
            Enter a subject and message; TheoShift sends through your organization&apos;s configured email
            settings. To select several rows at once on one page, click one checkbox, then hold{' '}
            <strong>Shift</strong> and click another to include everyone in between.
          </p>
          <p className="text-gray-700 mb-0">
            &quot;All active&quot; matches volunteers who are marked active on the roster and have an email—same idea as the Active filter on the list. Large sends are paced for Gmail safety and may take several minutes.
          </p>
        </section>

        {/* Smart Default Filtering */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">🎯 Smart Default View</h2>
          <p className="text-gray-700 mb-4">
            By default, the volunteer list shows only <strong>active volunteers</strong>. This makes it
            easier to find who you need without scrolling through inactive records.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-900">
              <strong>Tip:</strong> To see all volunteers including inactive ones, click the "Total" card
              at the top of the page.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Filter Cards</h3>
          <p className="text-gray-700 mb-2">
            At the top of the volunteer list, you'll see three summary cards:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Total:</strong> Click to see all volunteers (active and inactive)</li>
            <li><strong>Active:</strong> Click to see only active volunteers (default view)</li>
            <li><strong>Inactive:</strong> Click to see only inactive volunteers</li>
          </ul>
        </section>

        {/* Filtering System */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">🔍 Advanced Filtering</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Filter by Overseer</h3>
              <p className="text-gray-700">
                Use the "Filter by Overseer" dropdown to see only volunteers assigned to a specific overseer.
                Select "All Overseers" to clear this filter.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Filter by Keyman</h3>
              <p className="text-gray-700">
                Use the "Filter by Keyman" dropdown to see only volunteers assigned to a specific keyman.
                You can also select "No Keyman" to find volunteers without a keyman assignment.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Filter by Forms of Service</h3>
              <p className="text-gray-700 mb-2">
                Use the "Filter by Forms of Service" dropdown to find volunteers with specific service roles:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Elder</li>
                <li>Ministerial Servant</li>
                <li>Overseer</li>
                <li>Keyman</li>
                <li>Exemplary</li>
                <li>Regular Pioneer</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Combining Filters</h3>
              <p className="text-gray-700 mb-4">
                You can use multiple filters at the same time! For example:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Filter by Overseer "John Smith" AND Forms of Service "Elder"</li>
                <li>Filter by Keyman "Tom Jones" AND Status "Active"</li>
                <li>Any combination that helps you find who you need</li>
              </ul>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-green-900">
                  <strong>Active filters</strong> appear as colored chips below the filter dropdowns.
                  Click the X on any chip to remove that filter.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Colored Service Badges */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">🏷️ Colored Service Badges</h2>
          <p className="text-gray-700 mb-4">
            Volunteers with special forms of service have colored badges that make them easy to identify at a glance:
          </p>
          
          <div className="space-y-2 ml-4">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Elder</span>
              <span className="text-gray-700">- Purple badge</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">MS</span>
              <span className="text-gray-700">- Blue badge (Ministerial Servant)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Overseer</span>
              <span className="text-gray-700">- Green badge</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Keyman</span>
              <span className="text-gray-700">- Yellow badge</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Exemplary</span>
              <span className="text-gray-700">- Orange badge</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-pink-100 text-pink-800">RP</span>
              <span className="text-gray-700">- Pink badge (Regular Pioneer)</span>
            </div>
          </div>

          <p className="text-gray-700 mt-4">
            These badges appear in the "Forms of Service" column and make it easy to quickly identify
            volunteers with specific roles or responsibilities.
          </p>
        </section>

        {/* Column Sorting */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">⬆️⬇️ Sorting</h2>
          <p className="text-gray-700 mb-4">
            Click any column header to sort the volunteer list:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Name:</strong> Sort alphabetically by first or last name</li>
            <li><strong>Email:</strong> Sort by email address</li>
            <li><strong>Overseer:</strong> Group by overseer assignment</li>
            <li><strong>Keyman:</strong> Group by keyman assignment</li>
            <li><strong>Forms of Service:</strong> Group by service type</li>
            <li><strong>Status:</strong> Group active and inactive volunteers</li>
          </ul>
          <p className="text-gray-700 mt-4">
            Click the same column header again to reverse the sort order (ascending/descending).
          </p>
        </section>

        {/* Managing Volunteers */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">✏️ Managing Volunteer Details</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Viewing Details</h3>
              <p className="text-gray-700">
                Click on any volunteer's name to view their full profile, including contact information,
                assignments, and service details.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Editing Information</h3>
              <p className="text-gray-700 mb-2">
                Depending on your role, you can update:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Contact information (phone, email)</li>
                <li>Overseer and Keyman assignments</li>
                <li>Forms of Service</li>
                <li>Active/Inactive status</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Admin Super-User Access */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">🔐 Administrator Access</h2>
          <p className="text-gray-700 mb-4">
            System administrators automatically have full access to all events and all volunteers without
            needing to be explicitly added to event permissions.
          </p>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-900">
              <strong>Note:</strong> This "super-user" access ensures administrators can always manage
              the system and help users, even if they haven't been added to specific events.
            </p>
          </div>
        </section>

        {/* Common Questions */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">❓ Common Questions</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Why don't I see all volunteers?</h3>
              <p className="text-gray-700">
                By default, only active volunteers are shown. Click the "Total" card at the top to see
                all volunteers including inactive ones.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How do I clear all filters?</h3>
              <p className="text-gray-700">
                Click the X on each active filter chip, or set all dropdowns back to "All [Type]".
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I export the filtered list?</h3>
              <p className="text-gray-700">
                Yes! When you export volunteer data, it respects your current filters, so you only
                export the volunteers you're currently viewing.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What does "No Keyman" mean?</h3>
              <p className="text-gray-700">
                This filter shows volunteers who haven't been assigned to a keyman yet. It's useful
                for finding volunteers who need keyman assignments.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Can volunteers have multiple Forms of Service?</h3>
              <p className="text-gray-700">
                Yes! An volunteer can be both an Elder and an Overseer, for example. All their service
                badges will be displayed.
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

  // Only admins, overseers, and keymen can access volunteer management
  if (!['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN'].includes(session.user?.role || '')) {
    return {
      redirect: {
        destination: '/help',
        permanent: false,
      },
    }
  }

  return {
    props: {
      userRole: session.user?.role || 'VOLUNTEER',
    },
  }
}
