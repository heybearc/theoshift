import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import AdminLayout from '../../components/AdminLayout'
import Link from 'next/link'

interface AdminDashboardProps {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
  stats: {
    totalUsers: number
    totalEvents: number
    activeSessions: number
  }
  userLastSeenVersion?: string | null
}

export default function AdminDashboard({ user, stats, userLastSeenVersion }: AdminDashboardProps) {
  const adminModules = [
    {
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      href: '/admin/users',
      icon: '👥',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Health Monitor',
      description: 'System health and performance metrics',
      href: '/admin/health',
      icon: '💚',
      color: 'bg-green-50 hover:bg-green-100 border-green-200',
      iconColor: 'text-green-600'
    },
    {
      title: 'API Status',
      description: 'Monitor API endpoints and services',
      href: '/admin/api-status',
      icon: '📊',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Audit Logs',
      description: 'View system activity and audit trails',
      href: '/admin/audit-logs',
      icon: '📋',
      color: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200',
      iconColor: 'text-yellow-600'
    },
    {
      title: 'System Operations',
      description: 'Database and system maintenance tasks',
      href: '/admin/system-ops',
      icon: '⚡',
      color: 'bg-red-50 hover:bg-red-100 border-red-200',
      iconColor: 'text-red-600'
    },
    {
      title: 'Email Configuration',
      description: 'SMTP settings and email templates',
      href: '/admin/email-config',
      icon: '📧',
      color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
      iconColor: 'text-indigo-600'
    },
    {
      title: 'Session Management',
      description: 'Monitor and manage active user sessions',
      href: '/admin/sessions',
      icon: '🔐',
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
      iconColor: 'text-orange-600'
    },
    {
      title: 'Department Templates',
      description: 'Manage volunteer department templates',
      href: '/admin/departments',
      icon: '🏢',
      color: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200',
      iconColor: 'text-cyan-600'
    }
  ]

  return (
    <AdminLayout title="Admin Dashboard" userLastSeenVersion={userLastSeenVersion}>
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white mb-8">
        <h2 className="text-2xl font-bold mb-2">Welcome back, {user.name}!</h2>
        <p className="text-blue-100">
          Theocratic Shift Scheduler Admin Portal - Stable Next.js 14.2.33 with Pages Router
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              <p className="text-sm text-gray-600">Total Users</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <span className="text-2xl">📅</span>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
              <p className="text-sm text-gray-600">Total Events</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-50 rounded-lg">
              <span className="text-2xl">🎫</span>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers + stats.totalEvents}</p>
              <p className="text-sm text-gray-600">Total Records</p>
            </div>
          </div>
        </div>
        
        <Link href="/admin/sessions">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center">
              <div className="p-2 bg-orange-50 rounded-lg">
                <span className="text-2xl">🔐</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.activeSessions}</p>
                <p className="text-sm text-gray-600">Active Sessions</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Admin Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminModules.map((module) => (
          <Link key={module.href} href={module.href}>
            <div className={`${module.color} border-2 rounded-lg p-6 transition-all duration-200 hover:shadow-md cursor-pointer`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <span className="text-2xl mr-3">{module.icon}</span>
                    <h3 className={`text-lg font-semibold ${module.iconColor}`}>
                      {module.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {module.description}
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AdminLayout>
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

  // Get database statistics
  const { prisma } = require('../../src/lib/prisma')
  
  try {
    // Check if user_activity table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_activity'
      );
    `
    
    let activeSessions = 0
    if (tableExists && (tableExists as any)[0]?.exists) {
      activeSessions = await prisma.user_activity.count({
        where: {
          isActive: true
        }
      })
    }

    const [totalUsers, totalEvents, currentUser] = await Promise.all([
      prisma.users.count(),
      prisma.events.count(),
      prisma.users.findUnique({
        where: { email: session.user.email },
        select: { lastSeenReleaseVersion: true }
      })
    ])

    return {
      props: {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
        },
        stats: {
          totalUsers,
          totalEvents,
          activeSessions,
        },
        userLastSeenVersion: currentUser?.lastSeenReleaseVersion || null,
      },
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    
    // Return default stats if database query fails
    return {
      props: {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
        },
        stats: {
          totalUsers: 0,
          totalEvents: 0,
          activeSessions: 0,
        },
        userLastSeenVersion: null,
      },
    }
  }
}
