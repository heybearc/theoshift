import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useVolunteerEvents } from '@/lib/events'

type DayId = 'TODAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

type CheckinPerson = {
  id: string
  firstName: string
  lastName: string
  congregation: string
  department: string
  checkIns: Partial<Record<'FRIDAY' | 'SATURDAY' | 'SUNDAY', { checkedInAt: string }>>
}

const DAYS: Array<{ id: DayId; label: string }> = [
  { id: 'TODAY', label: 'Today' },
  { id: 'FRIDAY', label: 'Fri' },
  { id: 'SATURDAY', label: 'Sat' },
  { id: 'SUNDAY', label: 'Sun' },
]

export default function CheckinScreen() {
  const { token, apiBase } = useAuth()
  const { eventId } = useVolunteerEvents()
  const [day, setDay] = useState<DayId>('TODAY')
  const [today, setToday] = useState<string | null>(null)
  const [people, setPeople] = useState<CheckinPerson[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    if (!token || !eventId) return
    const result = await apiRequest<{
      volunteers: CheckinPerson[]
      today: string | null
    }>(apiBase, `/api/volunteer/early-checkin?eventId=${encodeURIComponent(eventId)}&day=${day}`, { token })
    setPeople(result.volunteers || [])
    setToday(result.today)
  }, [token, eventId, apiBase, day])

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      setLoading(true)
      const run = () =>
        load()
          .then(() => {
            if (!cancelled) setError('')
          })
          .catch((err: Error) => {
            if (!cancelled) setError(err.message)
          })
          .finally(() => {
            if (!cancelled) setLoading(false)
          })
      void run()
      const timer = setInterval(() => {
        void load().catch(() => undefined)
      }, 8000)
      return () => {
        cancelled = true
        clearInterval(timer)
      }
    }, [load])
  )

  const activeDay = day === 'TODAY' ? today : day
  const needle = query.trim().toLowerCase()
  const visible = people.filter((person) => {
    if (!needle) return true
    const haystack = `${person.firstName} ${person.lastName} ${person.congregation} ${person.department}`.toLowerCase()
    return haystack.includes(needle)
  })

  async function checkIn(person: CheckinPerson) {
    if (!token || !eventId || !activeDay) return
    setBusyId(person.id)
    setError('')
    try {
      await apiRequest(apiBase, '/api/volunteer/early-checkin/check-in', {
        method: 'POST',
        token,
        body: { eventId, volunteerId: person.id, conventionDay: activeDay },
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed')
    } finally {
      setBusyId('')
    }
  }

  function undo(person: CheckinPerson) {
    if (!activeDay || !token || !eventId) return
    Alert.alert('Undo check-in', `Undo ${activeDay.toLowerCase()} check-in for ${person.firstName} ${person.lastName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Undo',
        style: 'destructive',
        onPress: () => {
          setBusyId(person.id)
          void apiRequest(apiBase, '/api/volunteer/early-checkin/undo', {
            method: 'POST',
            token,
            body: { eventId, volunteerId: person.id, conventionDay: activeDay },
          })
            .then(() => load())
            .catch((err: Error) => setError(err.message))
            .finally(() => setBusyId(''))
        },
      },
    ])
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.days}>
        {DAYS.map((item) => {
          const selected = item.id === day
          return (
            <Pressable
              key={item.id}
              onPress={() => setDay(item.id)}
              style={[styles.day, selected && styles.daySelected]}
            >
              <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{item.label}</Text>
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
      {!activeDay && !loading ? (
        <Text style={styles.empty}>Early check-in runs Friday through Sunday. Pick a day above.</Text>
      ) : null}
      {activeDay && !loading && visible.length === 0 ? (
        <Text style={styles.empty}>No one is scheduled for early entry on this day.</Text>
      ) : null}
      {visible.map((person) => {
        const checkedIn = activeDay ? Boolean(person.checkIns?.[activeDay as 'FRIDAY' | 'SATURDAY' | 'SUNDAY']) : false
        return (
          <View key={person.id} style={styles.card}>
            <Text style={styles.title}>
              {person.lastName}, {person.firstName}
            </Text>
            <Text style={styles.meta}>{[person.congregation, person.department].filter(Boolean).join(' · ')}</Text>
            <Text style={styles.status}>{checkedIn ? 'Checked in' : 'Not checked in'}</Text>
            {activeDay && !checkedIn ? (
              <Pressable style={styles.button} disabled={busyId === person.id} onPress={() => void checkIn(person)}>
                <Text style={styles.buttonText}>{busyId === person.id ? 'Saving…' : 'Check in'}</Text>
              </Pressable>
            ) : null}
            {activeDay && checkedIn ? (
              <Pressable disabled={busyId === person.id} onPress={() => undo(person)}>
                <Text style={styles.undo}>Undo</Text>
              </Pressable>
            ) : null}
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  days: { flexDirection: 'row', gap: 8 },
  day: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  daySelected: { backgroundColor: '#1e40af', borderColor: '#1e40af' },
  dayText: { color: '#334155', fontWeight: '600' },
  dayTextSelected: { color: '#fff' },
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  card: { marginTop: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 4, color: '#475569' },
  status: { marginTop: 8, fontWeight: '600', color: '#1e3a8a' },
  button: { marginTop: 12, backgroundColor: '#1e40af', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  undo: { marginTop: 10, color: '#b91c1c', fontWeight: '600' },
  empty: { marginTop: 16, color: '#475569', lineHeight: 22 },
  error: { marginTop: 12, color: '#b91c1c' },
  spinner: { marginTop: 16 },
})
