import { useState } from 'react';
import Link from 'next/link';
import AdminLayout from '../../../components/AdminLayout';

interface BulkUser {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface BulkResult {
  success: boolean;
  user?: any;
  error?: string;
  email: string;
}

export default function BulkUsersPage() {
  const [bulkText, setBulkText] = useState('');
  const [users, setUsers] = useState<BulkUser[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const roles = [
    { value: 'ADMIN', label: 'Administrator' },
    { value: 'OVERSEER', label: 'Overseer' },
    { value: 'ATTENDANT', label: 'Attendant' },
  ];

  const parseBulkText = () => {
    setError('');
    setUsers([]);
    
    if (!bulkText.trim()) {
      setError('Please enter user data');
      return;
    }

    const lines = bulkText.trim().split('\n');
    const parsedUsers: BulkUser[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Support CSV format: firstName,lastName,email,role
      const parts = line.split(',').map(p => p.trim());
      
      if (parts.length < 3) {
        setError(`Line ${i + 1}: Invalid format. Expected: firstName,lastName,email,role`);
        return;
      }

      const [firstName, lastName, email, role = 'ATTENDANT'] = parts;
      
      if (!firstName || !lastName || !email) {
        setError(`Line ${i + 1}: Missing required fields`);
        return;
      }

      // Basic email validation
      if (!/\S+@\S+\.\S+/.test(email)) {
        setError(`Line ${i + 1}: Invalid email format`);
        return;
      }

      parsedUsers.push({
        firstName,
        lastName,
        email,
        role: role.toUpperCase()
      });
    }

    setUsers(parsedUsers);
    setSuccess(`Parsed ${parsedUsers.length} users successfully`);
  };

  const processBulkUsers = async () => {
    if (users.length === 0) {
      setError('No users to process');
      return;
    }

    setProcessing(true);
    setResults([]);
    setError('');
    setSuccess('');

    const processResults: BulkResult[] = [];

    for (const user of users) {
      try {
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(user),
        });

        if (response.ok) {
          const userData = await response.json();
          processResults.push({
            success: true,
            user: userData,
            email: user.email
          });
        } else {
          const errorData = await response.json();
          processResults.push({
            success: false,
            error: errorData.error || 'Unknown error',
            email: user.email
          });
        }
      } catch (error) {
        processResults.push({
          success: false,
          error: 'Network error',
          email: user.email
        });
      }
    }

    setResults(processResults);
    setProcessing(false);
    
    const successCount = processResults.filter(r => r.success).length;
    const errorCount = processResults.filter(r => !r.success).length;
    
    if (errorCount === 0) {
      setSuccess(`Successfully created ${successCount} users`);
    } else {
      setError(`Created ${successCount} users, ${errorCount} failed`);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Bulk User Import</h1>
            <Link
              href="/admin/users"
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Back to Users
            </Link>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Import multiple users at once using CSV format
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Format Instructions</h3>
          <p className="text-sm text-blue-700 mb-2">
            Enter one user per line in CSV format: <code>firstName,lastName,email,role</code>
          </p>
          <p className="text-sm text-blue-700 mb-2">
            Available roles: ADMIN, OVERSEER, ATTENDANT (default if not specified)
          </p>
          <div className="text-sm text-blue-700">
            <strong>Example:</strong>
            <pre className="mt-1 bg-blue-100 p-2 rounded text-xs">
{`John,Smith,john.smith@example.com,ATTENDANT
Jane,Doe,jane.doe@example.com,OVERSEER
Bob,Johnson,bob.johnson@example.com,ADMIN`}
            </pre>
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="mb-4">
            <label htmlFor="bulkText" className="block text-sm font-medium text-gray-700 mb-2">
              User Data (CSV Format)
            </label>
            <textarea
              id="bulkText"
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="firstName,lastName,email,role&#10;John,Smith,john.smith@example.com,ATTENDANT&#10;Jane,Doe,jane.doe@example.com,OVERSEER"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={parseBulkText}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={processing}
            >
              Parse Users
            </button>
            
            {users.length > 0 && (
              <button
                onClick={processBulkUsers}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                disabled={processing}
              >
                {processing ? 'Processing...' : `Create ${users.length} Users`}
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Parsed Users Preview */}
        {users.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Parsed Users ({users.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                          user.role === 'OVERSEER' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Processing Results
            </h3>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded ${
                    result.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-3 ${
                      result.success ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    <span className="font-medium">{result.email}</span>
                    <span className={`ml-2 text-sm ${
                      result.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {result.success ? 'Created successfully' : result.error}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
