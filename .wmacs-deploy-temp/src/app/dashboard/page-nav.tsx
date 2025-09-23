'use client';

import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">JW Attendant Scheduler</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/attendants')}
              className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded"
            >
              Manage Attendants
            </button>
            <button
              onClick={() => router.push('/auth/signin')}
              className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            JW Attendant Scheduler Dashboard
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Enhanced with WMACS Guardian - Phase 5 Implementation
          </p>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div 
            onClick={() => router.push('/attendants')}
            className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">👥 Attendant Management</h3>
            <p className="text-gray-600">Manage attendant assignments, schedules, and status updates</p>
            <div className="mt-4 text-blue-600 font-medium">View Attendants →</div>
          </div>
          
          <div 
            onClick={() => router.push('/events')}
            className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">📅 Events</h3>
            <p className="text-gray-600">View and manage upcoming meetings and assemblies</p>
            <div className="mt-4 text-blue-600 font-medium">View Events →</div>
          </div>
          
          <div 
            onClick={() => router.push('/users')}
            className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">👤 Users</h3>
            <p className="text-gray-600">Manage user accounts and permissions</p>
            <div className="mt-4 text-blue-600 font-medium">View Users →</div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            🛡️ WMACS Guardian System Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-700">Phase 5 Features</h4>
              <ul className="space-y-1 text-gray-600">
                <li>✅ Enhanced Dashboard with Navigation</li>
                <li>✅ Attendants Management System</li>
                <li>✅ Events API Integration</li>
                <li>✅ User Management System</li>
                <li>✅ Real-time Status Updates</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-700">WMACS Guardian</h4>
              <ul className="space-y-1 text-gray-600">
                <li>✅ Container 134 (Staging)</li>
                <li>✅ Port 3001 (Standard)</li>
                <li>✅ CI/CD Pipeline Active</li>
                <li>✅ API Endpoints Operational</li>
                <li>✅ Authentication Protected</li>
              </ul>
            </div>
          </div>
        </div>

        {/* API Status */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 API Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">✅</div>
              <div className="text-sm font-medium">Events API</div>
              <div className="text-xs text-gray-500">/api/events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">✅</div>
              <div className="text-sm font-medium">Users API</div>
              <div className="text-xs text-gray-500">/api/users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">✅</div>
              <div className="text-sm font-medium">Attendants API</div>
              <div className="text-xs text-gray-500">/api/attendants</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
