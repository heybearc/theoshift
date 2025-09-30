import { GetServerSideProps } from 'next'

// Redirect admin events create to main events create page
export default function AdminEventsCreateRedirect() {
  return null
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/events/create',
      permanent: true,
    },
  }
}