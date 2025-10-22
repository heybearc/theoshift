import React, { useState } from 'react'
import { AttendantTableProps, Attendant } from '../../types'
import StatusBadge from '../atoms/StatusBadge'
import FormOfServiceBadge from '../atoms/FormOfServiceBadge'
import ActionButton from '../atoms/ActionButton'

export default function AttendantTable({
  attendants,
  loading = false,
  onEdit,
  onDelete,
  onSelect,
  selectedIds = [],
  onBulkStatusChange
}: AttendantTableProps) {
  const [sortField, setSortField] = useState<keyof Attendant>('lastName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: keyof Attendant) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (onSelect) {
      onSelect(checked ? attendants.map(a => a.id) : [])
    }
  }

  const handleSelectOne = (attendantId: string, checked: boolean) => {
    if (onSelect) {
      if (checked) {
        onSelect([...selectedIds, attendantId])
      } else {
        onSelect(selectedIds.filter(id => id !== attendantId))
      }
    }
  }

  const sortedAttendants = [...attendants].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1
    
    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const SortIcon = ({ field }: { field: keyof Attendant }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  const allSelected = attendants.length > 0 && selectedIds.length === attendants.length
  const someSelected = selectedIds.length > 0 && selectedIds.length < attendants.length

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendants...</p>
        </div>
      </div>
    )
  }

  if (attendants.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-12 text-center text-gray-500">
          <div className="flex flex-col items-center">
            <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-lg font-medium">No attendants found</p>
            <p className="text-sm">Try adjusting your filters or create a new attendant</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Mobile-friendly responsive table */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {onSelect && (
                <th className="px-3 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={input => {
                      if (input) input.indeterminate = someSelected
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
              )}
              
              <th 
                className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[15%]"
                onClick={() => handleSort('lastName')}
              >
                <div className="flex items-center space-x-1">
                  <span>Name</span>
                  <SortIcon field="lastName" />
                </div>
              </th>
              
              <th 
                className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[20%]"
                onClick={() => handleSort('email')}
              >
                <div className="flex items-center space-x-1">
                  <span>Email</span>
                  <SortIcon field="email" />
                </div>
              </th>
              
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                Phone
              </th>
              
              <th 
                className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[12%]"
                onClick={() => handleSort('congregation')}
              >
                <div className="flex items-center space-x-1">
                  <span>Congregation</span>
                  <SortIcon field="congregation" />
                </div>
              </th>
              
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
                Forms of Service
              </th>
              
              <th 
                className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[8%]"
                onClick={() => handleSort('isActive')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  <SortIcon field="isActive" />
                </div>
              </th>
              
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                User Account
              </th>
              
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                Actions
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAttendants.map((attendant) => (
              <tr key={attendant.id} className="hover:bg-gray-50">
                {onSelect && (
                  <td className="px-2 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(attendant.id)}
                      onChange={(e) => handleSelectOne(attendant.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                )}
                
                <td className="px-2 py-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-6 w-6">
                      <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-xs">
                          {attendant.firstName[0]}{attendant.lastName[0]}
                        </span>
                      </div>
                    </div>
                    <div className="ml-2 truncate">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {attendant.firstName} {attendant.lastName}
                      </div>
                    </div>
                  </div>
                </td>
                
                <td className="px-2 py-3 text-sm text-gray-500">
                  <div className="truncate" title={attendant.email}>
                    {attendant.email}
                  </div>
                </td>
                
                <td className="px-2 py-3 text-sm text-gray-500">
                  <div className="truncate">
                    {attendant.phone || 'N/A'}
                  </div>
                </td>
                
                <td className="px-2 py-3 text-sm text-gray-500">
                  <div className="truncate" title={attendant.congregation}>
                    {attendant.congregation}
                  </div>
                </td>
                
                <td className="px-2 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(attendant.formsOfService as any[])?.slice(0, 2).map((form, index) => (
                      <FormOfServiceBadge key={index} form={form} />
                    ))}
                    {(attendant.formsOfService as any[])?.length > 2 && (
                      <span className="text-xs text-gray-500">+{(attendant.formsOfService as any[]).length - 2}</span>
                    )}
                  </div>
                </td>
                
                <td className="px-2 py-3">
                  <StatusBadge isActive={attendant.isActive} />
                </td>
                
                <td className="px-2 py-3 text-sm text-gray-500">
                  {attendant.users ? (
                    <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Linked
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      No Account
                    </span>
                  )}
                </td>
                
                <td className="px-2 py-3 text-sm font-medium">
                  <div className="flex flex-col gap-1">
                    {onEdit && (
                      <ActionButton
                        onClick={() => onEdit(attendant)}
                        variant="secondary"
                        size="sm"
                      >
                        Edit
                      </ActionButton>
                    )}
                    {onDelete && (
                      <ActionButton
                        onClick={() => onDelete(attendant.id)}
                        variant="danger"
                        size="sm"
                      >
                        Delete
                      </ActionButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
