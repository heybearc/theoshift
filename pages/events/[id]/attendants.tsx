import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventAttendantManagementPage from '../../../features/attendant-management/components/EventAttendantManagementPage'
import EventLayout from '../../../components/EventLayout'
import ErrorBoundary from '../../../components/ErrorBoundary'

interface Event {
  id: string
  name: string
  eventType: string
  startDate: string
  endDate: string
  status: string
}

interface EventAttendantsPageProps {
  eventId: string
  event: Event | null
}

export default function EventAttendantsPage({ eventId, event }: EventAttendantsPageProps) {
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
      <ErrorBoundary>
        <EventAttendantManagementPage 
          eventId={eventId}
          eventName={event?.name}
        />
      </ErrorBoundary>
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
