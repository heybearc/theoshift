import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../auth.config';
import { redirect } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import Link from 'next/link';

const prisma = new PrismaClient();

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export default async function AdminDashboard() {
  const session = await getServerSession(authConfig);

  if (!session || !session.user) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  // Fetch users server-side
  const users = await prisma.users.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
            
            {/* Admin Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <Link href="/admin/audit" className="block p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Audit & Logging</h3>
                <p className="text-blue-700">View system audit logs and user activity</p>
              </Link>
              
              <Link href="/admin/reports" className="block p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                <h3 className="text-lg font-semibold text-green-900 mb-2">Administrative Reports</h3>
                <p className="text-green-700">Generate and view administrative reports</p>
              </Link>
              
              <Link href="/admin/users" className="block p-6 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">User Management</h3>
                <p className="text-purple-700">Manage users, roles, and permissions</p>
              </Link>
              
              <Link href="/admin/roles" className="block p-6 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Role Management</h3>
                <p className="text-yellow-700">Configure roles and access levels</p>
              </Link>
              
              <Link href="/admin/settings" className="block p-6 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                <h3 className="text-lg font-semibold text-red-900 mb-2">System Configuration</h3>
                <p className="text-red-700">Configure system settings and preferences</p>
              </Link>
              
              <Link href="/admin/email-config" className="block p-6 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors">
                <h3 className="text-lg font-semibold text-indigo-900 mb-2">Email Configuration</h3>
                <p className="text-indigo-700">Configure email settings and templates</p>
              </Link>
            </div>

            {/* User Management Section */}
            <div className="border-t pt-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                <Link
                  href="/admin/users/new"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add New User
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                            user.role === 'OVERSEER' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Link
                              href={`/admin/users/${user.id}/edit`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Edit
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
