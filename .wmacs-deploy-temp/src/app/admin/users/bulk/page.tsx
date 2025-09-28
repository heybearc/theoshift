'use client';

import { useState } from 'react';
import Link from 'next/link';

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
    { value: 'ASSISTANT_OVERSEER', label: 'Assistant Overseer' },
    { value: 'KEYMAN', label: 'Keyman' },
    { value: 'ATTENDANT', label: 'Attendant' }
  ];

  const sampleData = `John Doe,john.doe@example.com,ATTENDANT
Jane Smith,jane.smith@example.com,KEYMAN
Bob Johnson,bob.johnson@example.com,OVERSEER`;

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

      const parts = line.split(',').map(part => part.trim());
      
      if (parts.length < 3) {
        setError(`Line ${i + 1}: Invalid format. Expected: "First Last,email@example.com,ROLE"`);
        return;
      }

      const [fullName, email, role] = parts;
      const nameParts = fullName.split(' ');
      
      if (nameParts.length < 2) {
        setError(`Line ${i + 1}: Please provide both first and last name`);
        return;
      }

      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError(`Line ${i + 1}: Invalid email format`);
        return;
      }

      // Validate role
      if (!roles.some(r => r.value === role)) {
        setError(`Line ${i + 1}: Invalid role "${role}". Valid roles: ${roles.map(r => r.value).join(', ')}`);
        return;
      }

      parsedUsers.push({
        firstName,
        lastName,
        email,
        role
      });
    }

    setUsers(parsedUsers);
    setSuccess(`Successfully parsed ${parsedUsers.length} users`);
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

    const bulkResults: BulkResult[] = [];

    for (const user of users) {
      try {
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...user,
            sendInvitation: true
          })
        });

        const data = await response.json();

        bulkResults.push({
          success: data.success,
          user: data.data?.user,
          error: data.error,
          email: user.email
        });

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        bulkResults.push({
          success: false,
          error: 'Network error',
          email: user.email
        });
      }
    }

    setResults(bulkResults);
    
    const successCount = bulkResults.filter(r => r.success).length;
    const failureCount = bulkResults.filter(r => !r.success).length;

    if (successCount > 0 && failureCount === 0) {
      setSuccess(`✅ Successfully created ${successCount} users and sent invitations`);
    } else if (successCount > 0 && failureCount > 0) {
      setSuccess(`⚠️ Created ${successCount} users, ${failureCount} failed`);
    } else {
      setError(`❌ Failed to create users. Please check the results below.`);
    }

    setProcessing(false);
  };

  const clearAll = () => {
    setBulkText('');
    setUsers([]);
    setResults([]);
    setError('');
    setSuccess('');
  };

  const loadSample = () => {
    setBulkText(sampleData);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bulk User Operations</h1>
          <p className="text-gray-600">Create multiple users and send invitations in bulk</p>
        </div>
        <Link
          href="/admin/users"
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          ← Back to Users
        </Link>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">📋 Instructions</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div>
            <strong>Format:</strong> Each line should contain: <code>First Last,email@example.com,ROLE</code>
          </div>
          <div>
            <strong>Valid Roles:</strong> {roles.map(r => r.value).join(', ')}
          </div>
          <div>
            <strong>Example:</strong>
            <pre className="bg-blue-100 p-2 rounded mt-2 text-xs">
John Doe,john.doe@example.com,ATTENDANT{'\n'}Jane Smith,jane.smith@example.com,KEYMAN
            </pre>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Bulk Input */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">User Data Input</h3>
              <div className="space-x-2">
                <button
                  onClick={loadSample}
                  className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded transition-colors"
                >
                  Load Sample
                </button>
                <button
                  onClick={clearAll}
                  className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Enter user data, one per line:&#10;John Doe,john.doe@example.com,ATTENDANT&#10;Jane Smith,jane.smith@example.com,KEYMAN"
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />

            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                {bulkText.trim().split('\n').filter(line => line.trim()).length} lines entered
              </div>
              <button
                onClick={parseBulkText}
                disabled={!bulkText.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                📊 Parse Data
              </button>
            </div>
          </div>

          {/* Parsed Users Preview */}
          {users.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Parsed Users ({users.length})
                </h3>
                <button
                  onClick={processBulkUsers}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {processing ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    '🚀 Create Users & Send Invitations'
                  )}
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {user.firstName} {user.lastName}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">{user.email}</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {roles.find(r => r.value === user.role)?.label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Processing Status */}
          {processing && (
            <div className="bg-yellow-50 rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <h3 className="font-medium text-yellow-800">Processing Users...</h3>
                  <p className="text-sm text-yellow-600">Creating users and sending invitations</p>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Processing Results ({results.length})
              </h3>

              <div className="max-h-96 overflow-y-auto space-y-3">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {result.success ? '✅' : '❌'}
                          </span>
                          <span className="font-medium text-sm">
                            {result.email}
                          </span>
                        </div>
                        {result.success ? (
                          <p className="text-xs text-green-600 mt-1">
                            User created successfully. Invitation email sent.
                          </p>
                        ) : (
                          <p className="text-xs text-red-600 mt-1">
                            {result.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-600">
                      {results.filter(r => r.success).length}
                    </div>
                    <div className="text-sm text-green-600">Successful</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-red-600">
                      {results.filter(r => !r.success).length}
                    </div>
                    <div className="text-sm text-red-600">Failed</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Tips</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>• Users will receive invitation emails with login instructions</div>
              <div>• Duplicate emails will be rejected automatically</div>
              <div>• Invalid email formats will cause creation to fail</div>
              <div>• All users will be created with active status</div>
              <div>• Large batches are processed with small delays to prevent server overload</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
