import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventLayout from '../../../components/EventLayout'
import Link from 'next/link'

interface Event {
  id: string
  name: string
  eventType: string
  startDate: string
  endDate: string
  status: string
}

interface EventAttenданtsPageProps {
  eventId: string
  event: Event | null
}

export default function EventAttenданtsPage({ eventId, event }: EventAttenданtsPageProps) {
  return (
    <EventLayout 
      title={`${event?.name || 'Event'} - Attendants | JW Attendant Scheduler`}
      breadcrumbs={[
        { label: 'Events', href: '/events' },
        { label: event?.name || 'Event', href: `/events/${eventId}` },
        { label: 'Attendants' }
      ]}
      selectedEvent={{
        id: eventId,
        name: event?.name || 'Event',
        status: event?.status
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-blue-800">
                Attendants Page - Event Isolation Fixed
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p className="mb-2">The attendant isolation bug has been fixed at the API level. The attendants management interface is being rebuilt.</p>
                <p className="font-semibold">What was fixed:</p>
                <ul className="list-disc ml-5 mt-1 space-y-1">
                  <li>API now correctly filters attendants by event ID</li>
                  <li>Each event will only show its own attendants</li>
                  <li>Bulk imports are event-specific</li>
                </ul>
                <p className="mt-3">The full attendants management page will be restored shortly.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Event Information</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Event Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{event?.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Event ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono text-xs">{eventId}</dd>
            </div>
          </dl>
          <div className="mt-6">
            <Link
              href={`/events/${eventId}`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              ← Back to Event
            </Link>
          </div>
        </div>
      </div>
    </EventLayout>
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

  const { id } = context.params!
  
  // Fetch event data directly from database to avoid session issues
  let event: Event | null = null
  try {
    const { prisma } = await import('../../../src/lib/prisma')
    const eventData = await prisma.events.findUnique({
      where: { id: id as string }
    })
    
    if (eventData) {
      event = {
        id: eventData.id,
        name: eventData.name,
        eventType: eventData.eventType,
        startDate: eventData.startDate.toISOString(),
        endDate: eventData.endDate.toISOString(),
        status: eventData.status
      }
    }
  } catch (error) {
    console.error('Error fetching event:', error)
    event = null
  }
  
  return {
    props: {
      eventId: id as string,
      event
    }
  }
}
