import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import AdminLayout from '../../../components/AdminLayout'
import { useState, useEffect } from 'react'

export default function EmailConfigPage() {
  const [authType, setAuthType] = useState<'smtp' | 'gmail'>('gmail')
  const [config, setConfig] = useState({
    // Gmail App Password Configuration
    gmailEmail: '',
    gmailAppPassword: '',
    
    // Generic SMTP Configuration
    smtpServer: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: true,
    
    // Common Settings
    fromEmail: '',
    fromName: 'Theocratic Shift Scheduler',
    replyToEmail: ''
  })

  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Load configuration on component mount
  useEffect(() => {
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/email-config')
      const data = await response.json()

      if (data.success && data.data) {
        setAuthType(data.data.authType || 'gmail')
        setConfig(data.data.config || {
          gmailEmail: '',
          gmailAppPassword: '',
          smtpServer: 'smtp.gmail.com',
          smtpPort: '587',
          smtpUser: '',
          smtpPassword: '',
          smtpSecure: true,
          fromEmail: '',
          fromName: 'Theocratic Shift Scheduler',
          replyToEmail: ''
        })
      }
    } catch (error) {
      console.error('Error loading email configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setStatus('idle')
    
    try {
      const response = await fetch('/api/admin/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authType, config })
      })

      const data = await response.json()
      
      if (data.success) {
        setStatus('success')
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        throw new Error(data.error || 'Failed to save configuration')
      }
    } catch (error) {
      console.error('Error saving configuration:', error)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    
    try {
      const response = await fetch('/api/admin/email-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authType, config })
      })

      const data = await response.json()
      
      if (data.success) {
        alert('✅ Test email sent successfully!')
      } else {
        throw new Error(data.error || 'Failed to send test email')
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      alert('❌ Failed to send test email. Please check your configuration.')
    } finally {
      setTesting(false)
    }
  }

  const isGmailConfigValid = authType === 'gmail' && config.gmailEmail && config.gmailAppPassword
  const isSmtpConfigValid = authType === 'smtp' && config.smtpServer && config.smtpUser && config.smtpPassword
  const isConfigValid = (isGmailConfigValid || isSmtpConfigValid) && config.fromEmail && config.fromName

  if (loading) {
    return (
      <AdminLayout title="Email Configuration" breadcrumbs={[{ label: 'Email Configuration' }]}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading email configuration...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Email Configuration" breadcrumbs={[{ label: 'Email Configuration' }]}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">SMTP settings and email templates</p>
          <button onClick={handleTest} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
            📧 Send Test Email
          </button>
        </div>

        {/* Authentication Type Selector */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Provider</h3>
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setAuthType('gmail')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                authType === 'gmail'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📧 Gmail (Recommended)
            </button>
            <button
              onClick={() => setAuthType('smtp')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                authType === 'smtp'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🔧 Custom SMTP
            </button>
          </div>

          {authType === 'gmail' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">💡</span>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800">Gmail App Password Setup</h4>
                    <div className="mt-2 text-sm text-blue-700">
                      <p className="mb-2">To use Gmail, you need to generate an App Password:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Go to your Google Account settings</li>
                        <li>Enable 2-Step Verification if not already enabled</li>
                        <li>Go to Security → App passwords</li>
                        <li>Generate a new app password for "Mail"</li>
                        <li>Use that 16-character password below</li>
                      </ol>
                      <p className="mt-3 font-semibold text-red-700">⚠️ IMPORTANT: Remove ALL spaces from the app password!</p>
                      <p className="text-xs">Gmail shows: "abcd efgh ijkl mnop" → Enter: "abcdefghijklmnop"</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gmail Email Address *
                  </label>
                  <input
                    type="email"
                    placeholder="your-email@gmail.com"
                    value={config.gmailEmail}
                    onChange={(e) => setConfig({...config, gmailEmail: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gmail App Password *
                  </label>
                  <input
                    type="password"
                    placeholder="16-character app password (no spaces)"
                    value={config.gmailAppPassword}
                    onChange={(e) => setConfig({...config, gmailAppPassword: e.target.value.replace(/\s/g, '')})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-red-600 mt-1 font-medium">⚠️ Spaces will be automatically removed</p>
                </div>
              </div>
            </div>
          )}

          {authType === 'smtp' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Server *</label>
                <input
                  type="text"
                  placeholder="smtp.example.com"
                  value={config.smtpServer}
                  onChange={(e) => setConfig({...config, smtpServer: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port *</label>
                <select
                  value={config.smtpPort}
                  onChange={(e) => setConfig({...config, smtpPort: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="587">587 (STARTTLS)</option>
                  <option value="465">465 (SSL)</option>
                  <option value="25">25 (Plain)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                <input
                  type="text"
                  placeholder="username or email"
                  value={config.smtpUser}
                  onChange={(e) => setConfig({...config, smtpUser: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                <input
                  type="password"
                  placeholder="SMTP password"
                  value={config.smtpPassword}
                  onChange={(e) => setConfig({...config, smtpPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.smtpSecure}
                    onChange={(e) => setConfig({...config, smtpSecure: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Use secure connection (TLS/SSL)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Email Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Email *</label>
              <input
                type="email"
                placeholder="noreply@jwscheduler.local"
                value={config.fromEmail}
                onChange={(e) => setConfig({...config, fromEmail: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Email address that appears in "From" field</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Name *</label>
              <input
                type="text"
                placeholder="Theocratic Shift Scheduler"
                value={config.fromName}
                onChange={(e) => setConfig({...config, fromName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Display name for outgoing emails</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reply-To Email</label>
              <input
                type="email"
                placeholder="admin@jwscheduler.local (optional)"
                value={config.replyToEmail}
                onChange={(e) => setConfig({...config, replyToEmail: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Where replies should be sent (optional)</p>
            </div>
          </div>
          
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleSave}
              disabled={!isConfigValid || saving}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                !isConfigValid 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : saving
                  ? 'bg-blue-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {saving ? '⏳ Saving...' : '💾 Save Configuration'}
            </button>
            
            <button 
              onClick={handleTest}
              disabled={!isConfigValid || testing}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                !isConfigValid 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : testing
                  ? 'bg-green-400 text-white cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {testing ? '📤 Sending...' : '📧 Send Test Email'}
            </button>
            
            {status === 'success' && (
              <div className="flex items-center text-green-600">
                <span className="text-lg mr-2">✅</span>
                <span className="text-sm font-medium">Configuration saved successfully!</span>
              </div>
            )}
            
            {status === 'error' && (
              <div className="flex items-center text-red-600">
                <span className="text-lg mr-2">❌</span>
                <span className="text-sm font-medium">Failed to save configuration</span>
              </div>
            )}
          </div>
          
          {!isConfigValid && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <span className="text-yellow-600 mr-2">⚠️</span>
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">Configuration incomplete</p>
                  <p>Please fill in all required fields to enable email functionality.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Templates</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Welcome Email</div>
                <div className="text-sm text-gray-600">Sent to new users upon registration</div>
              </div>
              <button className="text-blue-600 hover:text-blue-900">✏️ Edit</button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Assignment Notification</div>
                <div className="text-sm text-gray-600">Sent when users are assigned to events</div>
              </div>
              <button className="text-blue-600 hover:text-blue-900">✏️ Edit</button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Reminder Email</div>
                <div className="text-sm text-gray-600">Sent as event reminders</div>
              </div>
              <button className="text-blue-600 hover:text-blue-900">✏️ Edit</button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  if (!session || session.user?.role !== 'ADMIN') {
    return { redirect: { destination: '/auth/signin', permanent: false } }
  }
  return { props: {} }
}
