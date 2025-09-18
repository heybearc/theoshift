'use client'

import { useAuth } from '../../providers'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface SystemSettings {
  maintenanceMode: boolean
  allowRegistration: boolean
  requireEmailVerification: boolean
  sessionTimeout: number
  maxLoginAttempts: number
  passwordMinLength: number
  enableAuditLogging: boolean
  autoBackupEnabled: boolean
  backupRetentionDays: number
  systemName: string
  organizationName: string
  supportEmail: string
  defaultUserRole: string
}

export default function SystemSettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    allowRegistration: false,
    requireEmailVerification: true,
    sessionTimeout: 480, // 8 hours in minutes
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    enableAuditLogging: true,
    autoBackupEnabled: false,
    backupRetentionDays: 30,
    systemName: 'JW Attendant Scheduler',
    organizationName: 'Congregation',
    supportEmail: 'support@congregation.org',
    defaultUserRole: 'ATTENDANT'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    if (authLoading) return
    
    if (!user || user.role !== 'ADMIN') {
      router.push('/unauthorized')
      return
    }

    // TODO: Fetch actual settings from API
    setLoading(false)
  }, [user, authLoading, router])

  const handleSave = async () => {
    setSaving(true)
    
    try {
      // TODO: Implement settings API
      console.log('Saving settings:', settings)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const toggleMaintenanceMode = () => {
    if (!settings.maintenanceMode) {
      if (confirm('Enable maintenance mode? This will prevent all users except admins from accessing the system.')) {
        setSettings({ ...settings, maintenanceMode: true })
      }
    } else {
      setSettings({ ...settings, maintenanceMode: false })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'email', name: 'Email & Notifications', icon: '📧' },
    { id: 'backup', name: 'Backup & Maintenance', icon: '💾' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">System Settings</h1>
            <Link
              href="/admin"
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Admin
            </Link>
          </div>

          {settings.maintenanceMode && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
              <h3 className="font-semibold text-red-800">🚨 Maintenance Mode Active</h3>
              <p className="text-red-700">
                The system is currently in maintenance mode. Only administrators can access the application.
              </p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Name
                  </label>
                  <input
                    type="text"
                    value={settings.systemName}
                    onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={settings.organizationName}
                    onChange={(e) => setSettings({ ...settings, organizationName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default User Role
                  </label>
                  <select
                    value={settings.defaultUserRole}
                    onChange={(e) => setSettings({ ...settings, defaultUserRole: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ATTENDANT">Attendant</option>
                    <option value="KEYMAN">Keyman</option>
                    <option value="ASSISTANT_OVERSEER">Assistant Overseer</option>
                    <option value="OVERSEER">Overseer</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.allowRegistration}
                    onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                    className="mr-3"
                  />
                  <span className="text-sm font-medium text-gray-700">Allow user self-registration</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.requireEmailVerification}
                    onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
                    className="mr-3"
                  />
                  <span className="text-sm font-medium text-gray-700">Require email verification for new accounts</span>
                </label>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="30"
                    max="1440"
                  />
                  <p className="text-xs text-gray-500 mt-1">30 minutes to 24 hours</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="3"
                    max="10"
                  />
                  <p className="text-xs text-gray-500 mt-1">3 to 10 attempts before lockout</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Password Length
                  </label>
                  <input
                    type="number"
                    value={settings.passwordMinLength}
                    onChange={(e) => setSettings({ ...settings, passwordMinLength: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="6"
                    max="20"
                  />
                  <p className="text-xs text-gray-500 mt-1">6 to 20 characters</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.enableAuditLogging}
                    onChange={(e) => setSettings({ ...settings, enableAuditLogging: e.target.checked })}
                    className="mr-3"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable audit logging</span>
                </label>
              </div>
            </div>
          )}

          {/* Email & Notifications */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 className="font-semibold text-blue-800">Email Configuration</h3>
                <p className="text-blue-700 text-sm">
                  Email settings are managed in the Email Configuration module.
                </p>
                <Link
                  href="/admin/email-config"
                  className="inline-block mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                >
                  Configure Email Settings
                </Link>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Notification Preferences (Coming Soon)</h3>
                <div className="text-gray-500">
                  <p>Future notification settings will include:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Assignment reminder emails</li>
                    <li>Event notification preferences</li>
                    <li>System maintenance alerts</li>
                    <li>User activity notifications</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Backup & Maintenance */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-red-800">Maintenance Mode</h3>
                    <p className="text-red-700 text-sm">
                      {settings.maintenanceMode 
                        ? 'System is currently in maintenance mode'
                        : 'System is available to all users'
                      }
                    </p>
                  </div>
                  <button
                    onClick={toggleMaintenanceMode}
                    className={`px-4 py-2 rounded text-sm font-medium ${
                      settings.maintenanceMode
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {settings.maintenanceMode ? 'Disable Maintenance' : 'Enable Maintenance'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Backup Retention (days)
                  </label>
                  <input
                    type="number"
                    value={settings.backupRetentionDays}
                    onChange={(e) => setSettings({ ...settings, backupRetentionDays: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="7"
                    max="365"
                  />
                  <p className="text-xs text-gray-500 mt-1">7 to 365 days</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.autoBackupEnabled}
                    onChange={(e) => setSettings({ ...settings, autoBackupEnabled: e.target.checked })}
                    className="mr-3"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable automatic backups</span>
                </label>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">System Actions (Coming Soon)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed"
                  >
                    Create Manual Backup
                  </button>
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed"
                  >
                    Clear System Cache
                  </button>
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed"
                  >
                    Export System Data
                  </button>
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed"
                  >
                    View System Logs
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Changes will take effect immediately after saving.
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
