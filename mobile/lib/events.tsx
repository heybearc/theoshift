import { createContext, useContext, useEffect, useState } from 'react'
import { apiRequest } from './api'
import { useAuth } from './auth'

export type VolunteerEvent = {
  id: string
  name: string
  eventType: string
  startDate: string | null
  endDate: string | null
  status: string
}

type EventContextValue = {
  events: VolunteerEvent[]
  eventId: string | null
  setEventId: (id: string) => void
  loading: boolean
  error: string
  reload: () => void
}

const EventContext = createContext<EventContextValue | null>(null)

export function EventProvider({ children }: { children: React.ReactNode }) {
  const { token, volunteer, apiBase } = useAuth()
  const [events, setEvents] = useState<VolunteerEvent[]>([])
  const [eventId, setEventId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!token || !volunteer) return
    let cancelled = false
    setLoading(true)
    setError('')
    apiRequest<{ data: { events: VolunteerEvent[] } }>(
      apiBase,
      `/api/volunteer/events?volunteerId=${encodeURIComponent(volunteer.id)}`,
      { token }
    )
      .then((result) => {
        if (cancelled) return
        const list = result.data?.events || []
        setEvents(list)
        setEventId((current) => current && list.some((event) => event.id === current) ? current : list[0]?.id || null)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, volunteer, apiBase, reloadKey])

  return (
    <EventContext.Provider
      value={{
        events,
        eventId,
        setEventId,
        loading,
        error,
        reload: () => setReloadKey((value) => value + 1),
      }}
    >
      {children}
    </EventContext.Provider>
  )
}

export function useVolunteerEvents() {
  const value = useContext(EventContext)
  if (!value) throw new Error('useVolunteerEvents must be used within EventProvider')
  return value
}
