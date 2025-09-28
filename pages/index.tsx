import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]'

export default function Home() {
  // This component should never render since we redirect on the server
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white text-lg">Loading JW Attendant Scheduler...</p>
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const session = await getServerSession(context.req, context.res, authOptions)
    
    if (session && session.user?.role === 'ADMIN') {
      // User is signed in as admin, redirect to admin dashboard
      return {
        redirect: {
          destination: '/admin',
          permanent: false,
        },
      }
    } else {
      // User is not signed in or not admin, redirect to sign in
      return {
        redirect: {
          destination: '/auth/signin',
          permanent: false,
        },
      }
    }
  } catch (error) {
    // If there's any error with session checking, redirect to sign in
    console.error('Session check error:', error)
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }
}
