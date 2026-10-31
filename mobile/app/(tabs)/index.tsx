import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useVolunteerEvents } from '@/lib/events'

type Assignment = {
  id: string
  positionName: string
  location?: string
  startTime: string
  endTime: string
  overseer?: string
  keyman?: string
}

type Dashboard = {
  event: { name: string }
  assignments: Assignment[]
}

export default function AssignmentsScreen() {
  const { token, volunteer, apiBase, signOut } = useAuth()
  const { events, eventId, setEventId, loading: eventsLoading, error: eventsError, reload } = useVolunteerEvents()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || !volunteer || !eventId) {
      setDashboard(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    apiRequest<{ data: Dashboard }>(
      apiBase,
      `/api/volunteer/dashboard?volunteerId=${encodeURIComponent(volunteer.id)}&eventId=${encodeURIComponent(eventId)}`,
      { token }
    )
      .then((result) => {
        if (!cancelled) setDashboard(result.data)
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
  }, [token, volunteer, apiBase, eventId])

  const name = volunteer ? `${volunteer.firstName} ${volunteer.lastName}`.trim() : ''

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.greeting}>{name}</Text>
        <Pressable onPress={() => void signOut()}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      {eventsLoading ? <ActivityIndicator style={styles.spinner} /> : null}
      {eventsError ? <Text style={styles.error}>{eventsError}</Text> : null}
      {!eventsLoading && events.length === 0 ? (
        <Text style={styles.empty}>No current events are on your roster yet.</Text>
      ) : null}

      {events.length > 1 ? (
        <View style={styles.eventList}>
          {events.map((event) => {
            const selected = event.id === eventId
            return (
              <Pressable
                key={event.id}
                onPress={() => setEventId(event.id)}
                style={[styles.eventChip, selected && styles.eventChipSelected]}
              >
                <Text style={[styles.eventChipText, selected && styles.eventChipTextSelected]}>{event.name}</Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}

      {dashboard?.event ? <Text style={styles.eventTitle}>{dashboard.event.name}</Text> : null}
      {loading ? <ActivityIndicator style={styles.spinner} /> : null}
      {error ? (
        <View>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={reload}>
            <Text style={styles.signOut}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {dashboard && dashboard.assignments.length === 0 ? (
        <Text style={styles.empty}>No assignments yet. Check back later or contact your overseer.</Text>
      ) : null}

      {dashboard?.assignments.map((assignment) => (
        <View key={assignment.id} style={styles.card}>
          <Text style={styles.position}>{assignment.positionName}</Text>
          {assignment.location ? <Text style={styles.meta}>{assignment.location}</Text> : null}
          <Text style={styles.meta}>
            {assignment.startTime === 'All Day'
              ? 'All day'
              : `${assignment.startTime}${assignment.endTime ? ` – ${assignment.endTime}` : ''}`}
          </Text>
          {assignment.overseer ? <Text style={styles.meta}>Overseer: {assignment.overseer}</Text> : null}
          {assignment.keyman ? <Text style={styles.meta}>Keyman: {assignment.keyman}</Text> : null}
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 20, fontWeight: '700', color: '#0f172a', flex: 1, marginRight: 12 },
  signOut: { color: '#1e40af', fontWeight: '600' },
  eventList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  eventChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  eventChipSelected: { backgroundColor: '#1e40af', borderColor: '#1e40af' },
  eventChipText: { color: '#334155', fontWeight: '600' },
  eventChipTextSelected: { color: '#fff' },
  eventTitle: { marginTop: 20, fontSize: 16, fontWeight: '700', color: '#1e3a8a' },
  card: { marginTop: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  position: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 4, color: '#475569' },
  empty: { marginTop: 20, color: '#475569', lineHeight: 22 },
  error: { marginTop: 16, color: '#b91c1c' },
  spinner: { marginTop: 24 },
})
