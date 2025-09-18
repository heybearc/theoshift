'use client'

import { useAuth } from '../../providers'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface EmailConfig {
  id: string
  smtpServer: string
  smtpPort: number
  smtpUser: string
  fromEmail: string
  fromName: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function EmailConfigPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [config, setConfig] = useState<EmailConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [formData, setFormData] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: '',
  })

  useEffect(() => {
    if (authLoading) return
    
    if (!user || user.role !== 'ADMIN') {
      router.push('/unauthorized')
      return
    }

    fetchConfig()
  }, [user, authLoading, router])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/email-config')
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
        setFormData({
          smtpHost: data.smtpServer || '',
          smtpPort: data.smtpPort || 587,
          smtpUser: data.smtpUser || '',
          smtpPassword: '', // Never populate password
          fromEmail: data.fromEmail || '',
          fromName: data.fromName || '',
        })
      }
    } catch (error) {
      console.error('Failed to fetch email config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/admin/email-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert('Email configuration saved successfully!')
        fetchConfig()
      } else {
        const error = await response.json()
        alert(`Failed to save configuration: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to save email config:', error)
      alert('Failed to save email configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter a test email address')
      return
    }

    setTestSending(true)

    try {
      const response = await fetch('/api/admin/email-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testEmail }),
      })

      if (response.ok) {
        alert(`Test email sent to ${testEmail}`)
      } else {
        const error = await response.json()
        alert(`Failed to send test email: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to send test email:', error)
      alert('Failed to send test email')
    } finally {
      setTestSending(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Email Configuration</h1>
            <Link
              href="/admin"
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Admin
            </Link>
          </div>

          {config && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="font-semibold text-green-800">Current Configuration</h3>
              <p className="text-green-700">
                SMTP: {config.smtpServer}:{config.smtpPort} | 
                From: {config.fromName} &lt;{config.fromEmail}&gt; |
                Updated: {new Date(config.updatedAt).toLocaleString()}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Server
                </label>
                <input
                  type="text"
                  value={formData.smtpHost}
                  onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={formData.smtpPort}
                  onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) })}
                  placeholder="587"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Username
                </label>
                <input
                  type="text"
                  value={formData.smtpUser}
                  onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                  placeholder="your-email@gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Password / App Password
                </label>
                <input
                  type="password"
                  value={formData.smtpPassword}
                  onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                  placeholder="Gmail App Password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Email
                </label>
                <input
                  type="email"
                  value={formData.fromEmail}
                  onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                  placeholder="noreply@congregation.org"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Name
                </label>
                <input
                  type="text"
                  value={formData.fromName}
                  onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                  placeholder="JW Attendant Scheduler"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>

          <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded">
            <h3 className="font-semibold text-gray-800 mb-4">Test Email Configuration</h3>
            <div className="flex space-x-4">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleTestEmail}
                disabled={testSending || !config}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {testSending ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Send a test email to verify your configuration is working correctly.
            </p>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-semibold text-blue-800 mb-2">Gmail Setup Instructions</h3>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Enable 2-Factor Authentication on your Gmail account</li>
              <li>2. Go to Google Account Settings → Security → App passwords</li>
              <li>3. Generate an app password for "Mail"</li>
              <li>4. Use your Gmail address as SMTP User and the app password as SMTP Password</li>
              <li>5. Use smtp.gmail.com:587 for SMTP server and port</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
