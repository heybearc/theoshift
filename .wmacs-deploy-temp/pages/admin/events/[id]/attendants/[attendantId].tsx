import { GetServerSideProps } from 'next'

// Redirect admin event attendant detail to main events page
export default function AdminEventAttendantDetailRedirect() {
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