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
    // This would typically fetch from your API or database
    // For now, we'll pass sample data
    event = {
      id: id as string,
      name: 'Sample Event', // This should come from your API
      eventType: 'ASSEMBLY',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      status: 'ACTIVE'
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
