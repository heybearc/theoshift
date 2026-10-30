import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import HelpLayout from '../../components/HelpLayout'
import Link from 'next/link'

interface Props {
  userRole: string
}

export default function EventChatHelpPage({ userRole }: Props) {
  const isStaff = ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'SUPPORT'].includes(userRole)

  return (
    <HelpLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">💬 Event Chat</h1>
          <p className="text-gray-600">Real-time event communication for staff and volunteers.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Where to find chat</h2>
            <div className="space-y-2 text-gray-700 text-sm">
              <p>
                <strong>Volunteers:</strong> Open your dashboard and select <strong>Open Chat</strong>.
              </p>
              <p className="text-gray-600">
                Tip: If you don’t see the chat card on your dashboard, it may not be enabled for that event yet.
              </p>

              {isStaff && (
                <p>
                  <strong>Staff:</strong> Go to an event and open the <strong>💬 Chat</strong> tab.
                </p>
              )}
            </div>
          </section>

          {isStaff && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Finding channels (staff)</h2>
              <p className="text-sm text-gray-700">
                Use <strong>+ New message</strong> to start a <strong>direct message</strong> to another volunteer or to
                open a <strong>position channel</strong> from a searchable list. Main channels (for example Event
                General) stay in the sidebar; use <strong>Browse position channels</strong> when you need a specific
                station or assignment without scrolling every position.
              </p>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Channels you may see</h2>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              <li>
                <strong>Event Announcements</strong>: important updates for the event.
              </li>
              <li>
                <strong>Event General</strong>: general coordination.
              </li>
              <li>
                <strong>Position channels</strong>: when available, these are for your assigned position(s).
              </li>
              {isStaff && (
                <li>
                  <strong>Staff Internal</strong>: staff-only channel that volunteers cannot see.
                </li>
              )}
            </ul>
          </section>

          {isStaff && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Staff tools</h2>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>
                  <strong>Pin</strong>: keep one key message at the top of the channel.
                </li>
                <li>
                  <strong>Mute</strong>: temporarily stop someone from posting in a channel.
                </li>
                <li>
                  <strong>Delete</strong>: remove a message for everyone.
                </li>
                <li>
                  <strong>Notify chat launch</strong>: emails Volunteers-roster people that chat is available.
                  You&apos;ll see the recipient count first; IVS-only people are not included. Use{' '}
                  <strong>Abort</strong> if you need to stop a large send.
                </li>
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Quick links</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/volunteer/dashboard" className="text-sm text-blue-600 hover:text-blue-800">
                🏠 Volunteer Dashboard
              </Link>
              {isStaff && (
                <Link href="/events/select" className="text-sm text-blue-600 hover:text-blue-800">
                  📅 Select Event
                </Link>
              )}
            </div>
          </section>
        </div>
      </div>
    </HelpLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  if (!session) {
    return {
      redirect: { destination: '/auth/signin', permanent: false }
    }
  }

  return {
    props: {
      userRole: session.user?.role || 'VOLUNTEER'
    }
  }
}

