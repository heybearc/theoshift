'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  attendants: Array<{
    id: string;
    position: string;
    status: string;
    assignedDate: string;
    event: {
      id: string;
      title: string;
      date: string;
      location: string;
    };
  }>;
  _count: {
    attendants: number;
  };
}

interface EditUserForm {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState<EditUserForm>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'ATTENDANT',
    isActive: true
  });

  const roles = [
    { value: 'ADMIN', label: 'Administrator', description: 'Full system access and user management' },
    { value: 'OVERSEER', label: 'Overseer', description: 'Manage events and assign attendants' },
    { value: 'ASSISTANT_OVERSEER', label: 'Assistant Overseer', description: 'Assist with event management' },
    { value: 'KEYMAN', label: 'Keyman', description: 'Manage facility access and setup' },
    { value: 'ATTENDANT', label: 'Attendant', description: 'Participate in assigned events' }
  ];

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setUserId(resolvedParams.id);
      fetchUser(resolvedParams.id);
    };
    getParams();
  }, [params]);

  const fetchUser = async (id: string) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/admin/users/${id}`);
      const data = await response.json();

      if (data.success) {
        const userData = data.data.user;
        setUser(userData);
        setFormData({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          role: userData.role,
          isActive: userData.isActive
        });
      } else {
        setError(data.error || 'Failed to fetch user');
      }
    } catch (err) {
      setError('Error loading user data');
      console.error('Error fetching user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('User updated successfully!');
        
        // Refresh user data
        fetchUser(userId);

        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/admin/users');
        }, 2000);
      } else {
        setError(data.error || 'Failed to update user');
      }
    } catch (err) {
      setError('Error updating user. Please try again.');
      console.error('Error updating user:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirm('Are you sure you want to deactivate this user? This action will prevent them from logging in.')) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('User deactivated successfully!');
        setTimeout(() => {
          router.push('/admin/users');
        }, 2000);
      } else {
        setError(data.error || 'Failed to deactivate user');
      }
    } catch (err) {
      setError('Error deactivating user');
      console.error('Error deleting user:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg text-gray-600">Loading user data...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">❌</div>
        <div className="text-gray-500">User not found</div>
        <Link
          href="/admin/users"
          className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
          <p className="text-gray-600">Update user information and role assignment</p>
        </div>
        <Link
          href="/admin/users"
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          ← Back to Users
        </Link>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <span>✅</span>
            <span>{success}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <span>❌</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                      User Role *
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <strong>{roles.find(r => r.value === formData.role)?.label}:</strong>{' '}
                        {roles.find(r => r.value === formData.role)?.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                        Active Account
                      </label>
                      <p className="text-sm text-gray-500">
                        {formData.isActive 
                          ? 'User can log in and access the system.'
                          : 'User account is deactivated and cannot log in.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-between pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={saving}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
                >
                  🗑️ Deactivate User
                </button>
                <div className="flex space-x-4">
                  <Link
                    href="/admin/users"
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {saving ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </div>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* User Info Sidebar */}
        <div className="space-y-6">
          {/* User Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Summary</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">User ID:</span>
                <p className="font-mono text-sm">{user.id}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Created:</span>
                <p className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Last Updated:</span>
                <p className="text-sm">{new Date(user.updatedAt).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Total Assignments:</span>
                <p className="text-sm font-medium">{user._count.attendants}</p>
              </div>
            </div>
          </div>

          {/* Recent Assignments */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Assignments</h3>
            {user.attendants.length === 0 ? (
              <p className="text-sm text-gray-500">No assignments yet</p>
            ) : (
              <div className="space-y-3">
                {user.attendants.slice(0, 3).map((assignment) => (
                  <div key={assignment.id} className="border-l-4 border-blue-500 pl-3">
                    <p className="text-sm font-medium">{assignment.event.title}</p>
                    <p className="text-xs text-gray-500">
                      {assignment.position} • {new Date(assignment.event.date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">{assignment.event.location}</p>
                  </div>
                ))}
                {user.attendants.length > 3 && (
                  <p className="text-xs text-gray-500">
                    +{user.attendants.length - 3} more assignments
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
