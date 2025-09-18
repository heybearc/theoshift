import { getServerSession } from 'next-auth/next'
import { authConfig } from '../../../auth.config'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface SystemSetting {
  id: string
  category: string
  name: string
  value: string
  description: string
  type: 'text' | 'number' | 'boolean' | 'select'
  options?: string[]
}

export default async function SystemSettingsPage() {
  // Server-side authentication check
  const session = await getServerSession(authConfig)

  if (!session || !session.user) {
    redirect('/auth/signin')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/unauthorized')
  }

  // Mock settings data
  const settings: SystemSetting[] = [
    {
      id: '1',
      category: 'General',
      name: 'Organization Name',
      value: 'JW Attendant Scheduler',
      description: 'The name of your organization displayed throughout the system',
      type: 'text'
    },
    {
      id: '2',
      category: 'General',
      name: 'Time Zone',
      value: 'America/New_York',
      description: 'Default time zone for the application',
      type: 'select',
      options: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles']
    },
    {
      id: '3',
      category: 'Security',
      name: 'Session Timeout',
      value: '30',
      description: 'Session timeout in minutes',
      type: 'number'
    },
    {
      id: '4',
      category: 'Security',
      name: 'Require Two-Factor Auth',
      value: 'false',
      description: 'Require two-factor authentication for all users',
      type: 'boolean'
    },
    {
      id: '5',
      category: 'Notifications',
      name: 'Email Notifications',
      value: 'true',
      description: 'Enable email notifications for system events',
      type: 'boolean'
    },
    {
      id: '6',
      category: 'Notifications',
      name: 'SMTP Server',
      value: 'smtp.gmail.com',
      description: 'SMTP server for sending emails',
      type: 'text'
    },
    {
      id: '7',
      category: 'Backup',
      name: 'Auto Backup',
      value: 'true',
      description: 'Automatically backup database daily',
      type: 'boolean'
    },
    {
      id: '8',
      category: 'Backup',
      name: 'Backup Retention Days',
      value: '30',
      description: 'Number of days to keep backup files',
      type: 'number'
    }
  ]

  // Group settings by category
  const settingsByCategory = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = []
    }
    acc[setting.category].push(setting)
    return acc
  }, {} as Record<string, SystemSetting[]>)

  const renderSettingInput = (setting: SystemSetting) => {
    switch (setting.type) {
      case 'boolean':
        return (
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="true" selected={setting.value === 'true'}>Enabled</option>
            <option value="false" selected={setting.value === 'false'}>Disabled</option>
          </select>
        )
      case 'number':
        return (
          <input
            type="number"
            defaultValue={setting.value}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )
      case 'select':
        return (
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            {setting.options?.map((option) => (
              <option key={option} value={option} selected={setting.value === option}>
                {option}
              </option>
            ))}
          </select>
        )
      default:
        return (
          <input
            type="text"
            defaultValue={setting.value}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">System Configuration</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Configure system settings and preferences
                </p>
              </div>
              <div className="flex space-x-3">
                <Link
                  href="/admin"
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Back to Admin
                </Link>
                <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                  Save All Changes
                </button>
              </div>
            </div>

            {/* Settings Categories */}
            <div className="space-y-8">
              {Object.entries(settingsByCategory).map(([category, categorySettings]) => (
                <div key={category} className="border border-gray-200 rounded-lg">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">{category} Settings</h2>
                  </div>
                  <div className="p-6 space-y-6">
                    {categorySettings.map((setting) => (
                      <div key={setting.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {setting.name}
                          </label>
                          <p className="text-xs text-gray-500">{setting.description}</p>
                        </div>
                        <div className="md:col-span-2">
                          {renderSettingInput(setting)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* System Information */}
            <div className="mt-8 border-t pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">System Information</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Application Version</h3>
                    <p className="text-sm text-gray-900">v1.0.0-nextauth</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Database Version</h3>
                    <p className="text-sm text-gray-900">PostgreSQL 15.4</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Last Backup</h3>
                    <p className="text-sm text-gray-900">{new Date().toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">System Status</h3>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Operational
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-8 border-t pt-8">
              <h2 className="text-xl font-semibold text-red-900 mb-4">Danger Zone</h2>
              <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-medium text-red-900">Reset System Settings</h3>
                    <p className="text-sm text-red-700 mt-1">
                      This will reset all system settings to their default values. This action cannot be undone.
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                    Reset Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
