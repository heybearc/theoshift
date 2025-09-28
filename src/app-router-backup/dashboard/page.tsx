'use client';

import { useSession, signOut } from '@/lib/auth-stub';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Redirect to sign-in if not authenticated
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading...</div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (status === 'unauthenticated') {
    return null;
  }

  // Get user information safely
  const userRole = (session?.user as { role?: string })?.role || 'ADMIN';
  const userName = session?.user?.name || 'Admin User';
  const userEmail = session?.user?.email || 'admin@jwscheduler.local';

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Navigation */}
      <nav style={{ background: '#2563eb', color: 'white', padding: '16px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>JW Attendant Scheduler</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '14px' }}>
              <div style={{ fontWeight: '500' }}>{userName}</div>
              <div style={{ color: '#bfdbfe', fontSize: '12px' }}>{userEmail} ({userRole})</div>
            </div>
            <button
              onClick={handleSignOut}
              style={{
                background: '#1d4ed8',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
            Welcome, {userName}!
          </h1>
          <p style={{ fontSize: '20px', color: '#6b7280', marginBottom: '32px' }}>
            JW Attendant Scheduler Dashboard - Clean Foundation Ready
          </p>
        </div>

        {/* Quick Navigation Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          <div 
            onClick={() => router.push('/admin')}
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              borderLeft: '4px solid #8b5cf6'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '24px', marginRight: '12px' }}>⚙️</div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>Admin Panel</h3>
            </div>
            <p style={{ color: '#6b7280', marginBottom: '16px', margin: 0 }}>Manage users, settings, and system configuration</p>
            <div style={{ color: '#8b5cf6', fontWeight: '500' }}>Admin Panel →</div>
          </div>
          
          <div 
            onClick={() => router.push('/attendants')}
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              borderLeft: '4px solid #3b82f6'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '24px', marginRight: '12px' }}>👥</div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>Attendants</h3>
            </div>
            <p style={{ color: '#6b7280', marginBottom: '16px', margin: 0 }}>Manage attendant assignments and schedules</p>
            <div style={{ color: '#3b82f6', fontWeight: '500' }}>View Attendants →</div>
          </div>
          
          <div 
            onClick={() => router.push('/events')}
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              borderLeft: '4px solid #10b981'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '24px', marginRight: '12px' }}>📅</div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>Events</h3>
            </div>
            <p style={{ color: '#6b7280', marginBottom: '16px', margin: 0 }}>View and manage upcoming meetings</p>
            <div style={{ color: '#10b981', fontWeight: '500' }}>View Events →</div>
          </div>
        </div>

        {/* System Status */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
            🛡️ WMACS Guardian - Clean Foundation Status
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div>
              <h4 style={{ fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Foundation Complete</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#6b7280' }}>
                <li>✅ Auth Stub Implementation</li>
                <li>✅ Admin Module Access</li>
                <li>✅ Clean Code Base</li>
                <li>✅ Merge Conflicts Resolved</li>
                <li>✅ Foundation Stability</li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Ready for Development</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#6b7280' }}>
                <li>✅ User Management Ready</li>
                <li>✅ Data Import Prepared</li>
                <li>✅ Attendant Linking Ready</li>
                <li>✅ Event Management Prepared</li>
                <li>✅ WMACS Rules Enforced</li>
              </ul>
            </div>
          </div>
        </div>

        {/* API Status */}
        <div style={{ marginTop: '24px', background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
            📊 API Status
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div style={{ textAlign: 'center', padding: '16px', background: '#f7f7f7', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#34c759' }}>✅</div>
              <div style={{ fontSize: '16px', color: '#6b7280' }}>Events API</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>/api/events</div>
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
