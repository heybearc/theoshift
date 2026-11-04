import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useVolunteerEvents } from '@/lib/events'
import { theme } from '@/constants/theme'

type Person = { id: string; firstName: string; lastName: string }

export default function MessageSomeoneScreen() {
  const { token, apiBase } = useAuth()
  const { eventId, events } = useVolunteerEvents()
  const [people, setPeople] = useState<Person[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [openingId, setOpeningId] = useState('')
  const [error, setError] = useState('')

  const eventName = events.find((event) => event.id === eventId)?.name

  const load = useCallback(async () => {
    if (!token || !eventId) return
    setError('')
    const result = await apiRequest<{ data: { people: Person[] } }>(
      apiBase,
      `/api/events/${eventId}/chat/people`,
      { token }
    )
    setPeople(result.data?.people || [])
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
  const visible = people.filter((person) => {
    if (!needle) return true
    return `${person.firstName} ${person.lastName}`.toLowerCase().includes(needle)
  })

  async function openChat(person: Person) {
    if (!token || !eventId || openingId) return
    setOpeningId(person.id)
    setError('')
    try {
      const result = await apiRequest<{ data: { channel: { id: string } } }>(
        apiBase,
        `/api/events/${eventId}/chat/direct-message`,
        { method: 'POST', token, body: { peerVolunteerId: person.id } }
      )
      const channelId = result.data?.channel?.id
      if (!channelId) throw new Error('Could not open that chat')
      router.replace(`/chat/${channelId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that chat')
      setOpeningId('')
    }
  }

  return (
    <View style={styles.screen}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name"
        placeholderTextColor={theme.muted}
        autoCapitalize="words"
        autoCorrect={false}
        style={styles.search}
      />
      {eventName ? <Text style={styles.event}>{eventName}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.empty}>
              {eventId ? 'No other volunteers are on this event.' : 'Choose an event from Assignments first.'}
            </Text>
          }
          renderItem={({ item }) => {
            const name = `${item.firstName} ${item.lastName}`.trim()
            const busy = openingId === item.id
            return (
              <Pressable
                style={styles.row}
                disabled={!!openingId}
                onPress={() => void openChat(item)}
              >
                <Text style={styles.name}>{name}</Text>
                {busy ? <ActivityIndicator /> : <Text style={styles.chevron}>›</Text>}
              </Pressable>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.canvas },
  search: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.ink,
  },
  event: { paddingHorizontal: 16, paddingTop: 10, color: theme.navyDark, fontWeight: '700' },
  error: { color: '#b91c1c', paddingHorizontal: 16, paddingTop: 8 },
  spinner: { marginTop: 24 },
  row: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 14,
    minHeight: 56,
    borderWidth: 1,
    borderColor: theme.line,
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: { flex: 1, fontSize: 16, fontWeight: '700', color: theme.ink },
  chevron: { color: theme.navy, fontSize: 22, fontWeight: '700' },
  empty: { color: theme.muted, textAlign: 'center', padding: 24 },
})
