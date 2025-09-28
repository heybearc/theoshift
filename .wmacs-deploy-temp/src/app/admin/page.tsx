'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SystemStats {
  totalUsers: number;
  totalEvents: number;
  totalAttendants: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  apiStatus: 'operational' | 'degraded' | 'down';
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalEvents: 0,
    totalAttendants: 0,
    systemHealth: 'healthy',
    apiStatus: 'operational'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      // Fetch basic stats from existing APIs
      const [usersRes, eventsRes, attendantsRes] = await Promise.all([
        fetch('/api/users').catch(() => ({ ok: false })),
        fetch('/api/events').catch(() => ({ ok: false })),
        fetch('/api/attendants').catch(() => ({ ok: false }))
      ]);

      let totalUsers = 0;
      let totalEvents = 0;
      let totalAttendants = 0;

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        totalUsers = usersData.data?.total || 0;
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        totalEvents = eventsData.data?.total || 0;
      }

      if (attendantsRes.ok) {
        const attendantsData = await attendantsRes.json();
        totalAttendants = attendantsData.data?.total || 0;
      }

      setStats({
        totalUsers,
        totalEvents,
        totalAttendants,
        systemHealth: 'healthy',
        apiStatus: 'operational'
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
      setStats(prev => ({
        ...prev,
        systemHealth: 'error',
        apiStatus: 'down'
      }));
    } finally {
      setLoading(false);
    }
  };

  const adminModules = [
    {
      name: 'User Management',
      description: 'Create, edit, and manage user accounts with role assignments',
      href: '/admin/users',
      icon: '👥',
      color: 'bg-blue-500',
      stats: `${stats.totalUsers} users`
    },
    {
      name: 'Email Configuration',
      description: 'Configure SMTP settings and manage email templates',
      href: '/admin/email-config',
      icon: '📧',
      color: 'bg-green-500',
      stats: 'Gmail SMTP'
    },
    {
      name: 'Health Monitor',
      description: 'Monitor system health, database status, and performance',
      href: '/admin/health-monitor',
      icon: '🏥',
      color: 'bg-yellow-500',
      stats: stats.systemHealth
    },
    {
      name: 'API Status',
      description: 'Monitor API endpoints, response times, and error rates',
      href: '/admin/api-status',
      icon: '🔌',
      color: 'bg-purple-500',
      stats: stats.apiStatus
    },
    {
      name: 'Security Audit',
      description: 'View security logs, user activity, and system access',
      href: '/admin/security',
      icon: '🔒',
      color: 'bg-red-500',
      stats: 'Audit logs'
    }
  ];

  const quickActions = [
    { name: 'Create New User', href: '/admin/users/new', icon: '➕' },
    { name: 'Send Invitations', href: '/admin/users/bulk', icon: '📨' },
    { name: 'Test Email Config', href: '/admin/email-config', icon: '🧪' },
    { name: 'View System Logs', href: '/admin/security', icon: '📋' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg text-gray-600">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Admin Panel
        </h1>
        <p className="text-gray-600">
          Complete administrative control for JW Attendant Scheduler
        </p>
        <div className="mt-4 flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span>System Status: {stats.systemHealth}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            <span>API Status: {stats.apiStatus}</span>
          </div>
        </div>
      </div>

      {/* System Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalEvents}</p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Attendants</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalAttendants}</p>
            </div>
            <div className="text-4xl">🎯</div>
          </div>
        </div>
      </div>

      {/* Admin Modules */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminModules.map((module) => (
            <Link
              key={module.name}
              href={module.href}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-gray-200 hover:border-blue-500"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${module.color} rounded-lg flex items-center justify-center text-white text-2xl`}>
                  {module.icon}
                </div>
                <span className="text-sm text-gray-500">{module.stats}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {module.name}
              </h3>
              <p className="text-gray-600 text-sm">
                {module.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                className="flex flex-col items-center space-y-2 p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <span className="text-2xl">{action.icon}</span>
                <span className="text-sm font-medium text-gray-900 text-center">
                  {action.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-4">📋</div>
            <p>Activity logging will be available once the Security Audit module is implemented.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
