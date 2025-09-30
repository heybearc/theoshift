import { GetServerSideProps } from 'next'

// Redirect admin events to main events page
export default function AdminEventsRedirect() {
  return null
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/events',
      permanent: true,
    },
  }
}