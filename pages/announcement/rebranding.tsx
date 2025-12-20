import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import Link from 'next/link'

export default function RebrandingAnnouncement() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">🎉 We're Rebranding!</h1>
          <p className="text-xl text-blue-100">
            Introducing <strong>Theocratic Shift Scheduler</strong>
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* What's Changing */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What's Changing?</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              We're excited to announce that <strong>Theocratic Shift Scheduler</strong> is becoming 
              <strong className="text-blue-600"> Theocratic Shift Scheduler</strong>!
            </p>
            <p>
              This change reflects our vision to expand beyond attendant management and support 
              <strong> all volunteer departments</strong> at theocratic events, including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Attendants</li>
              <li>Coat Room</li>
              <li>Cleaning</li>
              <li>Stage Management</li>
              <li>Parking</li>
              <li>Audio/Video</li>
              <li>And more!</li>
            </ul>
          </div>
        </section>

        {/* What's NOT Changing */}
        <section className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-green-900 mb-4">✅ What's NOT Changing?</h2>
          <div className="space-y-3 text-green-800">
            <p className="flex items-start">
              <svg className="h-6 w-6 text-green-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Your data is safe</strong> - All your events, assignments, and settings remain exactly as they are</span>
            </p>
            <p className="flex items-start">
              <svg className="h-6 w-6 text-green-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Same features</strong> - Everything you use today continues to work</span>
            </p>
            <p className="flex items-start">
              <svg className="h-6 w-6 text-green-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Your login</strong> - Use the same username and password</span>
            </p>
            <p className="flex items-start">
              <svg className="h-6 w-6 text-green-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Your permissions</strong> - All roles and access levels stay the same</span>
            </p>
          </div>
        </section>

        {/* New Domain */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🌐 New Domain Name</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              You can now access the application at our new domain:
            </p>
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-600 font-semibold mb-2">NEW URL</p>
              <a 
                href="https://theoshift.com" 
                className="text-2xl font-bold text-blue-600 hover:text-blue-800 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                theoshift.com
              </a>
            </div>
            <p className="text-sm text-gray-600">
              <strong>Don't worry!</strong> The old domain (<code className="bg-gray-100 px-2 py-1 rounded">theoshift.com</code>) 
              will continue to work for the next 6 months. You have plenty of time to update your bookmarks.
            </p>
          </div>
        </section>

        {/* Timeline */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📅 What's Coming Next?</h2>
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600 font-bold">
                  1
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Now - November 2025</h3>
                <p className="text-gray-600">
                  Updated branding throughout the application. Both domains work identically.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 text-purple-600 font-bold">
                  2
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">November 2025</h3>
                <p className="text-gray-600">
                  Terminology updates: "Attendant" becomes "Volunteer" throughout the app.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-600 font-bold">
                  3
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">December 2025</h3>
                <p className="text-gray-600">
                  New features! Support for multiple volunteer departments beyond attendants.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 text-yellow-600 font-bold">
                  4
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">January 2026</h3>
                <p className="text-gray-600">
                  Old domain redirects to new domain. Please update your bookmarks by then!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">❓ Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Do I need to create a new account?</h3>
              <p className="text-gray-700">
                No! Your existing account works on both domains. Use the same login credentials.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Will my bookmarks still work?</h3>
              <p className="text-gray-700">
                Yes, through the end of the year. After January 2026, the old domain will automatically redirect to the new one. 
                We recommend updating your bookmarks to <code className="bg-gray-100 px-2 py-1 rounded">theoshift.com</code> when convenient.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What about my saved events and data?</h3>
              <p className="text-gray-700">
                Everything is preserved! This is just a name change - all your data, events, assignments, 
                and settings remain exactly as they are.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">When will the new department features be available?</h3>
              <p className="text-gray-700">
                We're planning to roll out multi-department support in December 2025. We'll announce details 
                as we get closer to the release date.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Who should I contact if I have questions?</h3>
              <p className="text-gray-700">
                Please use the "Send Feedback" button in the app, or contact your system administrator.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 text-center text-white mb-6">
          <h2 className="text-2xl font-bold mb-4">Ready to Try the New Domain?</h2>
          <p className="text-blue-100 mb-6">
            Visit us at our new home and update your bookmarks!
          </p>
          <a
            href="https://theoshift.com"
            className="inline-block bg-white text-blue-600 font-bold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
            target="_blank"
            rel="noopener noreferrer"
          >
            Go to theoshift.com →
          </a>
        </section>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)

  // Allow anyone to view this page (even logged out users)
  return {
    props: {},
  }
}
