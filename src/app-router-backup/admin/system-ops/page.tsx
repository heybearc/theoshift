'use client';

import { useState, useEffect } from 'react';

interface SystemOperation {
  id: string;
  name: string;
  description: string;
  category: 'maintenance' | 'backup' | 'cleanup' | 'monitoring';
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastRun?: string;
  duration?: number;
  result?: any;
}

interface SystemOpsData {
  success: boolean;
  data: {
    operations: SystemOperation[];
    summary: {
      total: number;
      byCategory: Record<string, number>;
      byStatus: Record<string, number>;
      lastActivity?: string;
    };
  };
}

export default function SystemOperationsPage() {
  const [opsData, setOpsData] = useState<SystemOpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [runningOps, setRunningOps] = useState<Set<string>>(new Set());
  const [operationResults, setOperationResults] = useState<Record<string, any>>({});

  const fetchSystemOps = async (category: string = '') => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      
      const response = await fetch(`/api/admin/system-ops?${params}`);
      const data: SystemOpsData = await response.json();
      
      if (data.success) {
        setOpsData(data);
      } else {
        setError('Failed to fetch system operations');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('System ops error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemOps(selectedCategory);
  }, [selectedCategory]);

  const executeOperation = async (operationId: string) => {
    try {
      setRunningOps(prev => new Set([...prev, operationId]));
      setError(null);
      
      const response = await fetch('/api/admin/system-ops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operationId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOperationResults(prev => ({
          ...prev,
          [operationId]: data.data
        }));
        
        // Refresh the operations list
        fetchSystemOps(selectedCategory);
      } else {
        setError(data.error || 'Failed to execute operation');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Operation execution error:', err);
    } finally {
      setRunningOps(prev => {
        const newSet = new Set(prev);
        newSet.delete(operationId);
        return newSet;
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'maintenance': return 'bg-blue-100 text-blue-800';
      case 'backup': return 'bg-green-100 text-green-800';
      case 'cleanup': return 'bg-yellow-100 text-yellow-800';
      case 'monitoring': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'bg-gray-100 text-gray-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'maintenance': return '🔧';
      case 'backup': return '💾';
      case 'cleanup': return '🧹';
      case 'monitoring': return '📊';
      default: return '⚙️';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">System Operations</h1>
        </div>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔄</div>
          <div className="text-gray-500">Loading system operations...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Operations</h1>
          <p className="text-gray-600">Perform system maintenance, backups, and operational tasks safely</p>
        </div>
        <button
          onClick={() => fetchSystemOps(selectedCategory)}
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

      {opsData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold text-gray-900">{opsData.data.summary.total}</div>
              <div className="text-sm text-gray-600">Total Operations</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold text-blue-600">{opsData.data.summary.byCategory.maintenance || 0}</div>
              <div className="text-sm text-gray-600">Maintenance</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold text-green-600">{opsData.data.summary.byCategory.backup || 0}</div>
              <div className="text-sm text-gray-600">Backup</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold text-purple-600">{opsData.data.summary.byCategory.monitoring || 0}</div>
              <div className="text-sm text-gray-600">Monitoring</div>
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
                  All ({opsData.data.summary.total})
                </button>
                {Object.entries(opsData.data.summary.byCategory).map(([category, count]) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category 
                        ? 'bg-gray-900 text-white' 
                        : `${getCategoryColor(category)} hover:opacity-80`
                    }`}
                  >
                    {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)} ({count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Operations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {opsData.data.operations.map((operation) => {
              const isRunning = runningOps.has(operation.id);
              const result = operationResults[operation.id];
              
              return (
                <div key={operation.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getCategoryIcon(operation.category)}</span>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{operation.name}</h3>
                          <p className="text-sm text-gray-600">{operation.description}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getCategoryColor(operation.category)}`}>
                        {operation.category}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getStatusColor(isRunning ? 'running' : operation.status)}`}>
                        {isRunning ? 'Running...' : operation.status}
                      </span>
                    </div>
                    
                    {operation.lastRun && (
                      <div className="mb-4 text-sm text-gray-600">
                        <div>Last run: {formatTimestamp(operation.lastRun)}</div>
                        {operation.duration && (
                          <div>Duration: {formatDuration(operation.duration)}</div>
                        )}
                      </div>
                    )}
                    
                    {operation.result && !result && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs font-medium text-gray-700 mb-1">Last Result:</div>
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                          {JSON.stringify(operation.result, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {result && (
                      <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-xs font-medium text-green-700 mb-1">Latest Result:</div>
                        <div className="text-sm text-green-800">
                          <div>Completed: {formatTimestamp(result.endTime)}</div>
                          <div>Duration: {formatDuration(result.duration)}</div>
                        </div>
                        <pre className="text-xs text-green-600 whitespace-pre-wrap mt-2">
                          {JSON.stringify(result.result, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    <button
                      onClick={() => executeOperation(operation.id)}
                      disabled={isRunning}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                        isRunning
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isRunning ? (
                        <>
                          <span className="inline-block animate-spin mr-2">⚙️</span>
                          Running...
                        </>
                      ) : (
                        <>
                          ▶️ Execute Operation
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => executeOperation('health_check')}
                disabled={runningOps.has('health_check')}
                className="flex flex-col items-center space-y-2 p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-2xl">📊</span>
                <span className="text-sm font-medium text-gray-900">Health Check</span>
              </button>
              <button
                onClick={() => executeOperation('cache_cleanup')}
                disabled={runningOps.has('cache_cleanup')}
                className="flex flex-col items-center space-y-2 p-4 rounded-lg border border-gray-200 hover:border-yellow-500 hover:bg-yellow-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-2xl">🧹</span>
                <span className="text-sm font-medium text-gray-900">Clear Cache</span>
              </button>
              <button
                onClick={() => executeOperation('database_backup')}
                disabled={runningOps.has('database_backup')}
                className="flex flex-col items-center space-y-2 p-4 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-2xl">💾</span>
                <span className="text-sm font-medium text-gray-900">Backup DB</span>
              </button>
              <button
                onClick={() => executeOperation('security_scan')}
                disabled={runningOps.has('security_scan')}
                className="flex flex-col items-center space-y-2 p-4 rounded-lg border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-2xl">🔒</span>
                <span className="text-sm font-medium text-gray-900">Security Scan</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
