'use client';

import { useState, useEffect } from 'react';

interface EndpointStatus {
  name: string;
  path: string;
  method: string;
  category: string;
  status: 'healthy' | 'unhealthy' | 'slow';
  responseTime: number;
  lastChecked: string;
  errorMessage?: string;
}

interface APIStatusData {
  success: boolean;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checkDuration: number;
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    slow: number;
    averageResponseTime: number;
  };
  endpoints: EndpointStatus[];
  categories: {
    admin: number;
    events: number;
    users: number;
    auth: number;
  };
}

export default function APIStatusPage() {
  const [statusData, setStatusData] = useState<APIStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAPIStatus = async (category: string = '') => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      params.append('detailed', 'true');
      
      const response = await fetch(`/api/admin/api-status?${params}`);
      const data: APIStatusData = await response.json();
      
      if (data.success) {
        setStatusData(data);
        setLastUpdated(new Date());
      } else {
        setError('Failed to fetch API status');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('API status error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAPIStatus(selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchAPIStatus(selectedCategory);
    }, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, [autoRefresh, selectedCategory]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'slow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'degraded':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'slow':
        return '⚠️';
      case 'unhealthy':
        return '❌';
      case 'degraded':
        return '🟡';
      default:
        return '❓';
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-100 text-blue-800';
      case 'POST':
        return 'bg-green-100 text-green-800';
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'events':
        return 'bg-blue-100 text-blue-800';
      case 'users':
        return 'bg-green-100 text-green-800';
      case 'auth':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">API Status Monitor</h1>
        </div>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔄</div>
          <div className="text-gray-500">Checking API endpoints...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Status Monitor</h1>
          <p className="text-gray-600">Monitor API endpoints, response times, and error rates in real-time</p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto-refresh (1m)</span>
          </label>
          <button
            onClick={() => fetchAPIStatus(selectedCategory)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {statusData && (
        <>
          {/* Overall Status */}
          <div className={`rounded-lg border-2 p-6 ${getStatusColor(statusData.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{getStatusIcon(statusData.status)}</span>
                <div>
                  <h2 className="text-xl font-bold">
                    API Status: {statusData.status.toUpperCase()}
                  </h2>
                  <p className="text-sm opacity-75">
                    Check Duration: {statusData.checkDuration}ms | Average Response: {statusData.summary.averageResponseTime}ms
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-75">Checked at</div>
                <div className="font-mono text-sm">
                  {new Date(statusData.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold text-gray-900">{statusData.summary.total}</div>
              <div className="text-sm text-gray-600">Total Endpoints</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold text-green-600">{statusData.summary.healthy}</div>
              <div className="text-sm text-gray-600">Healthy</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold text-yellow-600">{statusData.summary.slow}</div>
              <div className="text-sm text-gray-600">Slow</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold text-red-600">{statusData.summary.unhealthy}</div>
              <div className="text-sm text-gray-600">Unhealthy</div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Filter by category:</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === '' 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All ({statusData.summary.total})
                </button>
                {Object.entries(statusData.categories).map(([category, count]) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category 
                        ? 'bg-gray-900 text-white' 
                        : `${getCategoryColor(category)} hover:opacity-80`
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)} ({count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Endpoints List */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">API Endpoints</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Endpoint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Response Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Checked
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {statusData.endpoints.map((endpoint, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{endpoint.name}</div>
                          <div className="text-sm text-gray-500 font-mono">{endpoint.path}</div>
                          {endpoint.errorMessage && (
                            <div className="text-xs text-red-600 mt-1">{endpoint.errorMessage}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getMethodColor(endpoint.method)}`}>
                          {endpoint.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getCategoryColor(endpoint.category)}`}>
                          {endpoint.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded border ${getStatusColor(endpoint.status)}`}>
                          <span className="mr-1">{getStatusIcon(endpoint.status)}</span>
                          {endpoint.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`font-mono ${
                          endpoint.responseTime > 1000 ? 'text-red-600' : 
                          endpoint.responseTime > 500 ? 'text-yellow-600' : 
                          'text-green-600'
                        }`}>
                          {endpoint.responseTime}ms
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(endpoint.lastChecked).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
