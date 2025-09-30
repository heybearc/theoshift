import { useRouter } from 'next/router'

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

export async function getServerSideProps(context: any) {
  const { id } = context.params
  
  return {
    props: {
      eventId: id
    }
  }
}
