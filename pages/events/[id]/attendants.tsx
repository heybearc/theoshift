import { GetServerSideProps } from 'next'

export default function EventAttenданtsPage() {
  // This page has been deprecated - attendants functionality removed
  return null
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.query
  
  // Redirect to main event page since attendants functionality is removed
  return {
    redirect: {
      destination: `/events/${id}`,
      permanent: false,
    },
  }
}
