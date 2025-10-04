import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import AttendantManagementPage from '../../features/attendant-management/components/AttendantManagementPage'

export default function Attendan tsPage() {
  return <AttendantManagementPage />
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

  // Check if user has proper permissions
  if (!['ADMIN', 'OVERSEER'].includes(session.user?.role || '')) {
    return {
      redirect: {
        destination: '/events',
        permanent: false,
      },
    }
  }
  
  return {
    props: {}
  }
}
