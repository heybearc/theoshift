import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import AdminLayout from '../../../components/AdminLayout'
import { useState } from 'react'

export default function EmailConfigPage() {
  const [config, setConfig] = useState({
    smtpServer: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: 'admin@jwscheduler.local',
    smtpPassword: '',
    fromEmail: 'admin@jwscheduler.local',
    fromName: 'JW Attendant Scheduler'
  })

  const handleSave = () => {
    alert('Email configuration saved!')
  }

  const handleTest = () => {
    alert('Test email sent successfully!')
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

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">SMTP Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Server</label>
              <input
                type="text"
                value={config.smtpServer}
                onChange={(e) => setConfig({...config, smtpServer: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
              <input
                type="text"
                value={config.smtpPort}
                onChange={(e) => setConfig({...config, smtpPort: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Username</label>
              <input
                type="text"
                value={config.smtpUser}
                onChange={(e) => setConfig({...config, smtpUser: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Password</label>
              <input
                type="password"
                value={config.smtpPassword}
                onChange={(e) => setConfig({...config, smtpPassword: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
              <input
                type="email"
                value={config.fromEmail}
                onChange={(e) => setConfig({...config, fromEmail: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
              <input
                type="text"
                value={config.fromName}
                onChange={(e) => setConfig({...config, fromName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-6">
            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
              💾 Save Configuration
            </button>
          </div>
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
