import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import PinnedAnnouncement from '@/components/PinnedAnnouncement'
import { useAuth } from '@/lib/auth'
import { countIsLocked, formatCountWhen, profileNeedsAttention, useDashboard } from '@/lib/dashboard'
import { useVolunteerEvents } from '@/lib/events'
import { openProtectedDocument } from '@/lib/openDocument'

export default function AssignmentsScreen() {
  const { volunteer, signOut, token, apiBase } = useAuth()
  const { events, eventId, setEventId, loading: eventsLoading, error: eventsError, reload } = useVolunteerEvents()
  const { data: dashboard, loading, error, reload: reloadDashboard } = useDashboard()
  const [diagramError, setDiagramError] = useState('')
  const canRevise = Boolean(dashboard?.canReviseSubmittedCounts)
  const countGroups = dashboard?.activeCountGroups || []
  const countSessions = dashboard?.activeCountSessions || []

  useEffect(() => {
    if (!dashboard) return
    const timer = setInterval(() => {
      void reloadDashboard()
    }, 15000)
    return () => clearInterval(timer)
  }, [dashboard, reloadDashboard])

  async function openDiagram() {
    const diagram = dashboard?.stationDiagram
    if (!token || !eventId || !diagram) return
    setDiagramError('')
    try {
      await openProtectedDocument({
        apiBase,
        eventId,
        documentId: diagram.documentId,
        fileName: diagram.fileName,
        token,
      })
    } catch (err) {
      setDiagramError(err instanceof Error ? err.message : 'Could not open the station diagram')
    }
  }

  const name = volunteer ? `${volunteer.firstName} ${volunteer.lastName}`.trim() : ''

  if (!token) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>Oversight</Text>
        <Text style={styles.empty}>
          Assignments and chat use a volunteer sign-in. Event tools, positions, volunteers, and admin are on the Tools tab.
        </Text>
        <Pressable onPress={() => router.push('/tools')} style={styles.signOutButton}>
          <Text style={styles.signOut}>Open Tools</Text>
        </Pressable>
      </ScrollView>
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.greeting}>{name}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void signOut()}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutPressed]}
        >
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

      {profileNeedsAttention(dashboard?.volunteer) ? (
        <Pressable style={styles.banner} onPress={() => router.push('/more/profile')}>
          <Text style={styles.bannerText}>Confirm your email and phone</Text>
        </Pressable>
      ) : null}

      {dashboard?.event ? <Text style={styles.eventTitle}>{dashboard.event.name}</Text> : null}
      {eventId ? <PinnedAnnouncement eventId={eventId} /> : null}

      {dashboard?.nextCountAvailableAt ? (
        <Text style={styles.note}>
          Your next count opens at {formatCountWhen(dashboard.nextCountAvailableAt)}. This page updates on its own.
        </Text>
      ) : null}

      {countGroups.map((group) => {
        const submitted = Boolean(group.hasSubmitted) || group.existingCount != null
        const locked = countIsLocked(submitted, canRevise)
        return (
          <Pressable
            key={group.groupId}
            style={[styles.card, styles.countCard, locked && styles.lockedCard]}
            disabled={locked}
            onPress={() =>
              router.push({ pathname: '/count', params: { sessionId: group.sessionId, groupId: group.groupId } })
            }
          >
            <Text style={styles.countLabel}>Section / group</Text>
            <Text style={styles.position}>{group.groupName}</Text>
            <Text style={styles.meta}>
              {group.sessionName}
              {group.countTime ? ` · ${formatCountWhen(group.countTime)}` : ''}
            </Text>
            <Text style={styles.meta}>
              {locked
                ? `Submitted${group.existingCount != null ? ` · ${group.existingCount}` : ''}. An overseer or event staff can change this count.`
                : 'One total for all stations in this group'}
            </Text>
          </Pressable>
        )
      })}

      {countSessions.map((session) => {
        const stations = session.stations || []
        const submitted = stations.length > 0 && stations.every((station) => station.hasSubmitted || station.existingCount != null)
        const locked = countIsLocked(submitted, canRevise)
        return (
          <Pressable
            key={session.id}
            style={[styles.card, styles.countCard, locked && styles.lockedCard]}
            disabled={locked}
            onPress={() => router.push({ pathname: '/count', params: { sessionId: session.id } })}
          >
            <Text style={styles.countLabel}>Attendance count</Text>
            <Text style={styles.position}>{session.sessionName}</Text>
            {session.countTime ? <Text style={styles.meta}>{formatCountWhen(session.countTime)}</Text> : null}
            {locked ? (
              stations.map((station) => (
                <Text key={station.positionId} style={styles.meta}>
                  Submitted · {station.name}
                  {station.existingCount != null ? ` · ${station.existingCount}` : ''}
                </Text>
              ))
            ) : (
              <Text style={styles.meta}>Enter the count for your station</Text>
            )}
            {locked ? <Text style={styles.meta}>An overseer or event staff can change this count.</Text> : null}
          </Pressable>
        )
      })}

      {dashboard?.stationDiagram ? (
        <Pressable style={styles.card} onPress={() => void openDiagram()}>
          <Text style={styles.position}>{dashboard.stationDiagram.title || 'Station diagram'}</Text>
          <Text style={styles.meta}>Open the station diagram</Text>
        </Pressable>
      ) : null}
      {diagramError ? <Text style={styles.error}>{diagramError}</Text> : null}
      {loading ? <ActivityIndicator style={styles.spinner} /> : null}
      {error ? (
        <View>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => void reloadDashboard()}>
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
  signOutButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutPressed: { backgroundColor: '#eff6ff' },
  signOut: { color: '#1e40af', fontWeight: '700' },
  eventList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  eventChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: 'center', backgroundColor: '#fff' },
  eventChipSelected: { backgroundColor: '#1e40af', borderColor: '#1e40af' },
  eventChipText: { color: '#334155', fontWeight: '600' },
  eventChipTextSelected: { color: '#fff' },
  banner: { marginTop: 16, backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  bannerText: { color: '#1e3a8a', fontWeight: '700' },
  eventTitle: { marginTop: 20, fontSize: 16, fontWeight: '700', color: '#1e3a8a' },
  card: { marginTop: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  position: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 4, color: '#475569' },
  note: { marginTop: 12, color: '#475569', lineHeight: 20 },
  countCard: { borderColor: '#99f6e4', backgroundColor: '#f0fdfa' },
  lockedCard: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
  countLabel: { fontSize: 12, fontWeight: '700', color: '#0f766e', textTransform: 'uppercase' },
  empty: { marginTop: 20, color: '#475569', lineHeight: 22 },
  error: { marginTop: 16, color: '#b91c1c' },
  spinner: { marginTop: 24 },
})
