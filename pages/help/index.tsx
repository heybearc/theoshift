import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import HelpLayout from '../../components/HelpLayout'
import Link from 'next/link'

interface HelpPageProps {
  userRole: string
}

export default function HelpPage({ userRole }: HelpPageProps) {
  const helpTopics = [
    {
      id: 'getting-started',
      title: '🚀 Getting Started',
      description: 'Learn the basics of using Theocratic Shift Scheduler',
      roles: ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'ATTENDANT']
    },
    {
      id: 'user-management',
      title: '👥 User Management',
      description: 'How to invite users, manage roles, and handle accounts',
      roles: ['ADMIN']
    },
    {
      id: 'event-management',
      title: '📅 Event Management',
      description: 'Creating, editing, managing events, and exporting data',
      roles: ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN']
    },
    {
      id: 'attendant-management',
      title: '👥 Attendant Management',
      description: 'Finding, filtering, and managing attendants',
      roles: ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN']
    },
    {
      id: 'assignments',
      title: '📋 Managing Assignments',
      description: 'How to assign attendants to positions and manage schedules',
      roles: ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN']
    },
    {
      id: 'count-times',
      title: '⏱️ Count Times',
      description: 'Recording and managing attendance counts',
      roles: ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN']
    },
    {
      id: 'attendant-portal',
      title: '🏠 Attendant Portal',
      description: 'Using the personal dashboard and viewing assignments',
      roles: ['ATTENDANT']
    },
    {
      id: 'session-management',
      title: '🔐 Session Management',
      description: 'Monitor and manage active user sessions',
      roles: ['ADMIN']
    },
    {
      id: 'email-config',
      title: '📧 Email Configuration',
      description: 'Setting up email notifications and invitations',
      roles: ['ADMIN']
    },
    {
      id: 'troubleshooting',
      title: '🔧 Troubleshooting',
      description: 'Common issues and how to resolve them',
      roles: ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'ATTENDANT']
    }
  ]

  const userTopics = helpTopics.filter(topic => topic.roles.includes(userRole))

  return (
    <HelpLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 Help Center</h1>
          <p className="text-gray-600">
            Find answers and learn how to use Theocratic Shift Scheduler effectively
          </p>
        </div>

        {/* Quick Links */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">🔗 Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/request-access"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              📞 Request Access
            </Link>
            <Link
              href="/auth/signin"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              🔐 Sign In
            </Link>
            <Link
              href="/attendant/login"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              👤 Attendant Login
            </Link>
          </div>
        </div>

        {/* Help Topics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userTopics.map((topic) => (
            <div
              key={topic.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {topic.title}
              </h3>
              <p className="text-gray-600 mb-4">
                {topic.description}
              </p>
              <Link
                href={`/help/${topic.id}`}
                className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
              >
                Learn More
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="mt-12 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">💬 Need More Help?</h2>
          <p className="text-gray-600 mb-4">
            Can't find what you're looking for? Contact your local administration for assistance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/help/contact"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📧 Contact Support
            </Link>
            <Link
              href="/help/feedback"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              💡 Send Feedback
            </Link>
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
