import { GetServerSideProps } from 'next'

// Redirect admin event detail to main events page
// In event-centric architecture, event management is handled through /events
export default function AdminEventDetailRedirect() {
  return null
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params!
  
  return {
    redirect: {
      destination: `/events`,
      permanent: true,
    },
  }
}