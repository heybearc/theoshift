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
  const listRef = useRef<FlatList<ChatMessage>>(null)

  const load = useCallback(async () => {
    if (!token || !eventId || !channelId) return
    const result = await apiRequest<{ data: { channel: Channel; messages: ChatMessage[] } }>(
      apiBase,
      `/api/events/${eventId}/chat/channels/${channelId}/messages`,
      { token }
    )
    setChannel(result.data.channel)
    setMessages(result.data.messages || [])
    void apiRequest(apiBase, `/api/events/${eventId}/chat/channels/${channelId}/read`, {
      method: 'POST',
      token,
    }).catch(() => undefined)
  }, [token, apiBase, eventId, channelId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    const timer = setInterval(() => {
      load().catch(() => undefined)
    }, 4000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [load])

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
      await load()
      listRef.current?.scrollToEnd({ animated: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send')
    } finally {
      setSending(false)
    }
  }

  const readOnly = channel?.type === 'EVENT_ANNOUNCEMENTS'

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
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
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
      {readOnly ? (
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
  send: { backgroundColor: '#1e40af', borderRadius: 12, paddingHorizontal: 16, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '700' },
})
