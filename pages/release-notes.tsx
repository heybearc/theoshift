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
        date: typeof data.date === 'string' ? data.date : data.date?.toISOString?.()?.split('T')[0] || '',
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
