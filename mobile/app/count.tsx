import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { countIsLocked, formatCountWhen, useDashboard } from '@/lib/dashboard'

export default function CountScreen() {
  const { sessionId, groupId } = useLocalSearchParams<{ sessionId?: string; groupId?: string }>()
  const { token, apiBase } = useAuth()
  const { data, loading, error, reload } = useDashboard()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState('')
  const [message, setMessage] = useState('')
  const [submitError, setSubmitError] = useState('')

  const canRevise = Boolean(data?.canReviseSubmittedCounts)
  const group = data?.activeCountGroups?.find((item) => item.groupId === groupId)
  const session = data?.activeCountSessions?.find((item) => item.id === sessionId)
  const eventId = data?.event.id

  async function submit(key: string, body: { groupId?: string; positionId?: string }) {
    if (!token || !eventId || !sessionId) return
    const raw = (drafts[key] ?? '').trim()
    if (!/^\d+$/.test(raw)) {
      setSubmitError('Enter a whole number, including 0.')
      return
    }
    setSavingId(key)
    setSubmitError('')
    setMessage('')
    try {
      await apiRequest(apiBase, `/api/events/${eventId}/count-sessions/${sessionId}/counts`, {
        method: 'POST',
        token,
        body: {
          ...body,
          attendeeCount: Number(raw),
          notes: notes[key]?.trim() || undefined,
        },
      })
      setMessage('Count submitted.')
      await reload()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not submit that count')
    } finally {
      setSavingId('')
    }
  }

  const title = group?.groupName || session?.sessionName || 'Count'
  const when = formatCountWhen(group?.countTime || session?.countTime)

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      {when ? <Text style={styles.meta}>{when}</Text> : null}
      {group ? <Text style={styles.meta}>{group.sessionName}</Text> : null}
      {loading ? <ActivityIndicator style={styles.spinner} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      {!loading && !group && !session ? <Text style={styles.meta}>This count is not open for you.</Text> : null}

      {group ? (
        <CountForm
          label="Attendance"
          locked={countIsLocked(Boolean(group.hasSubmitted) || group.existingCount != null, canRevise)}
          existing={group.existingCount}
          value={drafts[group.groupId] ?? ''}
          note={notes[group.groupId] ?? ''}
          saving={savingId === group.groupId}
          onChangeValue={(value) => setDrafts((current) => ({ ...current, [group.groupId]: value }))}
          onChangeNote={(value) => setNotes((current) => ({ ...current, [group.groupId]: value }))}
          onSubmit={() => void submit(group.groupId, { groupId: group.groupId })}
        />
      ) : null}

      {(session?.stations || []).map((station) => {
        const locked = countIsLocked(Boolean(station.hasSubmitted) || station.existingCount != null, canRevise)
        return (
          <CountForm
            key={station.positionId}
            label={station.name}
            locked={locked}
            existing={station.existingCount}
            value={drafts[station.positionId] ?? ''}
            note={notes[station.positionId] ?? ''}
            saving={savingId === station.positionId}
            onChangeValue={(value) => setDrafts((current) => ({ ...current, [station.positionId]: value }))}
            onChangeNote={(value) => setNotes((current) => ({ ...current, [station.positionId]: value }))}
            onSubmit={() => void submit(station.positionId, { positionId: station.positionId })}
          />
        )
      })}

      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>Back to assignments</Text>
      </Pressable>
    </ScrollView>
  )
}

function CountForm({
  label,
  locked,
  existing,
  value,
  note,
  saving,
  onChangeValue,
  onChangeNote,
  onSubmit,
}: {
  label: string
  locked: boolean
  existing: number | null
  value: string
  note: string
  saving: boolean
  onChangeValue: (value: string) => void
  onChangeNote: (value: string) => void
  onSubmit: () => void
}) {
  if (locked) {
    return (
      <View style={[styles.card, styles.locked]}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.lockedText}>Submitted{existing != null ? ` · ${existing}` : ''}</Text>
        <Text style={styles.meta}>An overseer or event staff can change this count.</Text>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeValue}
        keyboardType="number-pad"
        placeholder="Attendance"
        style={styles.input}
      />
      <TextInput
        value={note}
        onChangeText={onChangeNote}
        placeholder="Note (optional)"
        style={styles.input}
      />
      <Pressable style={styles.button} disabled={saving} onPress={onSubmit}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Submit count'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 4, color: '#475569' },
  card: { marginTop: 16, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  locked: { backgroundColor: '#f1f5f9' },
  label: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  lockedText: { marginTop: 8, fontWeight: '700', color: '#334155' },
  input: { marginTop: 10, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: '#fff' },
  button: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#1e40af', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { marginTop: 12, color: '#b91c1c' },
  success: { marginTop: 12, color: '#047857', fontWeight: '600' },
  spinner: { marginTop: 16 },
  back: { marginTop: 24 },
  backText: { color: '#1e40af', fontWeight: '600' },
})
