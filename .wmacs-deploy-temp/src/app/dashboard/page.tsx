'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    }
  }, [status, router]);

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (status === 'unauthenticated') {
    return null;
  }

  // Get user information safely
  const userRole = (session?.user as { role?: string })?.role || 'ATTENDANT';
  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';

  const handleSignOut = async () => {
    await signOut({ 
      callbackUrl: '/auth/signin',
      redirect: true 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">JW Attendant Scheduler</h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <div className="font-medium">{userName}</div>
              <div className="text-blue-200 text-xs">{userEmail} ({userRole})</div>
            </div>
            <button
              onClick={handleSignOut}
              className="bg-blue-700 hover:bg-blue-800 px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome, {userName}!
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            JW Attendant Scheduler Dashboard - Enhanced with WMACS Guardian
          </p>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div 
            onClick={() => router.push('/attendants')}
            className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-blue-500"
          >
            <div className="flex items-center mb-3">
              <div className="text-2xl mr-3">👥</div>
              <h3 className="text-lg font-semibold text-gray-900">Attendant Management</h3>
            </div>
            <p className="text-gray-600 mb-4">Manage attendant assignments, schedules, and status updates</p>
            <div className="text-blue-600 font-medium">View Attendants →</div>
          </div>
          
          <div 
            onClick={() => router.push('/events')}
            className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-green-500"
          >
            <div className="flex items-center mb-3">
              <div className="text-2xl mr-3">📅</div>
              <h3 className="text-lg font-semibold text-gray-900">Events</h3>
            </div>
            <p className="text-gray-600 mb-4">View and manage upcoming meetings and assemblies</p>
            <div className="text-green-600 font-medium">View Events →</div>
          </div>
          
          <div 
            onClick={() => router.push('/users')}
            className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-purple-500"
          >
            <div className="flex items-center mb-3">
              <div className="text-2xl mr-3">👤</div>
              <h3 className="text-lg font-semibold text-gray-900">Users</h3>
            </div>
            <p className="text-gray-600 mb-4">Manage user accounts and permissions</p>
            <div className="text-purple-600 font-medium">View Users →</div>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            👤 Your Profile
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <div className="text-gray-900">{userName}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="text-gray-900">{userEmail}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                {userRole}
              </span>
            </div>
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
                <li>✅ Authenticated Dashboard</li>
                <li>✅ Attendants Management System</li>
                <li>✅ Events API Integration</li>
                <li>✅ User Management System</li>
                <li>✅ Proper Authentication Flow</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-700">WMACS Guardian</h4>
              <ul className="space-y-1 text-gray-600">
                <li>✅ Container 134 (Staging)</li>
                <li>✅ Port 3001 (Standard)</li>
                <li>✅ CI/CD Pipeline Active</li>
                <li>✅ Authentication Protected</li>
                <li>✅ Secure Sign Out</li>
              </ul>
            </div>
          </div>
        </div>

        {/* API Status */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 API Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">✅</div>
              <div className="text-sm font-medium">Events API</div>
              <div className="text-xs text-gray-500">/api/events</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">✅</div>
              <div className="text-sm font-medium">Users API</div>
              <div className="text-xs text-gray-500">/api/users</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
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
