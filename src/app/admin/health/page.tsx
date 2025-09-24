'use client';

import { useState, useEffect } from 'react';

interface HealthData {
  success: boolean;
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  timestamp: string;
  data: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      connections: {
        active: number;
        idle: number;
        total: number;
      };
      tables: {
        users: number;
        events: number;
        attendants: number;
      };
    };
    system: {
      uptime: number;
      memory: {
        used: number;
        total: number;
        percentage: number;
      };
      timestamp: string;
    };
    api: {
      status: 'healthy' | 'unhealthy';
      endpoints: {
        name: string;
        status: 'healthy' | 'unhealthy';
        responseTime: number;
      }[];
    };
  };
}

export default function HealthMonitorPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealthData = async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/health');
      const data: HealthData = await response.json();
      
      if (data.success) {
        setHealthData(data);
        setLastUpdated(new Date());
      } else {
        setError('Failed to fetch health data');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Health check error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const getStatusColor = (status: 'healthy' | 'unhealthy') => {
    return status === 'healthy' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const getStatusIcon = (status: 'healthy' | 'unhealthy') => {
    return status === 'healthy' ? '✅' : '❌';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Health Monitor</h1>
        </div>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔄</div>
          <div className="text-gray-500">Loading health data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Health Monitor</h1>
          <p className="text-gray-600">Monitor system health, database stats, and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto-refresh (30s)</span>
          </label>
          <button
            onClick={fetchHealthData}
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

      {/* Overall Status */}
      {healthData && (
        <div className={`rounded-lg border-2 p-6 ${getStatusColor(healthData.status)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{getStatusIcon(healthData.status)}</span>
              <div>
                <h2 className="text-xl font-bold">
                  System Status: {healthData.status.toUpperCase()}
                </h2>
                <p className="text-sm opacity-75">
                  Response Time: {healthData.responseTime}ms
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-75">Checked at</div>
              <div className="font-mono text-sm">
                {new Date(healthData.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {healthData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Database Health */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Database Health</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(healthData.data.database.status)}`}>
                {getStatusIcon(healthData.data.database.status)} {healthData.data.database.status}
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600">Response Time</div>
                  <div className="text-xl font-bold text-gray-900">
                    {healthData.data.database.responseTime}ms
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600">Active Connections</div>
                  <div className="text-xl font-bold text-gray-900">
                    {healthData.data.database.connections.active}
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600 mb-2">Connection Pool</div>
                <div className="flex space-x-4 text-sm">
                  <span>Active: <strong>{healthData.data.database.connections.active}</strong></span>
                  <span>Idle: <strong>{healthData.data.database.connections.idle}</strong></span>
                  <span>Total: <strong>{healthData.data.database.connections.total}</strong></span>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600 mb-2">Table Counts</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-blue-50 rounded p-2 text-center">
                    <div className="font-bold text-blue-900">{healthData.data.database.tables.users}</div>
                    <div className="text-blue-600">Users</div>
                  </div>
                  <div className="bg-green-50 rounded p-2 text-center">
                    <div className="font-bold text-green-900">{healthData.data.database.tables.events}</div>
                    <div className="text-green-600">Events</div>
                  </div>
                  <div className="bg-purple-50 rounded p-2 text-center">
                    <div className="font-bold text-purple-900">{healthData.data.database.tables.attendants}</div>
                    <div className="text-purple-600">Attendants</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Metrics</h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">System Uptime</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatUptime(healthData.data.system.uptime)}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600 mb-2">Memory Usage</div>
                <div className="bg-gray-200 rounded-full h-4 mb-2">
                  <div 
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${healthData.data.system.memory.percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{healthData.data.system.memory.used}MB used</span>
                  <span>{healthData.data.system.memory.total}MB total</span>
                </div>
                <div className="text-center text-sm font-medium text-gray-900 mt-1">
                  {healthData.data.system.memory.percentage}% utilized
                </div>
              </div>
            </div>
          </div>

          {/* API Health */}
          <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">API Endpoints</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(healthData.data.api.status)}`}>
                {getStatusIcon(healthData.data.api.status)} {healthData.data.api.status}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {healthData.data.api.endpoints.map((endpoint, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{endpoint.name}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(endpoint.status)}`}>
                      {getStatusIcon(endpoint.status)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Response: {endpoint.responseTime.toFixed(1)}ms
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
