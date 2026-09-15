import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import HelpLayout from '../../components/HelpLayout'
import Link from 'next/link'

interface VolunteerPortalHelpProps {
  userRole: string
}

export default function VolunteerPortalHelp({ userRole }: VolunteerPortalHelpProps) {
  return (
    <HelpLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">🏠 Volunteer Portal</h1>
        
        <div className="prose max-w-none">
          <p className="text-lg text-gray-700 mb-6">
            Your personal dashboard for viewing assignments, managing your schedule, and staying connected.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Accessing the Portal</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">🔐 Sign-in</h3>
            <p className="text-gray-700 mb-3">
              Volunteers sign in with a secure email link. No password is required.
            </p>
            
            <div className="space-y-4">
              <div className="border-l-4 border-green-500 pl-4 bg-green-50 p-4 rounded-r-lg">
                <h4 className="font-semibold text-gray-900 mb-2">📧 Magic Link Sign-In</h4>
                <p className="text-gray-700 mb-3">
                  Enter your email and we send a one-time sign-in link. No password to remember.
                </p>
                <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
                  <li>Go to the <strong>TheoShift login page</strong></li>
                  <li>Click the <strong>"Volunteer"</strong> button</li>
                  <li>Enter your <strong>email address</strong></li>
                  <li>Click <strong>"Send Sign-In Link"</strong></li>
                  <li>Check your email inbox for the magic link</li>
                  <li>Click the link in your email</li>
                  <li>You'll be automatically signed in!</li>
                </ol>
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-gray-600">
                    🔒 <strong>Security:</strong> The link expires in 24 hours and can only be used once.
                  </p>
                  <p className="text-sm text-gray-600">
                    📱 <strong>Mobile Friendly:</strong> Works great on phones and tablets!
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Need Help?</h4>
              <p className="text-blue-800 text-sm mb-2">
                If you need to update your email address or have any questions:
              </p>
              <p className="text-blue-800 text-sm">
                � Contact <strong>TheoShift Support</strong> at <a href="mailto:theoshift.team@gmail.com" className="underline hover:text-blue-900">theoshift.team@gmail.com</a>
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard Overview</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <p className="text-gray-700 mb-4">
              Your dashboard shows:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Upcoming Assignments:</strong> Your scheduled positions and shifts</li>
              <li><strong>Event Information:</strong> Details about events you're assigned to</li>
              <li><strong>Confirmation Status:</strong> Whether you've confirmed or declined assignments</li>
              <li><strong>Quick Actions:</strong> Confirm assignments, view details, contact coordinators</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Viewing Your Assignments</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Assignment Cards</h3>
            <p className="text-gray-700 mb-3">
              Each assignment card displays:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>Event name and date</li>
              <li>Position name and department</li>
              <li>Shift time (start and end)</li>
              <li>Location and venue</li>
              <li>Special instructions or notes</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-4">Filtering Assignments</h3>
            <p className="text-gray-700">
              Use filters to view assignments by date range, event, or confirmation status.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirming Assignments</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <p className="text-gray-700 mb-3">
              When you receive an assignment notification email:
            </p>
            <ol className="list-decimal list-inside text-gray-700 space-y-2 mb-4">
              <li>Click the confirmation link in the email</li>
              <li>Review the assignment details</li>
              <li>Click <strong>Confirm</strong> if you can fulfill the assignment</li>
              <li>Or click <strong>Decline</strong> if you cannot, and provide a reason</li>
            </ol>
            <p className="text-gray-700">
              You can also confirm assignments directly from your dashboard.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Mobile Access</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <p className="text-gray-700 mb-3">
              The volunteer portal is fully optimized for mobile devices:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Touch-friendly interface with large buttons</li>
              <li>Bottom navigation for easy access</li>
              <li>Swipe gestures for quick actions</li>
              <li>Install as a Progressive Web App (PWA) for offline access</li>
            </ul>
            <p className="text-gray-700 mt-3">
              Learn more in the <Link href="/help/mobile-features" className="text-blue-600 hover:underline">Mobile Features</Link> guide.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Notifications</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Email Notifications</h3>
            <p className="text-gray-700 mb-3">
              You'll receive email notifications for:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>New assignments</li>
              <li>Assignment changes or updates</li>
              <li>Event reminders</li>
              <li>Important announcements</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Management</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <p className="text-gray-700 mb-3">
              From your profile page, you can:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Update your contact information</li>
              <li>View your assignment history</li>
              <li>Update your availability preferences</li>
              <li>Manage your notification settings</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Getting Help</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <p className="text-gray-700 mb-3">
              If you need assistance:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Check the <Link href="/help/troubleshooting" className="text-blue-600 hover:underline">Troubleshooting</Link> guide</li>
              <li>Contact your event coordinator</li>
              <li>Submit feedback using the <Link href="/help/feedback" className="text-blue-600 hover:underline">Feedback</Link> form</li>
              <li>Reach out to your local administrator</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-8">
            <h3 className="text-lg font-semibold text-green-900 mb-2">💡 Tips for Success</h3>
            <ul className="list-disc list-inside text-green-800 space-y-2">
              <li>Check your dashboard regularly for new assignments</li>
              <li>Confirm assignments promptly to help coordinators plan</li>
              <li>Keep your contact information up to date</li>
              <li>Enable email notifications to stay informed</li>
              <li>Use the mobile app for on-the-go access</li>
            </ul>
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
      userRole: session.user?.role || 'VOLUNTEER',
    },
  }
}
