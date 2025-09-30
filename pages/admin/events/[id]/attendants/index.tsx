import { GetServerSideProps } from 'next'

// Redirect admin event attendants to main events page
export default function AdminEventAttendantsRedirect() {
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