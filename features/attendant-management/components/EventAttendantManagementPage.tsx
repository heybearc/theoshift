import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Link from 'next/link'

// APEX GUARDIAN Event-Specific Attendant Management
// Industry best practice: Event-scoped component architecture

// Feature components
import { useEventAttendants } from '../hooks/useEventAttendants'
import AttendantFilters from './molecules/AttendantFilters'
import AttendantTable from './organisms/AttendantTable'
import AttendantCreateModal from './organisms/AttendantCreateModal'
import BulkImportModal from './organisms/BulkImportModal'
import AttendantStatsCard from './organisms/AttendantStatsCard'
import ActionButton from './atoms/ActionButton'

// Types
import { Attendant, AttendantCreateInput, AttendantBulkImport } from '../types'

interface EventAttendantManagementPageProps {
  eventId: string
  eventName?: string
}

export default function EventAttendantManagementPage({ 
  eventId, 
  eventName 
}: EventAttendantManagementPageProps) {
  const router = useRouter()
  const { data: session } = useSession()

  // Event-specific attendant management
  const {
    attendants,
    loading,
    error,
    pagination,
    stats,
    filters,
    eventInfo,
    setFilters,
    setPage,
    setPageSize,
    refresh,
    createAttendant,
    updateAttendant,
    deleteAttendant,
    bulkUpdateStatus,
    bulkDelete,
    bulkImport
  } = useEventAttendants({
    eventId,
    pageSize: 25,
    includeStats: true
  })

  // Extract unique congregations for filter
  useEffect(() => {
    const uniqueCongregations = Array.from(
      new Set(attendants.map(a => a.congregation).filter(Boolean))
    ).sort()
    setCongregations(uniqueCongregations)
  }, [attendants])

  // Local state
  const [congregations, setCongregations] = useState<string[]>([])
  const [selectedAttendantIds, setSelectedAttendantIds] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBulkImportModal, setShowBulkImportModal] = useState(false)
  const [editingAttendant, setEditingAttendant] = useState<Attendant | null>(null)

  // Permission check
  const canManageAttendants = session?.user && ['ADMIN', 'OVERSEER'].includes((session.user as any).role)

  // Event handlers
  const handleCreateAttendant = () => {
    setEditingAttendant(null)
    setShowCreateModal(true)
  }

  const handleEditAttendant = (attendant: Attendant) => {
    setEditingAttendant(attendant)
    setShowCreateModal(true)
  }

  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setEditingAttendant(null)
  }

  const handleSaveAttendant = async (data: AttendantCreateInput) => {
    try {
      if (editingAttendant) {
        await updateAttendant(editingAttendant.id, data)
      } else {
        await createAttendant(data)
      }
      handleCloseCreateModal()
    } catch (error) {
      console.error('Error saving attendant:', error)
      // Error is handled by the hook
    }
  }

  const handleDeleteAttendant = async (attendantId: string) => {
    if (confirm('Are you sure you want to delete this attendant?')) {
      try {
        await deleteAttendant(attendantId)
      } catch (error) {
        console.error('Error deleting attendant:', error)
        // Error is handled by the hook
      }
    }
  }

  const handleBulkStatusChange = async (attendantIds: string[], isActive: boolean) => {
    try {
      await bulkUpdateStatus(attendantIds, isActive)
      setSelectedAttendantIds([])
    } catch (error) {
      console.error('Error updating attendant status:', error)
      // Error is handled by the hook
    }
  }

  const handleBulkDelete = async (attendantIds: string[]) => {
    if (confirm(`Are you sure you want to delete ${attendantIds.length} attendant(s)?`)) {
      try {
        await bulkDelete(attendantIds)
        setSelectedAttendantIds([])
      } catch (error) {
        console.error('Error deleting attendants:', error)
        // Error is handled by the hook
      }
    }
  }

  const handleBulkImport = async (data: AttendantBulkImport) => {
    try {
      await bulkImport(data)
      setShowBulkImportModal(false)
    } catch (error) {
      console.error('Error importing attendants:', error)
      // Error is handled by the hook
    }
  }

  if (!canManageAttendants) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to manage attendants.</p>
          <Link href="/events" className="text-blue-600 hover:text-blue-800">
            Return to Events
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Head>
        <title>{eventInfo.eventName || eventName || 'Event'} - Attendants | JW Attendant Scheduler</title>
      </Head>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Attendants</h1>
          <p className="text-gray-600">
            Manage attendants for {eventInfo.eventName || eventName || 'this event'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link 
            href={`/events/${eventId}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Event
          </Link>
          
          <ActionButton
            onClick={() => setShowBulkImportModal(true)}
            variant="secondary"
            size="sm"
          >
            Bulk Import
          </ActionButton>
          
          <ActionButton
            onClick={handleCreateAttendant}
            variant="primary"
            size="sm"
          >
            Add Attendant
          </ActionButton>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <AttendantStatsCard
          stats={stats}
          loading={loading}
        />
      )}

      {/* Filters */}
      <AttendantFilters
        filters={filters}
        onFiltersChange={setFilters}
        congregations={congregations}
        loading={loading}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedAttendantIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-900">
                {selectedAttendantIds.length} attendant(s) selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ActionButton
                onClick={() => setSelectedAttendantIds([])}
                variant="secondary"
                size="sm"
              >
                Clear Selection
              </ActionButton>
              <ActionButton
                onClick={() => handleBulkStatusChange(selectedAttendantIds, true)}
                variant="success"
                size="sm"
              >
                Activate Selected
              </ActionButton>
              <ActionButton
                onClick={() => handleBulkStatusChange(selectedAttendantIds, false)}
                variant="secondary"
                size="sm"
              >
                Deactivate Selected
              </ActionButton>
              <ActionButton
                onClick={() => handleBulkDelete(selectedAttendantIds)}
                variant="danger"
                size="sm"
              >
                Delete Selected
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Attendants Table */}
      <div className="bg-white shadow rounded-lg">
        <AttendantTable
          attendants={attendants}
          loading={loading}
          onEdit={handleEditAttendant}
          onDelete={handleDeleteAttendant}
          onSelect={setSelectedAttendantIds}
          selectedIds={selectedAttendantIds}
          onBulkStatusChange={handleBulkStatusChange}
        />
      </div>

      {/* Enhanced Pagination */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 bg-white rounded-lg shadow px-4">
        {/* Results info and page size selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          
          <div className="flex items-center gap-2">
            <label htmlFor="pageSize" className="text-sm text-gray-700">
              Show:
            </label>
            <select
              id="pageSize"
              value={pagination.limit === 999999 ? -1 : pagination.limit}
              onChange={(e) => {
                console.log('APEX GUARDIAN: Select changed, setPageSize function:', typeof setPageSize)
                console.log('APEX GUARDIAN: New value:', e.target.value)
                e.preventDefault()
                setPageSize(Number(e.target.value))
              }}
              disabled={loading}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={-1}>All</option>
            </select>
            <span className="text-sm text-gray-700">per page</span>
          </div>
          
          {/* Debug button - always visible */}
          <ActionButton
            onClick={() => {
              console.log('APEX GUARDIAN: Test button clicked!')
              console.log('setPageSize type:', typeof setPageSize)
              console.log('Current pagination:', pagination)
              setPageSize(50)
            }}
            variant="primary"
            size="sm"
            type="button"
          >
            Test Button (Set to 50)
          </ActionButton>
        </div>

        {/* Pagination controls - show if there are multiple pages */}
        {pagination.pages > 1 && (
          <div className="flex items-center gap-2">
            {/* Previous button */}
            <ActionButton
              onClick={() => {
                console.log('APEX GUARDIAN: Previous button clicked, setPage function:', typeof setPage)
                console.log('APEX GUARDIAN: Current pagination:', pagination)
                setPage(pagination.page - 1)
              }}
              disabled={pagination.page <= 1 || loading}
              variant="secondary"
              size="sm"
              type="button"
            >
              Previous
            </ActionButton>

            {/* Page info */}
            <span className="px-3 py-1 text-sm text-gray-700">
              Page {pagination.page} of {pagination.pages}
            </span>

            {/* Next button */}
            <ActionButton
              onClick={() => {
                console.log('APEX GUARDIAN: Next button clicked, setPage function:', typeof setPage)
                console.log('APEX GUARDIAN: Current pagination:', pagination)
                setPage(pagination.page + 1)
              }}
              disabled={pagination.page >= pagination.pages || loading}
              variant="secondary"
              size="sm"
              type="button"
            >
              Next
            </ActionButton>
          </div>
        )}
      </div>

      {/* Modals - Outside main container for proper z-index */}
      <AttendantCreateModal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        onSave={handleSaveAttendant}
        attendant={editingAttendant}
      />

      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onImport={handleBulkImport}
      />
    </div>
  )
}
