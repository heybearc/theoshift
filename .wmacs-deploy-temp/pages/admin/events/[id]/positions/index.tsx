import { GetServerSideProps } from 'next'

// Redirect admin event positions to main events page
export default function AdminEventPositionsRedirect() {
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