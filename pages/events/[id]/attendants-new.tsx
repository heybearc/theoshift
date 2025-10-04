import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import AttendantManagementPage from '../../../features/attendant-management/components/AttendantManagementPage'

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
    <AttendantManagementPage 
      eventId={eventId}
      eventName={event?.name}
    />
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
  
  // Fetch event data for context
  let event: Event | null = null
  try {
    // Fetch real event data from the API
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/events/${id}`)
    if (response.ok) {
      const eventData = await response.json()
      if (eventData.success) {
        event = eventData.data
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
