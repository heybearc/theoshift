import React from 'react'
import { AttendantStats } from '../../types'
import FormOfServiceBadge from '../atoms/FormOfServiceBadge'

interface AttendantStatsCardProps {
  stats: AttendantStats
  loading?: boolean
  className?: string
}

export default function AttendantStatsCard({ 
  stats, 
  loading = false, 
  className = '' 
}: AttendantStatsCardProps) {
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const topCongregations = Object.entries(stats.byCongregation)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)

  const formsOfServiceEntries = Object.entries(stats.byFormsOfService)
    .filter(([,count]) => count > 0)
    .sort(([,a], [,b]) => b - a)

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Attendant Statistics</h3>
      </div>

      <div className="p-6 space-y-6">
        {/* Overview Stats */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Overview</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-blue-800">Total</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-green-800">Active</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
              <div className="text-sm text-red-800">Inactive</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((stats.active / stats.total) * 100) || 0}%
              </div>
              <div className="text-sm text-purple-800">Active Rate</div>
            </div>
          </div>
        </div>

        {/* User Account Stats */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">User Accounts</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">{stats.withUsers}</div>
              <div className="text-sm text-green-800">With Accounts</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-600">{stats.withoutUsers}</div>
              <div className="text-sm text-gray-800">No Account</div>
            </div>
          </div>
        </div>

        {/* Forms of Service Distribution */}
        {formsOfServiceEntries.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Forms of Service</h4>
            <div className="space-y-2">
              {formsOfServiceEntries.map(([form, count]) => (
                <div key={form} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <FormOfServiceBadge form={form as any} />
                    <span className="text-sm text-gray-700">{form}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Congregations */}
        {topCongregations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Top Congregations
              {Object.keys(stats.byCongregation).length > 5 && (
                <span className="text-xs text-gray-500 ml-1">(showing top 5)</span>
              )}
            </h4>
            <div className="space-y-2">
              {topCongregations.map(([congregation, count]) => (
                <div key={congregation} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700 truncate flex-1 mr-2">{congregation}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {Object.keys(stats.byCongregation).length > 5 && (
              <div className="text-center mt-2">
                <span className="text-xs text-gray-500">
                  +{Object.keys(stats.byCongregation).length - 5} more congregations
                </span>
              </div>
            )}
          </div>
        )}

        {/* Quick Insights */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Insights</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>
                {Object.keys(stats.byCongregation).length} congregations represented
              </span>
            </div>
            
            {stats.withUsers > 0 && (
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>
                  {Math.round((stats.withUsers / stats.total) * 100)}% have user accounts
                </span>
              </div>
            )}
            
            {formsOfServiceEntries.length > 0 && (
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>
                  Most common: {formsOfServiceEntries[0][0]} ({formsOfServiceEntries[0][1]} attendants)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
