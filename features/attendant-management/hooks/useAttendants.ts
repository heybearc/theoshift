import { useState, useEffect, useCallback } from 'react'
import { attendantService } from '../services/attendantService'
import { Attendant, AttendantSearchFilters, AttendantStats } from '../types'

interface UseAttendan tsOptions {
  eventId?: string
  initialFilters?: AttendantSearchFilters
  pageSize?: number
  includeStats?: boolean
}

interface UseAttendan tsReturn {
  attendants: Attendant[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  stats?: AttendantStats
  filters: AttendantSearchFilters
  setFilters: (filters: AttendantSearchFilters) => void
  setPage: (page: number) => void
  refresh: () => Promise<void>
  createAttendant: (data: any) => Promise<void>
  updateAttendant: (id: string, data: any) => Promise<void>
  deleteAttendant: (id: string) => Promise<void>
}

export function useAttendants(options: UseAttendan tsOptions = {}): UseAttendan tsReturn {
  const {
    eventId,
    initialFilters = {},
    pageSize = 10,
    includeStats = false
  } = options

  const [attendants, setAttendants] = useState<Attendant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<AttendantStats | undefined>()
  const [filters, setFilters] = useState<AttendantSearchFilters>(initialFilters)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    pages: 0
  })

  const fetchAttendants = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = eventId
        ? await attendantService.getEventAttendants(eventId, filters)
        : await attendantService.getAttendants({
            ...filters,
            page: pagination.page,
            limit: pagination.limit,
            includeStats
          })

      if (response.success) {
        setAttendants(response.data.attendants)
        setPagination(response.data.pagination)
        if (response.data.stats) {
          setStats(response.data.stats)
        }
      } else {
        setError(response.error || 'Failed to fetch attendants')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [eventId, filters, pagination.page, pagination.limit, includeStats])

  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  const refresh = useCallback(async () => {
    await fetchAttendants()
  }, [fetchAttendants])

  const createAttendant = useCallback(async (data: any) => {
    try {
      setError(null)
      const response = await attendantService.createAttendant(data)
      
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
  }, [refresh])

  const updateAttendant = useCallback(async (id: string, data: any) => {
    try {
      setError(null)
      const response = await attendantService.updateAttendant(id, data)
      
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
  }, [refresh])

  const deleteAttendant = useCallback(async (id: string) => {
    try {
      setError(null)
      const response = await attendantService.deleteAttendant(id)
      
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
  }, [refresh])

  useEffect(() => {
    fetchAttendants()
  }, [fetchAttendants])

  return {
    attendants,
    loading,
    error,
    pagination,
    stats,
    filters,
    setFilters,
    setPage,
    refresh,
    createAttendant,
    updateAttendant,
    deleteAttendant
  }
}
