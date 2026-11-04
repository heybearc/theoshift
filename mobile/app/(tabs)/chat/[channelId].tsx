import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useVolunteerEvents } from '@/lib/events'

type ChatMessage = {
  id: string
  body: string
  kind: string
  createdAt: string
  senderUser?: { firstName: string; lastName: string } | null
  senderVolunteer?: { firstName: string; lastName: string } | null
}

type Channel = { id: string; name: string; type: string }

function senderName(message: ChatMessage) {
  const person = message.senderVolunteer || message.senderUser
  if (!person) return message.kind === 'SYSTEM' ? 'TheoShift' : 'Someone'
  return `${person.firstName} ${person.lastName}`.trim()
}

export default function ChannelScreen() {
  const { channelId } = useLocalSearchParams<{ channelId: string }>()
  const { token, apiBase } = useAuth()
  const { eventId } = useVolunteerEvents()
  const [channel, setChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [muted, setMuted] = useState(false)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [hasEarlier, setHasEarlier] = useState(false)
  const listRef = useRef<FlatList<ChatMessage>>(null)
  const nearBottom = useRef(true)

  const loadLatest = useCallback(async () => {
    if (!token || !eventId || !channelId) return
    const result = await apiRequest<{
      data: { channel: Channel; messages: ChatMessage[]; muted?: boolean; nextBefore?: string | null }
    }>(apiBase, `/api/events/${eventId}/chat/channels/${channelId}/messages?limit=40`, { token })
    const incoming = result.data.messages || []
    setChannel(result.data.channel)
    setMuted(!!result.data.muted)
    setHasEarlier(incoming.length >= 40 && !!result.data.nextBefore)
    setMessages((prev) => {
      const ids = new Set(incoming.map((message) => message.id))
      const oldestIncoming = incoming[0]?.createdAt
      const older = prev.filter((message) => !ids.has(message.id) && oldestIncoming && message.createdAt < oldestIncoming)
      return [...older, ...incoming]
    })
  }, [token, apiBase, eventId, channelId])

  async function loadEarlier() {
    const oldest = messages[0]?.createdAt
    if (!oldest || !token || !eventId || !channelId || loadingEarlier) return
    nearBottom.current = false
    setLoadingEarlier(true)
    setError('')
    try {
      const result = await apiRequest<{ data: { messages: ChatMessage[]; nextBefore?: string | null } }>(
        apiBase,
        `/api/events/${eventId}/chat/channels/${channelId}/messages?limit=40&before=${encodeURIComponent(oldest)}`,
        { token }
      )
      const incoming = result.data.messages || []
      setHasEarlier(incoming.length >= 40 && !!result.data.nextBefore)
      setMessages((prev) => {
        const ids = new Set(prev.map((message) => message.id))
        return [...incoming.filter((message) => !ids.has(message.id)), ...prev]
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load earlier messages')
    } finally {
      setLoadingEarlier(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadLatest()
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    const timer = setInterval(() => {
      loadLatest().catch(() => undefined)
    }, 4000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [loadLatest])

  async function send() {
    const body = draft.trim()
    if (!body || !token || !eventId || !channelId) return
    setSending(true)
    setError('')
    try {
      await apiRequest(apiBase, `/api/events/${eventId}/chat/channels/${channelId}/messages`, {
        method: 'POST',
        token,
        body: { body },
      })
      setDraft('')
      nearBottom.current = true
      await loadLatest()
      listRef.current?.scrollToEnd({ animated: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send')
    } finally {
      setSending(false)
    }
  }

  const readOnly = channel?.type === 'EVENT_ANNOUNCEMENTS' || muted

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <Stack.Screen options={{ title: channel?.name || 'Messages' }} />
      {loading && messages.length === 0 ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onScroll={(event) => {
            const { contentSize, layoutMeasurement, contentOffset } = event.nativeEvent
            nearBottom.current = contentSize.height - layoutMeasurement.height - contentOffset.y < 80
          }}
          scrollEventThrottle={100}
          onContentSizeChange={() => {
            if (nearBottom.current) listRef.current?.scrollToEnd({ animated: false })
          }}
          ListHeaderComponent={
            hasEarlier ? (
              <Pressable style={styles.earlier} disabled={loadingEarlier} onPress={() => void loadEarlier()}>
                <Text style={styles.earlierText}>{loadingEarlier ? 'Loading…' : 'Earlier messages'}</Text>
              </Pressable>
            ) : undefined
          }
          ListEmptyComponent={<Text style={styles.empty}>No messages yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.bubble}>
              <Text style={styles.sender}>
                {senderName(item)} · {new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          )}
        />
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {muted ? (
        <Text style={styles.notice}>You are muted in this channel.</Text>
      ) : readOnly ? (
        <Text style={styles.notice}>Only organizers can post in Announcements.</Text>
      ) : (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message"
            style={styles.input}
            multiline
          />
          <Pressable style={[styles.send, (!draft.trim() || sending) && styles.sendDisabled]} disabled={!draft.trim() || sending} onPress={() => void send()}>
            <Text style={styles.sendText}>{sending ? '…' : 'Send'}</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  spinner: { marginTop: 32 },
  list: { padding: 12, flexGrow: 1 },
  bubble: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  sender: { color: '#64748b', fontSize: 12 },
  body: { color: '#0f172a', marginTop: 4, fontSize: 16, lineHeight: 22 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 24 },
  earlier: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  earlierText: { color: '#1e40af', fontWeight: '700' },
  error: { color: '#b91c1c', paddingHorizontal: 12, paddingBottom: 8 },
  notice: { padding: 16, color: '#475569' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  send: { backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 16, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '700' },
})
