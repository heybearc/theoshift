'use client';

import { useState, useEffect } from 'react';

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  userEmail: string;
  userName: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

interface AuditLogsData {
  success: boolean;
  data: {
    logs: AuditLogEntry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    summary: {
      totalLogs: number;
      actionCounts: Record<string, number>;
      entityCounts: Record<string, number>;
      userCounts: Record<string, number>;
      dateRange: {
        earliest: string | null;
        latest: string | null;
      };
    };
  };
}

export default function AuditLogsPage() {
  const [logsData, setLogsData] = useState<AuditLogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    action: '',
    entity: '',
    userId: '',
    startDate: '',
    endDate: '',
    page: 1
  });

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.entity) params.append('entity', filters.entity);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('page', filters.page.toString());
      params.append('limit', '20');
      
      const response = await fetch(`/api/admin/audit-logs?${params}`);
      const data: AuditLogsData = await response.json();
      
      if (data.success) {
        setLogsData(data);
      } else {
        setError('Failed to fetch audit logs');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Audit logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [filters]);

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value // Reset to page 1 when changing filters
    }));
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-green-100 text-green-800';
    if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-800';
    if (action.includes('DELETE')) return 'bg-red-100 text-red-800';
    if (action.includes('LOGIN')) return 'bg-purple-100 text-purple-800';
    if (action.includes('ASSIGN')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getEntityColor = (entity: string) => {
    switch (entity.toLowerCase()) {
      case 'user': return 'bg-blue-100 text-blue-800';
      case 'event': return 'bg-green-100 text-green-800';
      case 'assignment': return 'bg-yellow-100 text-yellow-800';
      case 'session': return 'bg-purple-100 text-purple-800';
      case 'emailconfig': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatUserAgent = (userAgent: string) => {
    if (userAgent.includes('Macintosh')) return '🖥️ macOS';
    if (userAgent.includes('Windows')) return '💻 Windows';
    if (userAgent.includes('iPad')) return '📱 iPad';
    if (userAgent.includes('iPhone')) return '📱 iPhone';
    if (userAgent.includes('Android')) return '📱 Android';
    return '🌐 Browser';
  };

  if (loading && !logsData) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        </div>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔄</div>
          <div className="text-gray-500">Loading audit logs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">View comprehensive audit trails of all system activities and changes</p>
        </div>
        <button
          onClick={fetchAuditLogs}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {logsData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold text-gray-900">{logsData.data.summary.totalLogs}</div>
              <div className="text-sm text-gray-600">Total Logs</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(logsData.data.summary.actionCounts).length}
              </div>
              <div className="text-sm text-gray-600">Action Types</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold text-green-600">
                {Object.keys(logsData.data.summary.entityCounts).length}
              </div>
              <div className="text-sm text-gray-600">Entity Types</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(logsData.data.summary.userCounts).length}
              </div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Actions</option>
                  {Object.keys(logsData.data.summary.actionCounts).map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entity</label>
                <select
                  value={filters.entity}
                  onChange={(e) => handleFilterChange('entity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Entities</option>
                  {Object.keys(logsData.data.summary.entityCounts).map(entity => (
                    <option key={entity} value={entity}>{entity}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({
                    action: '',
                    entity: '',
                    userId: '',
                    startDate: '',
                    endDate: '',
                    page: 1
                  })}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Activity Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logsData.data.logs.map((log) => (
                    <tr 
                      key={log.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                          <div className="text-sm text-gray-500">{log.userEmail}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getEntityColor(log.entity)}`}>
                          {log.entity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {JSON.stringify(log.details)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div>{formatUserAgent(log.userAgent)}</div>
                          <div className="font-mono text-xs">{log.ipAddress}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {logsData.data.pagination.pages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((logsData.data.pagination.page - 1) * logsData.data.pagination.limit) + 1} to{' '}
                    {Math.min(logsData.data.pagination.page * logsData.data.pagination.limit, logsData.data.pagination.total)} of{' '}
                    {logsData.data.pagination.total} results
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleFilterChange('page', filters.page - 1)}
                      disabled={!logsData.data.pagination.hasPrev}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                      {logsData.data.pagination.page} of {logsData.data.pagination.pages}
                    </span>
                    <button
                      onClick={() => handleFilterChange('page', filters.page + 1)}
                      disabled={!logsData.data.pagination.hasNext}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Log Detail Modal */}
          {selectedLog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Audit Log Details</h3>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                      <div className="text-sm text-gray-900">{formatTimestamp(selectedLog.timestamp)}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">User</label>
                      <div className="text-sm text-gray-900">{selectedLog.userName} ({selectedLog.userEmail})</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Action</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getActionColor(selectedLog.action)}`}>
                        {selectedLog.action}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Entity</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getEntityColor(selectedLog.entity)}`}>
                        {selectedLog.entity}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">IP Address</label>
                      <div className="text-sm text-gray-900 font-mono">{selectedLog.ipAddress}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Device</label>
                      <div className="text-sm text-gray-900">{formatUserAgent(selectedLog.userAgent)}</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Details</label>
                    <pre className="bg-gray-50 p-4 rounded-lg text-sm text-gray-900 overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">User Agent</label>
                    <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-900 break-all">
                      {selectedLog.userAgent}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
