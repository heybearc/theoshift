import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useVolunteerEvents } from '@/lib/events'

type Channel = {
  id: string
  name: string
  type: string
  unreadCount?: number
}

export default function ChatListScreen() {
  const { token, apiBase } = useAuth()
  const { eventId, events, loading: eventsLoading } = useVolunteerEvents()
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token || !eventId) return
    setError('')
    const result = await apiRequest<{ data: { channels: Channel[] } }>(
      apiBase,
      `/api/events/${eventId}/chat/channels`,
      { token }
    )
    setChannels(result.data?.channels || [])
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

  const eventName = events.find((event) => event.id === eventId)?.name

  if (eventsLoading || (loading && channels.length === 0)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={channels.length === 0 ? styles.center : undefined}
      data={channels}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load().catch((err: Error) => setError(err.message))} />}
      ListHeaderComponent={
        <View>
          {eventName ? <Text style={styles.event}>{eventName}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>{eventId ? 'No chat channels for this event.' : 'Choose an event from Assignments first.'}</Text>}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => router.push(`/chat/${item.id}`)}>
          <View style={styles.rowText}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.type}>{labelFor(item.type)}</Text>
          </View>
          {(item.unreadCount || 0) > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      )}
    />
  )
}

function labelFor(type: string) {
  if (type === 'EVENT_ANNOUNCEMENTS') return 'Updates from organizers'
  if (type === 'EVENT_GENERAL') return 'Everyone in this event'
  if (type === 'VOLUNTEER_DM') return 'Direct message'
  if (type === 'POSITION') return 'Position'
  return ''
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  event: { paddingHorizontal: 16, paddingTop: 12, color: '#1e3a8a', fontWeight: '700' },
  row: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  type: { marginTop: 2, color: '#64748b' },
  badge: { backgroundColor: '#1e40af', borderRadius: 999, minWidth: 24, paddingHorizontal: 8, paddingVertical: 3, alignItems: 'center' },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  empty: { color: '#475569', textAlign: 'center' },
  error: { color: '#b91c1c', paddingHorizontal: 16, paddingTop: 8 },
})
