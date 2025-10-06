// APEX GUARDIAN Event-Specific Attendants Hook
// Industry best practice: Event-scoped state management

import { useState, useEffect, useCallback } from 'react'
import { eventAttendantService } from '../services/eventAttendantService'
import { Attendant, AttendantSearchFilters, AttendantStats } from '../types'

interface UseEventAttendantsOptions {
  eventId: string
  pageSize?: number
  includeStats?: boolean
  initialFilters?: AttendantSearchFilters
}

interface UseEventAttendantsReturn {
  attendants: Attendant[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  stats: AttendantStats | null
  filters: AttendantSearchFilters
  eventInfo: {
    eventId: string
    eventName?: string
  }
  
  // Actions
  setFilters: (filters: AttendantSearchFilters) => void
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  refresh: () => Promise<void>
  
  // CRUD operations
  createAttendant: (data: any) => Promise<void>
  updateAttendant: (attendantId: string, data: any) => Promise<void>
  deleteAttendant: (attendantId: string) => Promise<void>
  
  // Bulk operations
  bulkUpdateStatus: (attendantIds: string[], isActive: boolean) => Promise<void>
  bulkDelete: (attendantIds: string[]) => Promise<void>
  bulkImport: (data: any) => Promise<void>
}

export function useEventAttendants({
  eventId,
  pageSize = 25,
  includeStats = true,
  initialFilters = {}
}: UseEventAttendantsOptions): UseEventAttendantsReturn {
  const [attendants, setAttendants] = useState<Attendant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<AttendantStats | null>(null)
  const [eventInfo, setEventInfo] = useState({eventId, eventName: undefined as string | undefined })
  const [filters, setFilters] = useState<AttendantSearchFilters>(initialFilters)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    pages: 0
  })

  const fetchAttendants = useCallback(async () => {
    if (!eventId) {
      console.error('No eventId provided to useEventAttendants')
      return
    }

    try {
      console.log('APEX GUARDIAN: fetchEventAttendants called with:')
      console.log('- eventId:', eventId)
      console.log('- pagination:', pagination)
      console.log('- filters:', filters)
      
      setLoading(true)
      setError(null)

      const response = await eventAttendantService.getEventAttendants(eventId, {
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      })
      
      console.log('APEX GUARDIAN: API response:', response)
      console.log('APEX GUARDIAN: Attendants returned:', response.data?.attendants?.length || 0)

      if (response.success && response.data) {
        setAttendants(response.data.attendants || [])
        setPagination(response.data.pagination || { page: 1, limit: 25, total: 0, pages: 0 })
        setEventInfo({
          eventId: response.data.eventId || eventId,
          eventName: response.data.eventName
        })
        if (response.data.stats) {
          setStats(response.data.stats)
        } else {
          setStats(null)
        }
      } else {
        setError(response.error || 'Failed to fetch event attendants')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      console.error('APEX GUARDIAN: fetchEventAttendants error:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [eventId, filters, pagination.page, pagination.limit, includeStats])

  const setPage = useCallback((page: number) => {
    console.log('APEX GUARDIAN: Setting page to:', page)
    setPagination(prev => {
      const newPagination = { ...prev, page }
      console.log('APEX GUARDIAN: New pagination state:', newPagination)
      return newPagination
    })
  }, [])

  const setPageSize = useCallback((pageSize: number) => {
    console.log('APEX GUARDIAN: Setting page size to:', pageSize)
    setPagination(prev => {
      const newPagination = { 
        ...prev, 
        limit: pageSize === -1 ? 999999 : pageSize,
        page: 1 // Reset to first page when changing page size
      }
      console.log('APEX GUARDIAN: New pagination state:', newPagination)
      return newPagination
    })
  }, [])

  const refresh = useCallback(async () => {
    await fetchAttendants()
  }, [fetchAttendants])

  const createAttendant = useCallback(async (data: any) => {
    try {
      setError(null)
      const response = await eventAttendantService.createEventAttendant(eventId, data)
      
      if (response.success) {
        await refresh()
      } else {
        throw new Error(response.error || 'Failed to create attendant')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create attendant'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [eventId, refresh])

  const updateAttendant = useCallback(async (attendantId: string, data: any) => {
    try {
      setError(null)
      const response = await eventAttendantService.updateEventAttendant(eventId, attendantId, data)
      
      if (response.success) {
        await refresh()
      } else {
        throw new Error(response.error || 'Failed to update attendant')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update attendant'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [eventId, refresh])

  const deleteAttendant = useCallback(async (attendantId: string) => {
    try {
      setError(null)
      const response = await eventAttendantService.deleteEventAttendant(eventId, attendantId)
      
      if (response.success) {
        await refresh()
      } else {
        throw new Error('Failed to delete attendant')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete attendant'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [eventId, refresh])

  const bulkUpdateStatus = useCallback(async (attendantIds: string[], isActive: boolean) => {
    try {
      setError(null)
      await eventAttendantService.bulkUpdateEventAttendantStatus(eventId, attendantIds, isActive)
      await refresh()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bulk update status'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [eventId, refresh])

  const bulkDelete = useCallback(async (attendantIds: string[]) => {
    try {
      setLoading(true)
      setError(null)
      
      // For now, just remove from local state
      // TODO: Implement proper bulk delete API
      setAttendants(prev => prev.filter(a => !attendantIds.includes(a.id)))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete attendants')
    } finally {
      setLoading(false)
    }
  }, [])

  const bulkImport = useCallback(async (data: any) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await eventAttendantService.bulkImportEventAttendants(eventId, data)
      
      if (response.success) {
        await fetchAttendants()
      } else {
        setError(response.error || 'Failed to import attendants')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import attendants')
    } finally {
      setLoading(false)
    }
  }, [eventId, fetchAttendants])

  useEffect(() => {
    if (eventId) {
      fetchAttendants()
    }
  }, [fetchAttendants])

  return {
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
  }
}
