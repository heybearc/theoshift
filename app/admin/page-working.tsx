import { getSession } from '../../auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminDashboard() {
  const session = await getSession();
  
  if (!session || !session.user) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <div className="text-sm text-gray-600">
                Welcome, {session.user.name} ({session.user.email})
              </div>
            </div>

            {/* Admin Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <Link 
                href="/admin/audit" 
                className="block p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Audit & Logging</h3>
                <p className="text-blue-700">View system audit logs and user activity</p>
              </Link>

              <Link 
                href="/admin/reports" 
                className="block p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              >
                <h3 className="text-lg font-semibold text-green-900 mb-2">Administrative Reports</h3>
                <p className="text-green-700">Generate and view administrative reports</p>
              </Link>

              <Link 
                href="/admin/users" 
                className="block p-6 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <h3 className="text-lg font-semibold text-purple-900 mb-2">User Management</h3>
                <p className="text-purple-700">Manage users, roles, and permissions</p>
              </Link>

              <Link 
                href="/admin/roles" 
                className="block p-6 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Role Management</h3>
                <p className="text-yellow-700">Configure roles and access levels</p>
              </Link>

              <Link 
                href="/admin/settings" 
                className="block p-6 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <h3 className="text-lg font-semibold text-red-900 mb-2">System Configuration</h3>
                <p className="text-red-700">Configure system settings and preferences</p>
              </Link>

              <Link 
                href="/admin/email-config" 
                className="block p-6 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <h3 className="text-lg font-semibold text-indigo-900 mb-2">Email Configuration</h3>
                <p className="text-indigo-700">Configure email settings and templates</p>
              </Link>
            </div>

            {/* System Status */}
            <div className="border-t pt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">System Status</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Authentication</h3>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      ✅ NextAuth Working
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Database</h3>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      ✅ Connected
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">User Session</h3>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      ✅ Authenticated
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-8 flex justify-between">
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                ← Back to Dashboard
              </Link>
              <Link
                href="/api/auth/signout"
                className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Sign Out
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
