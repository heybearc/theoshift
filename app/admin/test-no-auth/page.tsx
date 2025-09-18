// Test page without authentication to verify admin pages render correctly
import Link from 'next/link'

export default function TestNoAuthPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">🧪 Admin Test Page (No Auth)</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Testing admin pages without authentication
                </p>
              </div>
              <Link
                href="/admin"
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Back to Admin
              </Link>
            </div>

            {/* Test Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <Link href="/admin/audit" className="block p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">🔍 Audit & Logging</h3>
                <p className="text-blue-700">Test audit page rendering</p>
              </Link>

              <Link href="/admin/reports" className="block p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                <h3 className="text-lg font-semibold text-green-900 mb-2">📊 Administrative Reports</h3>
                <p className="text-green-700">Test reports page rendering</p>
              </Link>

              <Link href="/admin/users" className="block p-6 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">👥 User Management</h3>
                <p className="text-purple-700">Test users page rendering</p>
              </Link>

              <Link href="/admin/roles" className="block p-6 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">🔐 Role Management</h3>
                <p className="text-yellow-700">Test roles page rendering</p>
              </Link>

              <Link href="/admin/settings" className="block p-6 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                <h3 className="text-lg font-semibold text-red-900 mb-2">⚙️ System Configuration</h3>
                <p className="text-red-700">Test settings page rendering</p>
              </Link>

              <Link href="/admin/email-config" className="block p-6 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors">
                <h3 className="text-lg font-semibold text-indigo-900 mb-2">📧 Email Configuration</h3>
                <p className="text-indigo-700">Test email config page rendering</p>
              </Link>
            </div>

            {/* System Status */}
            <div className="border-t pt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🔧 System Status</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">NextAuth Status</h3>
                    <p className="text-sm text-gray-900">Testing without authentication</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Database Status</h3>
                    <p className="text-sm text-gray-900">Connection test needed</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Admin Pages</h3>
                    <p className="text-sm text-gray-900">Server components refactored</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Back Buttons</h3>
                    <p className="text-sm text-gray-900">Testing navigation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
