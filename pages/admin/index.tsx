import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'

interface AdminDashboardProps {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Admin Dashboard</h1>
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">🎉 SUCCESS!</h2>
          <p className="text-gray-600 mb-6">
            Admin page now working with stable Next.js 14.2.33 and Pages Router!
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Welcome back, {user.name} ({user.email})
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">2</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">6</div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">0</div>
              <div className="text-sm text-gray-600">Total Attendants</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a href="/admin/users" className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="text-lg font-semibold">👥 User Management</div>
              <div className="text-sm text-gray-600">Manage user accounts</div>
            </a>
            <a href="/admin/health" className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="text-lg font-semibold">💚 Health Monitor</div>
              <div className="text-sm text-gray-600">System health metrics</div>
            </a>
            <a href="/admin/api-status" className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="text-lg font-semibold">📊 API Status</div>
              <div className="text-sm text-gray-600">Monitor API endpoints</div>
            </a>
            <a href="/admin/audit-logs" className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="text-lg font-semibold">📋 Audit Logs</div>
              <div className="text-sm text-gray-600">View system logs</div>
            </a>
            <a href="/admin/system-ops" className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="text-lg font-semibold">⚡ System Operations</div>
              <div className="text-sm text-gray-600">Maintenance tasks</div>
            </a>
            <a href="/admin/email-config" className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="text-lg font-semibold">📧 Email Configuration</div>
              <div className="text-sm text-gray-600">SMTP settings</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  
  if (!session || session.user?.role !== 'ADMIN') {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  return {
    props: {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      },
    },
  }
}
