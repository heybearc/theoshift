import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useVolunteerEvents } from '@/lib/events'

type Arrival = {
  id: string
  firstName: string
  lastName: string
  congregation: string
  checkedIn: boolean
  lanyardBadge: string | null
  positionIds: string[]
  assignments: Array<{ positionId: string; positionName: string; when: string }>
  countTimes: Array<{ label: string; when: string }>
}

type FilterId = 'all' | 'mine' | 'missing-checkin' | 'missing-lanyard'

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'My positions' },
  { id: 'missing-checkin', label: 'Not checked in' },
  { id: 'missing-lanyard', label: 'No lanyard' },
]

export default function ArrivalsScreen() {
  const { token, apiBase } = useAuth()
  const { eventId } = useVolunteerEvents()
  const [people, setPeople] = useState<Arrival[]>([])
  const [myPositionIds, setMyPositionIds] = useState<string[]>([])
  const [scope, setScope] = useState<'event' | 'mine'>('mine')
  const [filter, setFilter] = useState<FilterId>('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token || !eventId) return
    const result = await apiRequest<{
      people: Arrival[]
      scope: 'event' | 'mine'
      myPositions: Array<{ id: string }>
    }>(apiBase, `/api/volunteer/arrivals?eventId=${encodeURIComponent(eventId)}`, { token })
    setPeople(result.people || [])
    setMyPositionIds((result.myPositions || []).map((position) => position.id))
    setScope(result.scope === 'event' ? 'event' : 'mine')
  }, [token, eventId, apiBase])

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      setLoading(true)
      load()
        .catch((err: Error) => {
          if (!cancelled) setError(err.message)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return () => {
        cancelled = true
      }
    }, [load])
  )

  const needle = query.trim().toLowerCase()
  const mine = new Set(myPositionIds)
  const visible = people.filter((person) => {
    if (filter === 'mine' && !person.positionIds.some((id) => mine.has(id))) return false
    if (filter === 'missing-checkin' && person.checkedIn) return false
    if (filter === 'missing-lanyard' && person.lanyardBadge) return false
    if (!needle) return true
    const haystack = `${person.firstName} ${person.lastName} ${person.congregation} ${person.assignments
      .map((assignment) => assignment.positionName)
      .join(' ')}`.toLowerCase()
    return haystack.includes(needle)
  })

  const checkedInCount = visible.filter((person) => person.checkedIn).length
  const lanyardCount = visible.filter((person) => person.lanyardBadge).length
  const filters = FILTERS.filter((item) => item.id !== 'mine' || myPositionIds.length > 0)

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.summary}>
        {scope === 'event' ? 'Everyone on this event' : 'Volunteers assigned to you'} · {checkedInCount} checked in ·{' '}
        {lanyardCount} with a lanyard
      </Text>
      <View style={styles.filters}>
        {filters.map((item) => {
          const selected = item.id === filter
          return (
            <Pressable
              key={item.id}
              onPress={() => setFilter(item.id)}
              style={[styles.filter, selected && styles.filterSelected]}
            >
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item.label}</Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search name or congregation"
        style={styles.input}
      />
      {loading ? <ActivityIndicator style={styles.spinner} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && visible.length === 0 ? (
        <Text style={styles.empty}>
          {people.length === 0
            ? 'No volunteers are linked to you on this event yet.'
            : 'No one matches this search.'}
        </Text>
      ) : null}
      {visible.map((person) => (
        <View key={person.id} style={styles.card}>
          <Text style={styles.title}>
            {person.lastName}, {person.firstName}
          </Text>
          {person.congregation ? <Text style={styles.meta}>{person.congregation}</Text> : null}
          <Text style={styles.status}>{person.checkedIn ? 'Checked in' : 'Not checked in'}</Text>
          <Text style={styles.status}>
            {person.lanyardBadge ? `Lanyard ${person.lanyardBadge}` : 'No lanyard'}
          </Text>
          {person.assignments.length === 0 ? <Text style={styles.meta}>No assignment yet</Text> : null}
          {person.assignments.map((assignment) => (
            <Text key={`${person.id}-${assignment.positionId}-${assignment.when}`} style={styles.detail}>
              {assignment.positionName}
              {assignment.when ? ` · ${assignment.when}` : ''}
            </Text>
          ))}
          {person.countTimes.map((count) => (
            <Text key={`${person.id}-count-${count.label}-${count.when}`} style={styles.detail}>
              Count: {count.label}
              {count.when ? ` · ${count.when}` : ''}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  summary: { color: '#334155', lineHeight: 20 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  filter: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  filterSelected: { backgroundColor: '#1e40af', borderColor: '#1e40af' },
  filterText: { color: '#334155', fontWeight: '600' },
  filterTextSelected: { color: '#fff' },
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  card: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 4, color: '#475569' },
  detail: { marginTop: 4, color: '#334155' },
  status: { marginTop: 6, fontWeight: '600', color: '#1e3a8a' },
  empty: { marginTop: 16, color: '#475569', lineHeight: 22 },
  error: { marginTop: 12, color: '#b91c1c' },
  spinner: { marginTop: 16 },
})
