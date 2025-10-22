import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'

interface TestPageProps {
  eventId: string
}

export default function TestPage({ eventId }: TestPageProps) {
  const router = useRouter()
  
  return (
    <div>
      <h1>Test Page</h1>
      <p>Event ID from props: {eventId}</p>
      <p>Event ID from router: {router.query.id}</p>
      <p>This is a simple test to verify routing works</p>
    </div>
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
  
  return {
    props: {
      eventId: id as string
    }
  }
}
