import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import AdminLayout from '../../../components/AdminLayout'

export default function SystemOpsPage() {
  const systemTasks = [
    { name: 'Database Cleanup', description: 'Remove old logs and temporary data', status: 'ready' },
    { name: 'Cache Clear', description: 'Clear application cache', status: 'ready' },
    { name: 'Backup Database', description: 'Create database backup', status: 'ready' },
    { name: 'System Health Check', description: 'Run comprehensive system diagnostics', status: 'ready' }
  ]

  return (
    <AdminLayout title="System Operations" breadcrumbs={[{ label: 'System Operations' }]}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Database and system maintenance tasks</p>
          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">
            ⚠️ Emergency Mode
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {systemTasks.map((task, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{task.description}</p>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {task.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
                  ▶️ Run
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Database Size</div>
              <div className="font-medium">45.2 MB</div>
            </div>
            <div>
              <div className="text-gray-600">Cache Size</div>
              <div className="font-medium">12.8 MB</div>
            </div>
            <div>
              <div className="text-gray-600">Log Files</div>
              <div className="font-medium">8.4 MB</div>
            </div>
            <div>
              <div className="text-gray-600">Last Backup</div>
              <div className="font-medium">2 hours ago</div>
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
