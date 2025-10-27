import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]'
import HelpLayout from '../components/HelpLayout'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'

interface Release {
  version: string
  date: string
  type: string
  title: string
  description: string
  content: string
}

interface ReleaseNotesProps {
  releases: Release[]
}

export default function ReleaseNotes({ releases }: ReleaseNotesProps) {
  const oldReleases = [
    {
      version: 'v2.2.1',
      date: '2025-10-27',
      type: 'patch',
      title: 'Critical Bug Fixes & Health Monitoring',
      description: 'Critical bug fixes for assignment operations and new health monitoring endpoint',
      features: [
        '🏥 Health Check Endpoint - New /api/health endpoint for MCP multi-app orchestration',
        '📊 Application Monitoring - Returns app status, database connectivity, and basic stats',
        '🔌 Future-Ready API - /api/events/[id]/positions endpoint for client-side state management'
      ],
      fixes: [
        '🐛 Fixed 500 Internal Server Error when removing attendant from assignment',
        '🐛 Fixed 500 Internal Server Error when adding attendant to assignment',
        '🔧 Corrected Prisma schema relationship from "position" to "positions"',
        '📋 Fixed attendant dashboard position data loading',
        '⚡ Updated all position relationship references across API endpoints'
      ],
      breaking: [],
      notes: [
        'All Prisma includes updated to use correct relationship name',
        'Health endpoint compatible with MCP server orchestration',
        'Fully backward compatible - no breaking changes'
      ]
    },
    {
      version: 'v2.2.0',
      date: '2025-10-25',
      type: 'minor',
      title: 'Event Announcements System',
      description: 'New announcement system for event communication with attendants',
      features: [
        '📢 Event Announcements - Create and manage announcements for events',
        '🎨 Announcement Types - INFO, WARNING, and URGENT priority levels',
        '📅 Date Range Support - Schedule announcements with start/end dates',
        '👁️ Attendant Dashboard Integration - Announcements display automatically',
        '✖️ Dismissible Banners - Attendants can dismiss announcements',
        '🎯 Permission-Based Management - Only admins/overseers can create announcements',
        '🌐 Timezone-Aware Display - Proper date handling across timezones'
      ],
      fixes: [
        '🔧 Fixed attendant authentication for viewing announcements',
        '📅 Corrected date display timezone issues using date-fns',
        '🔐 Improved API authentication for attendant sessions'
      ],
      breaking: [],
      notes: [
        'Announcements appear on attendant dashboard when active and within date range',
        'Admins and overseers can manage announcements from event detail page',
        'Announcement data stored in shared database'
      ]
    },
    {
      version: 'v2.1.2',
      date: '2025-10-22',
      type: 'minor',
      title: 'Blue-Green Deployment & Production Stability',
      description: 'Implemented blue-green deployment strategy with enhanced version management',
      features: [
        '🔄 Blue-Green Deployment - Zero-downtime deployment architecture',
        '📊 Version Display - Real-time version visibility in UI footer',
        '🎯 Version API Endpoint - Programmatic version checking at /api/version',
        '🛡️ Production Database Isolation - Separate prod/staging databases',
        '⚡ Enhanced Environment Management - Proper .env configuration handling'
      ],
      fixes: [
        '🔧 Fixed database credential management across environments',
        '⚡ Resolved .env.production override issues',
        '🛡️ Corrected password hash storage and validation'
      ],
      breaking: [],
      notes: [
        'Green environment (Container 134) now serves production traffic',
        'Blue environment (Container 132) available for development/testing',
        'Version number displayed in footer of all admin pages'
      ]
    },
    {
      version: 'v2.0.0',
      date: '2025-10-21',
      type: 'major',
      title: 'Event-Scoped Architecture & Advanced Permissions',
      description: 'Major architectural overhaul with event-scoped permissions and consolidated attendant data',
      features: [
        '🔒 Event-Scoped Permissions - Complete role-based access control per event',
        '👥 Multiple Event Owners - Support for shared event management responsibility',
        '🗄️ Consolidated Attendant Data - Single source of truth architecture',
        '⚡ Dynamic Role Management - Real-time permission editing capabilities',
        '🛡️ Enhanced Security - Privacy by design with event-scoped data isolation',
        '🎯 Role-Based UI - Interface adapts to user permission levels',
        '📊 Improved Performance - Optimized queries with simplified relationships',
        '🏗️ Scalable Architecture - Foundation for advanced features',
        '📄 Document Management System - Upload, organize, and share event documents',
        '💬 Feedback System - Collect and manage user feedback with attachments',
        '🖨️ Lanyard Printing - Generate professional attendant lanyards',
        '📊 Count Sessions - Track and report attendance counts',
        '👁️ Position Oversight - Manage overseer and keyman assignments'
      ],
      fixes: [
        '🔧 Eliminated global attendant pool technical debt',
        '⚡ Optimized database queries with fewer joins',
        '🛡️ Enhanced data privacy and security',
        '📱 Improved mobile responsiveness',
        '🔄 Better error handling and validation'
      ],
      breaking: [
        '⚠️ Database schema migration required (automatic)',
        '🔄 API endpoints updated for consolidated structure',
        '🔐 Permission model completely redesigned',
        '📊 Some legacy admin functions relocated'
      ],
      notes: [
        'Zero-downtime deployment successfully completed',
        'All 173 attendant records migrated successfully',
        'Event-scoped data architecture eliminates privacy concerns',
        'Multiple OWNERS per event enable shared responsibility',
        'Foundation established for advanced role management features'
      ]
    },
    {
      version: 'v1.0.0-MVP',
      date: '2025-10-19',
      type: 'major',
      title: 'Initial MVP Release',
      description: 'First production-ready release of JW Attendant Scheduler',
      features: [
        '🔐 Complete authentication system with role-based access',
        '👥 User management with invitation system',
        '📅 Event creation and management',
        '📋 Position and assignment management',
        '⏱️ Count times recording',
        '👤 Attendant personal dashboard',
        '📧 Email notifications and invitations',
        '🛡️ Security hardening and error handling',
        '📚 Help documentation system',
        '🎨 Professional UI/UX design'
      ],
      fixes: [
        '🐛 Fixed invitation email URL generation',
        '🔧 Resolved environment variable loading issues',
        '⚡ Improved performance and stability',
        '🧹 Cleaned up unused code and files'
      ],
      breaking: [],
      notes: [
        'This is the first production release of JW Attendant Scheduler',
        'All core functionality is implemented and tested',
        'System is ready for production deployment',
        'Future updates will maintain backward compatibility'
      ]
    }
  ] // Keep for reference but not used

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'major':
        return 'bg-red-100 text-red-800'
      case 'minor':
        return 'bg-blue-100 text-blue-800'
      case 'patch':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <HelpLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📋 Release Notes</h1>
          <p className="text-gray-600">
            Stay updated with the latest features, improvements, and fixes
          </p>
        </div>

        <div className="space-y-8">
          {releases.map((release) => (
            <div key={release.version} className="bg-white border border-gray-200 rounded-lg p-6">
              {/* Release Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl font-bold text-gray-900">v{release.version}</h2>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(release.type)}`}>
                    {release.type.toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-gray-500">{release.date}</span>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">{release.title}</h3>
              <p className="text-gray-600 mb-6">{release.description}</p>

              {/* Markdown Content */}
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: release.content }}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🔔 Stay Updated</h3>
            <p className="text-gray-600 mb-4">
              Want to be notified about new releases? Contact your administrator to be added to the update notifications.
            </p>
            <div className="text-sm text-gray-500">
              <p>Last Updated: October 27, 2025</p>
            </div>
          </div>
        </div>
      </div>
    </HelpLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  // Read markdown files from release-notes directory
  const releasesDir = path.join(process.cwd(), 'release-notes')
  const filenames = fs.readdirSync(releasesDir)
  
  const releases = filenames
    .filter(f => f.endsWith('.md') && f !== 'TEMPLATE.md')
    .map(filename => {
      const filePath = path.join(releasesDir, filename)
      const fileContents = fs.readFileSync(filePath, 'utf8')
      const { data, content } = matter(fileContents)
      
      return {
        version: data.version,
        date: data.date,
        type: data.type,
        title: data.title,
        description: data.description,
        content: marked(content)
      }
    })
    .sort((a, b) => {
      // Sort by version number (descending)
      const versionA = a.version.replace(/[^0-9.]/g, '')
      const versionB = b.version.replace(/[^0-9.]/g, '')
      return versionB.localeCompare(versionA, undefined, { numeric: true })
    })

  return {
    props: {
      releases
    },
  }
}
