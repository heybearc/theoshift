import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import AdminLayout from '../../../components/AdminLayout'
import { useState, useEffect } from 'react'

interface BackupInfo {
  backups: Array<{ filename: string; size: string; date: string }>
  lastBackup: { filename: string; size: string; date: string } | null
  databases: Array<{ name: string; size: string }>
  backupCount: number
}

export default function SystemOpsPage() {
  const [backupStatus, setBackupStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [backupMessage, setBackupMessage] = useState('')
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null)
  const [showBackupList, setShowBackupList] = useState(false)

  const fetchBackupInfo = async () => {
    try {
      const response = await fetch('/api/admin/backup-info')
      if (response.ok) {
        const data = await response.json()
        setBackupInfo(data)
      }
    } catch (error) {
      console.error('Failed to fetch backup info:', error)
    }
  }

  useEffect(() => {
    fetchBackupInfo()
    const interval = setInterval(fetchBackupInfo, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const handleBackup = async () => {
    setBackupStatus('running')
    setBackupMessage('Creating backup...')
    
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setBackupStatus('success')
        setBackupMessage('Backup completed successfully!')
        fetchBackupInfo() // Refresh backup info
      } else {
        setBackupStatus('error')
        setBackupMessage(data.error || 'Backup failed')
      }
    } catch (error) {
      setBackupStatus('error')
      setBackupMessage('Failed to trigger backup')
    }
    
    setTimeout(() => {
      setBackupStatus('idle')
      setBackupMessage('')
    }, 5000)
  }

  const systemTasks = [
    { 
      name: 'Backup Database', 
      description: 'Create immediate backup to TrueNAS (auto-backups run daily at 2 AM)', 
      status: backupStatus === 'running' ? 'running' : 'ready',
      action: handleBackup,
      enabled: true
    },
    { name: 'Database Cleanup', description: 'Remove old logs and temporary data', status: 'ready', enabled: false },
    { name: 'Cache Clear', description: 'Clear application cache', status: 'ready', enabled: false },
    { name: 'System Health Check', description: 'Run comprehensive system diagnostics', status: 'ready', enabled: false }
  ]

  return (
    <AdminLayout title="System Operations" breadcrumbs={[{ label: 'System Operations' }]}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Database and system maintenance tasks</p>
        </div>

        {backupMessage && (
          <div className={`p-4 rounded-lg ${
            backupStatus === 'success' ? 'bg-green-100 text-green-800' : 
            backupStatus === 'error' ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
          }`}>
            {backupMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {systemTasks.map((task, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{task.description}</p>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      task.status === 'running' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {task.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={task.action}
                  disabled={!task.enabled || task.status === 'running'}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    task.enabled && task.status !== 'running'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {task.status === 'running' ? '⏳ Running...' : '▶️ Run'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">System Information</h3>
            {backupInfo && backupInfo.backupCount > 0 && (
              <button
                onClick={() => setShowBackupList(!showBackupList)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showBackupList ? '▼ Hide' : '▶'} View {backupInfo.backupCount} Backups
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            {backupInfo?.databases.map((db, idx) => (
              <div key={idx}>
                <div className="text-gray-600">{db.name === 'theoshift_scheduler_prod' ? 'Prod DB' : 'Staging DB'}</div>
                <div className="font-medium">{db.size}</div>
              </div>
            ))}
            <div>
              <div className="text-gray-600">Total Backups</div>
              <div className="font-medium">{backupInfo?.backupCount || 0}</div>
            </div>
            <div>
              <div className="text-gray-600">Last Backup</div>
              <div className="font-medium">{backupInfo?.lastBackup?.date || 'Never'}</div>
            </div>
          </div>

          {showBackupList && backupInfo && (
            <div className="mt-4 border-t pt-4">
              <h4 className="font-semibold text-gray-900 mb-2">Recent Backups</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {backupInfo.backups.map((backup, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm py-2 px-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="font-mono text-xs text-gray-600">{backup.filename}</div>
                    </div>
                    <div className="text-gray-600 ml-4">{backup.size}</div>
                    <div className="text-gray-500 ml-4 text-xs">{backup.date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
