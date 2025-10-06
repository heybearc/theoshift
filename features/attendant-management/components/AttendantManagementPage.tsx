import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Link from 'next/link'

// Feature components
import { useAttendants } from '../hooks/useAttendants'
import { attendantService } from '../services/attendantService'
import AttendantFilters from './molecules/AttendantFilters'
import AttendantTable from './organisms/AttendantTable'
import AttendantCreateModal from './organisms/AttendantCreateModal'
import BulkImportModal from './organisms/BulkImportModal'
import AttendantStatsCard from './organisms/AttendantStatsCard'
import PaginationControls from './molecules/PaginationControls'
import ActionButton from './atoms/ActionButton'

// Types
import { Attendant, AttendantCreateInput, AttendantBulkImport } from '../types'

interface AttendantManagementPageProps {
  eventId?: string
  eventName?: string
}

export default function AttendantManagementPage({ 
  eventId, 
  eventName 
}: AttendantManagementPageProps) {
  const router = useRouter()
  const { data: session } = useSession()
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBulkImportModal, setShowBulkImportModal] = useState(false)
  const [editingAttendant, setEditingAttendant] = useState<Attendant | null>(null)
  
  // Selection state
  const [selectedAttendantIds, setSelectedAttendantIds] = useState<string[]>([])
  
  // Congregations for filter dropdown
  const [congregations, setCongregations] = useState<string[]>([])
  
  // Use the attendants hook
  const {
    attendants,
    loading,
    error,
    pagination,
    stats,
    filters,
    setFilters,
    setPage,
    setPageSize,
    refresh,
    createAttendant,
    updateAttendant,
    deleteAttendant
  } = useAttendants({
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

  // Handle attendant creation/editing
  const handleSaveAttendant = async (data: AttendantCreateInput) => {
    if (editingAttendant) {
      await updateAttendant(editingAttendant.id, data)
    } else {
      await createAttendant(data)
    }
    setEditingAttendant(null)
  }

  // Handle bulk import
  const handleBulkImport = async (data: AttendantBulkImport): Promise<any> => {
    try {
      // Call the bulk import service
      const response = await attendantService.bulkImport(data)
      await refresh() // Refresh the data after import
      return response.data
    } catch (error) {
      console.error('Bulk import error:', error)
      throw error
    }
  }

  // Handle bulk status change
  const handleBulkStatusChange = async (attendantIds: string[], isActive: boolean) => {
    try {
      // Update each attendant's status
      const updatePromises = attendantIds.map(id => 
        attendantService.updateAttendant(id, { isActive })
      )
      
      await Promise.all(updatePromises)
      await refresh() // Refresh the data after updates
      setSelectedAttendantIds([]) // Clear selection
    } catch (error) {
      console.error('Bulk status change error:', error)
      throw error
    }
  }

  // Handle attendant deletion
  const handleDeleteAttendant = async (attendantId: string) => {
    if (confirm('Are you sure you want to delete this attendant? This action cannot be undone.')) {
      await deleteAttendant(attendantId)
      setSelectedAttendantIds(prev => prev.filter(id => id !== attendantId))
    }
  }

  // Handle bulk deletion
  const handleBulkDelete = async () => {
    if (selectedAttendantIds.length === 0) return
    
    const confirmMessage = `Are you sure you want to delete ${selectedAttendantIds.length} attendant(s)? This action cannot be undone.`
    if (confirm(confirmMessage)) {
      try {
        await Promise.all(selectedAttendantIds.map(id => deleteAttendant(id)))
        setSelectedAttendantIds([])
      } catch (error) {
        console.error('Error deleting attendants:', error)
      }
    }
  }

  // Handle edit attendant
  const handleEditAttendant = (attendant: Attendant) => {
    setEditingAttendant(attendant)
    setShowCreateModal(true)
  }

  // Handle create new attendant
  const handleCreateNew = () => {
    setEditingAttendant(null)
    setShowCreateModal(true)
  }

  // Close modals
  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setEditingAttendant(null)
  }

  const pageTitle = eventId 
    ? `${eventName || 'Event'} - Attendants` 
    : 'Attendant Management'

  return (
    <>
      <Head>
        <title>{pageTitle} | JW Attendant Scheduler</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          {eventId && (
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <Link href="/events" className="hover:text-gray-700">Events</Link>
              <span>›</span>
              <Link href={`/events/${eventId}`} className="hover:text-gray-700">
                {eventName || 'Event'}
              </Link>
              <span>›</span>
              <span className="text-gray-900">Attendants</span>
            </nav>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {eventId ? 'Event Attendants' : 'Attendant Management'}
              </h1>
              <p className="text-gray-600 mt-2">
                {eventId 
                  ? `Manage attendants for ${eventName}` 
                  : 'Manage all attendants across the organization'
                }
              </p>
            </div>
            
            <div className="flex space-x-3">
              {eventId && (
                <Link
                  href={`/events/${eventId}`}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  ← Back to Event
                </Link>
              )}
              
              <ActionButton
                onClick={() => setShowBulkImportModal(true)}
                variant="secondary"
              >
                📥 Bulk Import
              </ActionButton>
              
              <ActionButton
                onClick={handleCreateNew}
                variant="primary"
              >
                + Add Attendant
              </ActionButton>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-red-800">Error</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Card */}
        {stats && !loading && (
          <div className="mb-6">
            <AttendantStatsCard stats={stats} />
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <AttendantFilters
            filters={filters}
            onFiltersChange={setFilters}
            congregations={congregations}
            loading={loading}
          />
        </div>

        {/* Bulk Actions */}
        {selectedAttendantIds.length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="ml-2 text-sm font-medium text-blue-800">
                  {selectedAttendantIds.length} attendant(s) selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  onClick={() => setSelectedAttendantIds([])}
                  variant="secondary"
                  size="sm"
                >
                  Clear Selection
                </ActionButton>
                <ActionButton
                  onClick={() => handleBulkStatusChange(selectedAttendantIds, true)}
                  variant="primary"
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
                  onClick={handleBulkDelete}
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
        <div className="mb-6">
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
                onChange={(e) => setPageSize(Number(e.target.value))}
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
          </div>

          {/* Pagination controls - only show if not showing all */}
          {pagination.limit !== 999999 && pagination.pages > 1 && (
            <div className="flex items-center gap-2">
              {/* Previous button */}
              <ActionButton
                onClick={() => setPage(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                variant="secondary"
                size="sm"
              >
                Previous
              </ActionButton>

              {/* Page info */}
              <span className="px-3 py-1 text-sm text-gray-700">
                Page {pagination.page} of {pagination.pages}
              </span>

              {/* Next button */}
              <ActionButton
                onClick={() => setPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages || loading}
                variant="secondary"
                size="sm"
              >
                Next
              </ActionButton>
            </div>
          )}
        </div>
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
        eventId={eventId}
      />
    </>
  )
}
