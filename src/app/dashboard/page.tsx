// Pure Server-Side Rendering Dashboard
import { redirect } from 'next/navigation'
import { getSession } from '@/auth'

export default async function Dashboard() {
  const session = await getSession()
  
  if (!session) {
    redirect('/api/auth/signin')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="text-sm text-gray-600">
            Welcome, {session.user?.name || session.user?.email}
          </div>
        </div>

        {/* Simple SSR Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Server-Side Rendered</h3>
            <p className="text-2xl font-bold text-green-600">✓ Working</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">No Client JS</h3>
            <p className="text-2xl font-bold text-blue-600">✓ Pure SSR</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Authentication</h3>
            <p className="text-2xl font-bold text-purple-600">✓ NextAuth</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Port</h3>
            <p className="text-2xl font-bold text-orange-600">3001</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <a
              href="/api/auth/signout"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Sign Out
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
