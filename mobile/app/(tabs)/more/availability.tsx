import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useVolunteerEvents } from '@/lib/events'

type AvailabilityRequest = {
  id: string
  status: string
  event: { name: string; startDate: string; endDate: string; location: string }
}

const CHOICES = [
  { id: 'AVAILABLE', label: 'Available' },
  { id: 'PARTIAL', label: 'Partial' },
  { id: 'NOT_AVAILABLE', label: 'Not available' },
] as const

export default function AvailabilityScreen() {
  const { token, apiBase } = useAuth()
  const { eventId } = useVolunteerEvents()
  const [requests, setRequests] = useState<AvailabilityRequest[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token || !eventId) return
    setError('')
    const result = await apiRequest<{ requests: AvailabilityRequest[] }>(
      apiBase,
      `/api/volunteer/availability?eventId=${encodeURIComponent(eventId)}`,
      { token }
    )
    setRequests(result.requests || [])
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

  async function respond(requestId: string, status: string) {
    const comment = (notes[requestId] || '').trim()
    if (status === 'PARTIAL' && !comment) {
      setError('Partial availability needs a comment, such as “Friday only” or “mornings only”.')
      return
    }
    if (!token || !eventId) return
    setSavingId(requestId)
    setError('')
    try {
      await apiRequest(apiBase, `/api/volunteer/availability?eventId=${encodeURIComponent(eventId)}`, {
        method: 'POST',
        token,
        body: { requestId, status, notes: comment || undefined },
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save availability')
    } finally {
      setSavingId('')
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {loading ? <ActivityIndicator style={styles.spinner} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && requests.length === 0 ? (
        <Text style={styles.empty}>No availability request for this event yet.</Text>
      ) : null}
      {requests.map((request) => (
        <View key={request.id} style={styles.card}>
          <Text style={styles.title}>{request.event.name}</Text>
          <Text style={styles.meta}>
            {request.event.startDate}
            {request.event.endDate ? ` – ${request.event.endDate}` : ''}
          </Text>
          <Text style={styles.meta}>{request.event.location}</Text>
          <Text style={styles.status}>Current: {labelFor(request.status)}</Text>
          <TextInput
            value={notes[request.id] || ''}
            onChangeText={(value) => setNotes((prev) => ({ ...prev, [request.id]: value }))}
            placeholder="Comment (required for partial)"
            style={styles.input}
          />
          <View style={styles.choices}>
            {CHOICES.map((choice) => (
              <Pressable
                key={choice.id}
                disabled={savingId === request.id}
                onPress={() => void respond(request.id, choice.id)}
                style={[styles.choice, request.status === choice.id && styles.choiceSelected]}
              >
                <Text style={[styles.choiceText, request.status === choice.id && styles.choiceTextSelected]}>
                  {choice.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

function labelFor(status: string) {
  if (status === 'AVAILABLE') return 'Available'
  if (status === 'PARTIAL') return 'Partial'
  if (status === 'NOT_AVAILABLE') return 'Not available'
  return 'Waiting for your reply'
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 4, color: '#475569' },
  status: { marginTop: 10, fontWeight: '600', color: '#1e3a8a' },
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  choice: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  choiceSelected: { backgroundColor: '#1e40af', borderColor: '#1e40af' },
  choiceText: { color: '#334155', fontWeight: '600' },
  choiceTextSelected: { color: '#fff' },
  empty: { color: '#475569', lineHeight: 22 },
  error: { marginBottom: 12, color: '#b91c1c' },
  spinner: { marginBottom: 16 },
})
