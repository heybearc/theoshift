import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from './api'
import { useAuth } from './auth'
import { useVolunteerEvents } from './events'

export type DashboardDocument = {
  id: string
  title: string
  description?: string | null
  fileName: string
  fileType?: string | null
  fileSize?: number | null
}

export type DashboardAnnouncement = {
  id: string
  title: string
  message: string
  type: string
}

export type DashboardVolunteer = {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  profileVerificationRequired?: boolean
}

export type DashboardAssignment = {
  id: string
  positionName: string
  location?: string
  startTime: string
  endTime: string
  overseer?: string
  keyman?: string
}

export type DashboardData = {
  volunteer: DashboardVolunteer
  event: { id: string; name: string }
  assignments: DashboardAssignment[]
  documents: DashboardDocument[]
  announcements: DashboardAnnouncement[]
  isIVSTeamMember: boolean
}

export function useDashboard() {
  const { token, volunteer, apiBase } = useAuth()
  const { eventId } = useVolunteerEvents()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!token || !volunteer || !eventId) {
      setData(null)
      return
    }
    setError('')
    const result = await apiRequest<{ data: DashboardData }>(
      apiBase,
      `/api/volunteer/dashboard?volunteerId=${encodeURIComponent(volunteer.id)}&eventId=${encodeURIComponent(eventId)}`,
      { token }
    )
    setData(result.data)
  }, [token, volunteer, apiBase, eventId])

  useEffect(() => {
    if (!token || !volunteer || !eventId) {
      setData(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    reload()
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reload, token, volunteer, eventId])

  return { data, loading, error, reload, eventId }
}

export function profileNeedsAttention(volunteer: DashboardVolunteer | undefined): boolean {
  if (!volunteer) return false
  const phoneDigits = (volunteer.phone || '').replace(/\D/g, '')
  return Boolean(volunteer.profileVerificationRequired) || phoneDigits.length !== 10 || !volunteer.email
}
