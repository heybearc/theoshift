import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'

type Pinned = {
  messageId: string
  body: string
  createdAt: string
  senderName: string
}

export default function PinnedAnnouncement({ eventId }: { eventId: string }) {
  const { token, apiBase } = useAuth()
  const [announcement, setAnnouncement] = useState<Pinned | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    const result = await apiRequest<{ data: Pinned | null }>(
      apiBase,
      `/api/events/${eventId}/chat/pinned-announcement`,
      { token }
    )
    setAnnouncement(result.data)
  }, [apiBase, eventId, token])

  useEffect(() => {
    void load().catch(() => {
      setAnnouncement(null)
    })
  }, [load])

  if (!announcement) return null

  async function acknowledge() {
    if (!token || !announcement) return
    setSaving(true)
    setError('')
    try {
      await apiRequest(apiBase, `/api/events/${eventId}/chat/pinned-announcement`, {
        method: 'POST',
        token,
        body: { messageId: announcement.messageId },
      })
      setAnnouncement(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record your acknowledgment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Announcement</Text>
      <Text style={styles.body}>{announcement.body}</Text>
      <Text style={styles.meta}>
        {announcement.senderName} · {new Date(announcement.createdAt).toLocaleString()}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} disabled={saving} onPress={() => void acknowledge()}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : "I've read this"}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { marginTop: 16, backgroundColor: '#fffbeb', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f59e0b' },
  label: { fontSize: 12, fontWeight: '700', color: '#92400e', textTransform: 'uppercase' },
  body: { marginTop: 8, color: '#451a03', lineHeight: 20 },
  meta: { marginTop: 8, color: '#92400e', fontSize: 12 },
  error: { marginTop: 8, color: '#b91c1c' },
  button: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#b45309', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  buttonText: { color: '#fff', fontWeight: '700' },
})
