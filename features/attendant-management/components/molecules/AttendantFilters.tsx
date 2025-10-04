import React from 'react'
import SearchInput from '../atoms/SearchInput'
import FormsOfServiceSelect from '../../../../components/FormsOfServiceSelect'
import { AttendantFiltersProps } from '../../types'

export default function AttendantFilters({
  filters,
  onFiltersChange,
  congregations,
  loading = false
}: AttendantFiltersProps) {
  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search })
  }

  const handleCongregationChange = (congregation: string) => {
    onFiltersChange({ ...filters, congregation })
  }

  const handleFormsOfServiceChange = (formsOfService: any[]) => {
    onFiltersChange({ ...filters, formsOfService })
  }

  const handleStatusChange = (isActive: boolean | undefined) => {
    onFiltersChange({ ...filters, isActive })
  }

  const handleUserLinkChange = (hasUser: boolean | undefined) => {
    onFiltersChange({ ...filters, hasUser })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters = Boolean(
    filters.search || 
    filters.congregation || 
    filters.formsOfService?.length || 
    filters.isActive !== undefined || 
    filters.hasUser !== undefined
  )

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <SearchInput
            value={filters.search || ''}
            onChange={handleSearchChange}
            placeholder="Search by name, email, or congregation..."
            disabled={loading}
          />
        </div>

        {/* Congregation Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Congregation
          </label>
          <select
            value={filters.congregation || ''}
            onChange={(e) => handleCongregationChange(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Congregations</option>
            {congregations.map((congregation) => (
              <option key={congregation} value={congregation}>
                {congregation}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.isActive === undefined ? '' : filters.isActive.toString()}
            onChange={(e) => {
              const value = e.target.value
              handleStatusChange(value === '' ? undefined : value === 'true')
            }}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {/* User Link Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User Account
          </label>
          <select
            value={filters.hasUser === undefined ? '' : filters.hasUser.toString()}
            onChange={(e) => {
              const value = e.target.value
              handleUserLinkChange(value === '' ? undefined : value === 'true')
            }}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Users</option>
            <option value="true">Has Account</option>
            <option value="false">No Account</option>
          </select>
        </div>
      </div>

      {/* Forms of Service Filter */}
      <div className="mt-4">
        <FormsOfServiceSelect
          selectedForms={filters.formsOfService || []}
          onChange={handleFormsOfServiceChange}
          disabled={loading}
          label="Filter by Forms of Service"
        />
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                Search: "{filters.search}"
                <button
                  onClick={() => handleSearchChange('')}
                  className="ml-1 h-3 w-3 rounded-full hover:bg-blue-200 flex items-center justify-center"
                >
                  ×
                </button>
              </span>
            )}
            {filters.congregation && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                Congregation: {filters.congregation}
                <button
                  onClick={() => handleCongregationChange('')}
                  className="ml-1 h-3 w-3 rounded-full hover:bg-green-200 flex items-center justify-center"
                >
                  ×
                </button>
              </span>
            )}
            {filters.isActive !== undefined && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800">
                Status: {filters.isActive ? 'Active' : 'Inactive'}
                <button
                  onClick={() => handleStatusChange(undefined)}
                  className="ml-1 h-3 w-3 rounded-full hover:bg-yellow-200 flex items-center justify-center"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
