import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import { useEffect, useMemo, useRef, useState } from 'react'
import EventPageWrapper from '../../../components/EventPageWrapper'
import { notifyAlert, toast } from '../../../lib/ui/toast'
import { appConfirm, appConfirmMessage } from '../../../lib/ui/confirm'
import { appPrompt } from '../../../lib/ui/prompt'
import {
  abortEventBulkEmail,
  formatBulkEmailConfirmMessage,
} from '../../../lib/bulkEmailClient'

interface EventData {
  id: string
  name: string
  status: string
  eventType: string
  startDate: string
}

interface ChatChannel {
  id: string
  eventId: string
  type: 'EVENT_ANNOUNCEMENTS' | 'EVENT_GENERAL' | 'POSITION' | 'STAFF_INTERNAL' | 'VOLUNTEER_DM'
  name: string
  unreadCount?: number
  pinnedMessageId?: string | null
  dmVolunteerAId?: string | null
  dmVolunteerBId?: string | null
}

interface ChatMessage {
  id: string
  body: string
  kind: 'TEXT' | 'SYSTEM'
  createdAt: string
  editedAt?: string | null
  senderUser?: { id: string; firstName: string; lastName: string; role: string } | null
  senderVolunteer?: { id: string; firstName: string; lastName: string } | null
}

interface Props {
  event: EventData
  canEdit: boolean
  canDelete: boolean
  canManagePermissions: boolean
  canNotifyChatLaunch: boolean
  moduleConfig?: any
  terminology?: any
}

function sidebarChannelSubtitle(c: ChatChannel): string {
  switch (c.type) {
    case 'EVENT_GENERAL':
      return 'Everyone in this event'
    case 'STAFF_INTERNAL':
      return 'Staff only'
    case 'VOLUNTEER_DM':
      return 'Direct message'
    default:
      return ''
  }
}

export default function EventStaffChatPage({
  event,
  canEdit,
  canDelete,
  canManagePermissions,
  canNotifyChatLaunch,
  moduleConfig,
  terminology
}: Props) {
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [composer, setComposer] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null)
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null)
  const [wsReady, setWsReady] = useState(false)
  const [typingActors, setTypingActors] = useState<Array<{ key: string; label: string; expiresAt: number }>>([])
  const [pushStatus, setPushStatus] = useState<'unknown' | 'enabled' | 'disabled' | 'unsupported'>('unknown')
  const [pushNotificationsEnabledForEvent, setPushNotificationsEnabledForEvent] = useState<boolean>(false)
  const [pushNotificationsToggleSaving, setPushNotificationsToggleSaving] = useState<boolean>(false)
  const [showEnablePushPrompt, setShowEnablePushPrompt] = useState<boolean>(false)
  const [linkedVolunteerId, setLinkedVolunteerId] = useState<string | null>(null)
  const [dmOpen, setDmOpen] = useState(false)
  const [dmVolunteers, setDmVolunteers] = useState<Array<{ id: string; name: string }>>([])
  const [dmPeerId, setDmPeerId] = useState('')
  const [dmBusy, setDmBusy] = useState(false)
  const [notifySending, setNotifySending] = useState(false)
  const [positionPickerOpen, setPositionPickerOpen] = useState(false)
  const [positionSearch, setPositionSearch] = useState('')
  const [newChatMenuOpen, setNewChatMenuOpen] = useState(false)
  const [dmSearch, setDmSearch] = useState('')
  const newChatMenuRef = useRef<HTMLDivElement | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const selectedChannelIdRef = useRef<string | null>(null)
  const subscribedChannelIdRef = useRef<string | null>(null)
  const typingStopTimerRef = useRef<NodeJS.Timeout | null>(null)
  const typingStartedRef = useRef(false)
  const staffChatStorageKey = `staffEventChat:${event.id}`

  const primarySidebarChannels = useMemo(() => {
    const primary = channels.filter((c) => c.type !== 'POSITION')
    const rank = (t: ChatChannel['type']) => {
      if (t === 'EVENT_GENERAL') return 0
      if (t === 'VOLUNTEER_DM') return 1
      if (t === 'STAFF_INTERNAL') return 2
      return 9
    }
    return [...primary].sort((a, b) => rank(a.type) - rank(b.type) || a.name.localeCompare(b.name))
  }, [channels])

  const positionSidebarChannels = useMemo(
    () => channels.filter((c) => c.type === 'POSITION').sort((a, b) => a.name.localeCompare(b.name)),
    [channels]
  )

  const refreshPushStatus = async () => {
    try {
      if (typeof window === 'undefined') return
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushStatus('unsupported')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) {
        setPushStatus('disabled')
        return
      }
      const r = await fetch('/api/chat/push/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint })
      })
      const j = await r.json()
      setPushStatus(j?.data?.enabled ? 'enabled' : 'disabled')
    } catch {
      setPushStatus('unsupported')
    }
  }

  const enablePush = async () => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return

    const cfgRes = await fetch('/api/chat/push/config')
    const cfgJson = await cfgRes.json()
    const vapidPublicKey: string | null = cfgJson?.data?.vapidPublicKey || null
    if (!vapidPublicKey) throw new Error('Missing VAPID public key')

    const toUint8 = (base64String: string) => {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
      const raw = atob(base64)
      const output = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i)
      return output
    }

    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toUint8(vapidPublicKey)
    })
    await fetch('/api/chat/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub)
    })
    await refreshPushStatus()
  }

  const disablePush = async () => {
    try {
      if (typeof window === 'undefined') return
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) {
        await refreshPushStatus()
        return
      }
      await fetch('/api/chat/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint })
      })
      await sub.unsubscribe()
    } finally {
      await refreshPushStatus()
    }
  }

  const markChannelRead = async (channelId: string, lastReadMessageId?: string | null) => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    try {
      await fetch(`/api/events/${event.id}/chat/channels/${channelId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastReadMessageId: lastReadMessageId || null })
      })
      setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, unreadCount: 0 } : c)))
    } catch {
      // ignore
    }
  }

  const loadChannels = async () => {
    const res = await fetch(`/api/events/${event.id}/chat/channels`)
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Unable to load channels')
    const nextChannels = data.data?.channels || []
    setLinkedVolunteerId(data.data?.linkedVolunteerId ?? null)
    setChannels(nextChannels)
    if (nextChannels.length > 0) {
      setSelectedChannelId((current) => {
        if (current && nextChannels.some((c: ChatChannel) => c.id === current)) return current
        try {
          if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem(staffChatStorageKey)
            if (stored && nextChannels.some((c: ChatChannel) => c.id === stored)) return stored
          }
        } catch {
          // ignore
        }
        const general = nextChannels.find((c: ChatChannel) => c.type === 'EVENT_GENERAL')
        return general?.id ?? nextChannels[0].id
      })
    }
  }

  const loadMessages = async () => {
    if (!selectedChannelId) return
    const res = await fetch(`/api/events/${event.id}/chat/channels/${selectedChannelId}/messages?limit=60`)
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Unable to load messages')
    setMessages(data.data?.messages || [])
    setPinnedMessageId(data.data?.pinnedMessageId || null)
    setPinnedMessage(data.data?.pinnedMessage || null)

    const newest = (data.data?.messages || [])[(data.data?.messages || []).length - 1]
    await markChannelRead(selectedChannelId, newest?.id || null)
  }

  useEffect(() => {
    refreshPushStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedChannelId || typeof window === 'undefined') return
    try {
      sessionStorage.setItem(staffChatStorageKey, selectedChannelId)
    } catch {
      // ignore
    }
  }, [selectedChannelId, staffChatStorageKey])

  useEffect(() => {
    fetch(`/api/events/${event.id}/chat/push-settings`)
      .then((r) => r.json())
      .then((j) => setPushNotificationsEnabledForEvent(!!j?.data?.enabled))
      .catch(() => setPushNotificationsEnabledForEvent(false))
  }, [event.id])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!pushNotificationsEnabledForEvent) return
    if (pushStatus !== 'disabled') return
    const key = `chatPushPromptSeen:${event.id}`
    if (window.localStorage.getItem(key)) return
    window.localStorage.setItem(key, '1')
    setShowEnablePushPrompt(true)
  }, [event.id, pushNotificationsEnabledForEvent, pushStatus])

  useEffect(() => {
    if (!newChatMenuOpen) return
    const onDoc = (e: MouseEvent) => {
      const menuRoot = newChatMenuRef.current
      if (menuRoot && !menuRoot.contains(e.target as Node)) setNewChatMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [newChatMenuOpen])

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    const run = async (opts?: { showLoading?: boolean }) => {
      try {
        if (opts?.showLoading) setLoading(true)
        await loadChannels()
      } catch (e: any) {
        setError(e.message || 'Unable to load chat')
      } finally {
        if (opts?.showLoading) setLoading(false)
      }
    }
    run({ showLoading: true })
    timer = setInterval(() => run({ showLoading: false }), 7000)
    return () => {
      if (timer) clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (!selectedChannelId) return
    const run = async () => {
      try {
        await loadMessages()
      } catch (e: any) {
        setError(e.message || 'Unable to load messages')
      }
    }
    run()
    timer = setInterval(run, 5000)
    return () => {
      if (timer) clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannelId])

  useEffect(() => {
    if (typingActors.length === 0) return
    const t = setInterval(() => {
      const now = Date.now()
      setTypingActors((prev) => prev.filter((a) => a.expiresAt > now))
    }, 1000)
    return () => clearInterval(t)
  }, [typingActors.length])

  useEffect(() => {
    let cancelled = false

    const connect = async () => {
      try {
        const tokenRes = await fetch(`/api/events/${event.id}/chat/ws-token`)
        const tokenJson = await tokenRes.json()
        if (!tokenRes.ok || !tokenJson.success) return
        const token = tokenJson.data?.token
        if (!token) return

        // Ensure the WS upgrade handler is initialized in the Node process.
        // (Next.js only attaches our upgrade listener after this API route is hit at least once.)
        try {
          await fetch('/api/chat/ws')
        } catch {
          // ignore
        }

        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const socket = new WebSocket(`${proto}://${window.location.host}/api/chat/ws?token=${encodeURIComponent(token)}`)
        wsRef.current = socket

        socket.onopen = () => {
          if (cancelled) return
          setWsReady(true)
          try {
            socket.send(JSON.stringify({ type: 'subscribeEvent' }))
          } catch {
            // ignore
          }
        }

        socket.onmessage = (ev) => {
          if (cancelled) return
          try {
            const msg = JSON.parse(ev.data)
            if (msg?.type === 'channel:activity' && msg.channelId) {
              const active = selectedChannelIdRef.current
              setChannels((prev) => {
                const existing = prev.find((c) => c.id === msg.channelId)
                if (!existing) return prev
                if (active && msg.channelId === active) return prev
                return prev.map((c) => {
                  if (c.id !== msg.channelId) return c
                  const nextUnread = (c.unreadCount || 0) + 1
                  return { ...c, unreadCount: nextUnread, lastMessageAt: msg.createdAt || c.lastMessageAt }
                })
              })
              return
            }
            if (msg?.type === 'typing' && msg.channelId && msg.actor) {
              if (msg.channelId !== selectedChannelIdRef.current) return
              const key = `${msg.actor.kind}:${msg.actor.id}`
              const label = msg.actor.label || 'Someone'
              const ttlMs = 8000
              setTypingActors((prev) => {
                const now = Date.now()
                const keep = prev.filter((a) => a.expiresAt > now && a.key !== key)
                if (!msg.isTyping) return keep
                return [...keep, { key, label, expiresAt: now + ttlMs }]
              })
              return
            }
            if (msg?.type === 'message:new' && msg.channelId && msg.message) {
              if (msg.channelId !== selectedChannelIdRef.current) return
              setMessages((prev) => [...prev, msg.message])
              setChannels((prev) =>
                prev.map((c) =>
                  c.id === msg.channelId ? { ...c, lastMessageAt: msg.message?.createdAt || c.lastMessageAt } : c
                )
              )
              markChannelRead(msg.channelId, msg.message?.id || null)
              return
            }
            if (msg?.type === 'message:delete' && msg.channelId === selectedChannelIdRef.current && msg.messageId) {
              setMessages((prev) => prev.filter((m) => m.id !== msg.messageId))
              if (msg.messageId === pinnedMessageId) {
                setPinnedMessageId(null)
                setPinnedMessage(null)
              }
              return
            }
            if (msg?.type === 'pin:update' && msg.channelId === selectedChannelIdRef.current) {
              // refresh pinned state (and pinned message) from server
              loadMessages()
            }
          } catch {
            // ignore
          }
        }

        socket.onclose = () => {
          if (cancelled) return
          setWsReady(false)
          wsRef.current = null
          subscribedChannelIdRef.current = null
        }
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined') connect()

    return () => {
      cancelled = true
      try {
        wsRef.current?.close()
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id])

  useEffect(() => {
    if (!wsReady || !selectedChannelId) return
    const ws = wsRef.current
    if (!ws) return

    const prev = subscribedChannelIdRef.current
    if (prev && prev !== selectedChannelId) {
      try {
        ws.send(JSON.stringify({ type: 'unsubscribe', channelId: prev }))
      } catch {
        // ignore
      }
    }

    subscribedChannelIdRef.current = selectedChannelId
    try {
      ws.send(JSON.stringify({ type: 'subscribe', channelId: selectedChannelId }))
    } catch {
      // ignore
    }
  }, [wsReady, selectedChannelId])

  selectedChannelIdRef.current = selectedChannelId
  const selectedChannel = channels.find((c) => c.id === selectedChannelId) || null

  const sendTyping = (isTyping: boolean) => {
    const ch = selectedChannelIdRef.current
    if (!ch) return
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    if (subscribedChannelIdRef.current !== ch) return
    try {
      ws.send(JSON.stringify({ type: isTyping ? 'typing:start' : 'typing:stop', channelId: ch }))
    } catch {}
  }

  const sendMessage = async () => {
    if (!selectedChannelId || !composer.trim()) return
    const res = await fetch(`/api/events/${event.id}/chat/channels/${selectedChannelId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: composer.trim() })
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      setError(data.error || 'Failed to send message')
      return
    }
    setComposer('')
    setMessages((prev) => [...prev, data.data])
    try {
      sendTyping(false)
    } catch {}
  }

  const deleteMessage = async (messageId: string) => {
    if (!selectedChannelId) return
    const ok = await appConfirmMessage('Delete this message for all participants?')
    if (!ok) return

    const res = await fetch(
      `/api/events/${event.id}/chat/channels/${selectedChannelId}/messages?messageId=${messageId}`,
      { method: 'DELETE' }
    )
    const data = await res.json()
    if (!res.ok || !data.success) {
      setError(data.error || 'Failed to delete message')
      return
    }
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
  }

  const pinMessage = async (messageId: string) => {
    if (!selectedChannelId) return
    const isAnnouncement = selectedChannel?.type === 'EVENT_ANNOUNCEMENTS'
    const ok = await appConfirmMessage(
      isAnnouncement
        ? "Pin this message? It stays on every volunteer dashboard until that volunteer taps I've read this."
        : 'Pin this message to the top of the channel?'
    )
    if (!ok) return

    const res = await fetch(`/api/events/${event.id}/chat/channels/${selectedChannelId}/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId })
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      setError(data.error || 'Failed to pin message')
      return
    }
    const pinnedId = data.data?.pinnedMessageId || null
    setPinnedMessageId(pinnedId)
    setPinnedMessage(pinnedId ? messages.find((m) => m.id === pinnedId) || null : null)
  }

  const unpinChannel = async () => {
    if (!selectedChannelId || !pinnedMessageId) return
    const isAnnouncement = selectedChannel?.type === 'EVENT_ANNOUNCEMENTS'
    const ok = await appConfirmMessage(
      isAnnouncement
        ? 'Unpin this announcement? It will leave volunteer dashboards.'
        : 'Unpin the current pinned message for this channel?'
    )
    if (!ok) return

    const res = await fetch(`/api/events/${event.id}/chat/channels/${selectedChannelId}/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: '' })
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      setError(data.error || 'Failed to unpin message')
      return
    }
    setPinnedMessageId(null)
    setPinnedMessage(null)
  }

  const senderName = (m: ChatMessage) =>
    m.senderUser
      ? `${m.senderUser.firstName} ${m.senderUser.lastName} (${m.senderUser.role})`
      : m.senderVolunteer
        ? `${m.senderVolunteer.firstName} ${m.senderVolunteer.lastName} (Volunteer)`
        : 'Unknown sender'

  const muteSender = async (message: ChatMessage, minutes = 60) => {
    if (!selectedChannelId) return
    const targetKind = message.senderUser ? 'user' : message.senderVolunteer ? 'volunteer' : null
    const targetId = message.senderUser?.id || message.senderVolunteer?.id
    if (!targetKind || !targetId) return

    const confirmed = await appConfirmMessage(`Mute ${senderName(message)} for ${minutes} minutes in this channel?`)
    if (!confirmed) return

    const res = await fetch(`/api/events/${event.id}/chat/channels/${selectedChannelId}/mute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetKind, targetId, durationMinutes: minutes })
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      setError(data.error || 'Failed to mute sender')
      return
    }
    notifyAlert(`Muted ${senderName(message)} for ${minutes} minutes.`)
  }

  const handleNotifyChatLaunch = async () => {
    try {
      const previewRes = await fetch(`/api/events/${event.id}/chat/notify-volunteers?preview=1`)
      const preview = await previewRes.json()
      if (!previewRes.ok || !preview.success) {
        throw new Error(preview.error || 'Could not load recipient count')
      }
      if (preview.job && !preview.job.done) {
        notifyAlert(
          `A chat notify job is already running (${preview.job.sent}/${preview.job.total}). Use Abort to stop it.`
        )
        setNotifySending(true)
        return
      }
      if (!preview.recipientCount) {
        notifyAlert('No roster volunteers with email to notify (IVS-only are excluded).')
        return
      }

      const confirmed = await appConfirm({
        title: 'Notify chat launch',
        message: formatBulkEmailConfirmMessage({
          recipientCount: preview.recipientCount,
          estimatedSeconds: preview.estimatedSeconds,
          scopeNote: preview.scopeNote,
        }),
        confirmLabel: 'Continue',
        cancelLabel: 'Cancel',
      })
      if (!confirmed) return

      const promptResult = await appPrompt({
        title: 'Optional note',
        message: 'Optional note for volunteers (leave blank to skip):',
        placeholder: 'Optional note…',
        confirmLabel: 'Queue emails',
      })
      if (promptResult === null) return
      const note = promptResult.trim()

      setNotifySending(true)
      const response = await fetch(`/api/events/${event.id}/chat/notify-volunteers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: note }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to queue chat rollout emails')
      }
      notifyAlert(data.message || `Queued ${data.recipientCount} email(s).`)
    } catch (err: any) {
      setNotifySending(false)
      notifyAlert(err?.message || 'Failed to send chat rollout emails')
    }
  }

  const handleAbortChatNotify = async () => {
    const result = await abortEventBulkEmail(event.id, 'chat-notify')
    notifyAlert(result.message)
    if (result.ok) setNotifySending(false)
  }

  const openDmModal = async () => {
    setDmOpen(true)
    setDmPeerId('')
    setDmSearch('')
    setError('')
    if (!linkedVolunteerId) {
      setDmVolunteers([])
      return
    }
    try {
      const r = await fetch(`/api/events/${event.id}/volunteers`)
      const j = await r.json()
      const vols = (j.volunteers || []) as Array<{ id: string; name: string }>
      setDmVolunteers(vols.filter((v) => v.id !== linkedVolunteerId))
    } catch {
      setDmVolunteers([])
    }
  }

  const startDirectMessage = async () => {
    if (!dmPeerId) return
    setDmBusy(true)
    setError('')
    try {
      const r = await fetch(`/api/events/${event.id}/chat/direct-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerVolunteerId: dmPeerId })
      })
      const j = await r.json()
      if (!r.ok || !j.success) {
        throw new Error(j.error || 'Could not open direct message')
      }
      setDmOpen(false)
      await loadChannels()
      if (j.data?.channel?.id) {
        setSelectedChannelId(j.data.channel.id)
      }
    } catch (e: any) {
      setError(e?.message || 'Could not open direct message')
    } finally {
      setDmBusy(false)
    }
  }

  return (
    <EventPageWrapper
      event={event}
      currentPage="chat"
      canEdit={canEdit}
      canDelete={canDelete}
      canManagePermissions={canManagePermissions}
      moduleConfig={moduleConfig}
      terminology={terminology}
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Staff Chat</h1>
              <p className="text-gray-600">Moderate and coordinate event communication channels.</p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
              {canNotifyChatLaunch && (
                <>
                  <button
                    type="button"
                    onClick={handleNotifyChatLaunch}
                    disabled={notifySending}
                    className="text-sm px-3 py-2 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 disabled:opacity-60"
                  >
                    {notifySending ? 'Queued…' : '💬 Notify chat launch'}
                  </button>
                  {notifySending && (
                    <button
                      type="button"
                      onClick={handleAbortChatNotify}
                      className="text-sm px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
                    >
                      Abort email send
                    </button>
                  )}
                </>
              )}
              <button
                onClick={async () => {
                  try {
                    setPushNotificationsToggleSaving(true)
                    const next = !pushNotificationsEnabledForEvent
                    const r = await fetch(`/api/events/${event.id}/chat/push-settings`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ enabled: next })
                    })
                    const j = await r.json()
                    if (j?.success) setPushNotificationsEnabledForEvent(!!j?.data?.enabled)
                  } finally {
                    setPushNotificationsToggleSaving(false)
                  }
                }}
                disabled={pushNotificationsToggleSaving}
                className="text-sm px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-60"
              >
                {pushNotificationsEnabledForEvent ? 'Disable event notifications' : 'Enable event notifications'}
              </button>

              {pushNotificationsEnabledForEvent && pushStatus !== 'unsupported' && (
                <button
                  onClick={() => (pushStatus === 'enabled' ? disablePush() : enablePush())}
                  className="text-sm px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                >
                  {pushStatus === 'enabled' ? 'Disable my notifications' : 'Enable my notifications'}
                </button>
              )}
            </div>
          </div>
        </div>

        {dmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 max-h-[85vh] flex flex-col">
              <h2 className="text-lg font-semibold text-gray-900">Direct message</h2>
              <p className="text-sm text-gray-600 mt-1">
                Private chat with another volunteer registered for this event.
              </p>
              {!linkedVolunteerId ? (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  We couldn&apos;t match your login to an active volunteer on this event, so DMs from staff chat are
                  blocked. Ask an admin to link your user to your volunteer profile under{' '}
                  <span className="font-semibold">Admin → Users</span>, and ensure you appear on this event&apos;s
                  volunteer list.
                </div>
              ) : (
                <>
                  <label className="block mt-4 text-sm font-medium text-gray-700">Search volunteers</label>
                  <input
                    type="search"
                    value={dmSearch}
                    onChange={(e) => setDmSearch(e.target.value)}
                    placeholder="Type a name…"
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <div className="mt-2 flex-1 min-h-[200px] max-h-[45vh] overflow-y-auto rounded-md border border-gray-200 divide-y divide-gray-100">
                    {dmVolunteers
                      .filter((v) => {
                        const q = dmSearch.trim().toLowerCase()
                        if (!q) return true
                        return v.name.toLowerCase().includes(q)
                      })
                      .map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setDmPeerId(v.id)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                            dmPeerId === v.id ? 'bg-blue-50 font-medium' : ''
                          }`}
                        >
                          {v.name}
                        </button>
                      ))}
                    {dmVolunteers.length === 0 && (
                      <p className="p-3 text-sm text-gray-500">No volunteers loaded.</p>
                    )}
                  </div>
                </>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDmOpen(false)}
                  className="px-3 py-2 text-sm rounded-md border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!linkedVolunteerId || !dmPeerId || dmBusy}
                  onClick={startDirectMessage}
                  className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white disabled:bg-gray-400"
                >
                  {dmBusy ? 'Opening…' : 'Open chat'}
                </button>
              </div>
            </div>
          </div>
        )}

        {positionPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-4 max-h-[85vh] flex flex-col">
              <h2 className="text-lg font-semibold text-gray-900">Position channels</h2>
              <p className="text-sm text-gray-600 mt-1">
                Open a channel for a specific assignment. Use search to find a station quickly.
              </p>
              <input
                type="search"
                value={positionSearch}
                onChange={(e) => setPositionSearch(e.target.value)}
                placeholder="Search by position name…"
                className="mt-4 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <div className="mt-2 flex-1 min-h-[240px] max-h-[55vh] overflow-y-auto rounded-md border border-gray-200 divide-y divide-gray-100">
                {positionSidebarChannels
                  .filter((c) => {
                    const q = positionSearch.trim().toLowerCase()
                    if (!q) return true
                    return c.name.toLowerCase().includes(q)
                  })
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedChannelId(c.id)
                        setPositionPickerOpen(false)
                        setPositionSearch('')
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between gap-2 ${
                        c.id === selectedChannelId ? 'bg-blue-50' : ''
                      }`}
                    >
                      <span className="font-medium text-gray-900 truncate">{c.name}</span>
                      {(c.unreadCount || 0) > 0 && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-semibold">
                          {c.unreadCount}
                        </span>
                      )}
                    </button>
                  ))}
                {positionSidebarChannels.length === 0 && (
                  <p className="p-4 text-sm text-gray-500">No position channels for this event.</p>
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPositionPickerOpen(false)
                    setPositionSearch('')
                  }}
                  className="px-3 py-2 text-sm rounded-md border border-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showEnablePushPrompt && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-900">Enable chat notifications?</p>
              <p className="text-xs text-blue-800 mt-1">
                This event has chat notifications enabled. Turn them on for this device to get push alerts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    await enablePush()
                  } finally {
                    setShowEnablePushPrompt(false)
                  }
                }}
                className="text-sm px-3 py-1 rounded bg-blue-700 text-white hover:bg-blue-800"
              >
                Enable
              </button>
              <button
                onClick={() => setShowEnablePushPrompt(false)}
                className="text-sm px-3 py-1 rounded border border-blue-300 text-blue-800 hover:bg-blue-100"
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {loading && <p className="text-gray-600">Loading chat...</p>}
        {!loading && error && <p className="text-red-600 mb-4">{error}</p>}

        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 flex flex-col rounded-xl border border-gray-200 bg-gray-50 overflow-hidden min-h-[320px] max-h-[calc(100vh-14rem)]">
              <div className="p-2 border-b border-gray-200 bg-white shrink-0 relative" ref={newChatMenuRef}>
                <button
                  type="button"
                  onClick={() => setNewChatMenuOpen((o) => !o)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm"
                >
                  <span className="text-lg leading-none">+</span>
                  New message
                </button>
                {newChatMenuOpen && (
                  <div className="absolute left-2 right-2 top-full mt-1 z-20 rounded-lg border border-gray-200 bg-white shadow-lg py-1 overflow-hidden">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 text-gray-800"
                      onClick={() => {
                        setNewChatMenuOpen(false)
                        void openDmModal()
                      }}
                    >
                      Direct message to volunteer…
                    </button>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 text-gray-800 border-t border-gray-100"
                      onClick={() => {
                        setNewChatMenuOpen(false)
                        setPositionSearch('')
                        setPositionPickerOpen(true)
                      }}
                    >
                      Position channel…
                    </button>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-2 pt-1">Channels</p>
                {primarySidebarChannels.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedChannelId(c.id)}
                    className={`w-full text-left rounded-lg px-3 py-2 transition-colors ${
                      c.id === selectedChannelId ? 'bg-white border border-blue-300 shadow-sm' : 'hover:bg-white/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900 leading-snug">{c.name}</span>
                      {(c.unreadCount || 0) > 0 && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-semibold">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{sidebarChannelSubtitle(c)}</p>
                  </button>
                ))}
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-2 pt-4 pb-1">
                  Positions
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPositionSearch('')
                    setPositionPickerOpen(true)
                  }}
                  className={`w-full text-left rounded-lg border border-dashed px-3 py-2.5 text-sm transition-colors ${
                    selectedChannel?.type === 'POSITION'
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                      : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="font-medium">Browse position channels</span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    {positionSidebarChannels.length} channel{positionSidebarChannels.length === 1 ? '' : 's'} · search
                    and open
                  </span>
                </button>
                {selectedChannel?.type === 'POSITION' && (
                  <p className="text-xs text-gray-600 px-2 pt-1 leading-snug">
                    <span className="font-medium text-gray-700">Active:</span> {selectedChannel.name}
                  </p>
                )}
              </div>
            </div>

            <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
              {!selectedChannel ? (
                <p className="text-gray-600">Select a channel to view messages.</p>
              ) : (
                <>
                  <div className="border-b border-gray-200 pb-3 mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{selectedChannel.name}</h2>
                      {selectedChannel.type === 'EVENT_ANNOUNCEMENTS' && (
                        <p className="text-xs text-gray-500">
                          Volunteers can read this channel. Pin a message to keep it on their dashboard until they acknowledge it.
                        </p>
                      )}
                      {selectedChannel.type === 'STAFF_INTERNAL' && (
                        <p className="text-xs text-gray-500">Staff-internal channel. Volunteers cannot see these messages.</p>
                      )}
                      {selectedChannel.type === 'VOLUNTEER_DM' && (
                        <p className="text-xs text-gray-500">Direct message — visible only to you and the other volunteer.</p>
                      )}
                    </div>
                    {pinnedMessageId && (
                      <button
                        onClick={unpinChannel}
                        className="text-xs text-amber-700 hover:text-amber-900 underline"
                      >
                        Unpin message
                      </button>
                    )}
                  </div>
                  <div className="h-96 overflow-y-auto border border-gray-100 rounded-md p-3 bg-gray-50 mb-3 space-y-2">
                    {pinnedMessageId && (
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-2 mb-2">
                        <p className="text-xs font-semibold text-amber-800 mb-1">Pinned message</p>
                        {pinnedMessage ? (
                          <div>
                            <p className="text-xs text-amber-700">
                              {senderName(pinnedMessage)} · {new Date(pinnedMessage.createdAt).toLocaleTimeString()}
                            </p>
                            <p className="text-sm text-amber-900 mt-1 whitespace-pre-wrap">{pinnedMessage.body}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-amber-700">Pinned message is not available.</p>
                        )}
                      </div>
                    )}
                    {messages.map((m) => (
                      <div key={m.id} className="bg-white border border-gray-200 rounded-md p-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-gray-500">
                              {senderName(m)} · {new Date(m.createdAt).toLocaleTimeString()}
                            </p>
                            <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{m.body}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <button
                              onClick={() => deleteMessage(m.id)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => muteSender(m, 60)}
                              className="text-xs text-amber-600 hover:text-amber-800"
                            >
                              Mute 1h
                            </button>
                            <button
                              onClick={() => pinMessage(m.id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Pin
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {typingActors.length > 0 && (
                    <p className="text-xs text-gray-500 mb-1">
                      {typingActors.map((a) => a.label).join(', ')} typing…
                    </p>
                  )}
                  <div className="flex gap-2">
                    <textarea
                      value={composer}
                      onChange={(e) => {
                        setComposer(e.target.value)
                        if (!typingStartedRef.current) {
                          typingStartedRef.current = true
                          sendTyping(true)
                        } else {
                          sendTyping(true)
                        }
                        if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current)
                        typingStopTimerRef.current = setTimeout(() => {
                          typingStartedRef.current = false
                          sendTyping(false)
                        }, 1500)
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' || e.shiftKey) return
                        if (!composer.trim()) return
                        e.preventDefault()
                        void sendMessage()
                      }}
                      rows={2}
                      placeholder="Send a message… Enter to send, Shift+Enter for a new line."
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={2000}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!composer.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      Send
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </EventPageWrapper>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string }
  const session = await getServerSession(context.req, context.res, authOptions)
  if (!session?.user?.email) {
    return { redirect: { destination: '/auth/signin', permanent: false } }
  }

  const { prisma } = await import('../../../src/lib/prisma')
  const { checkEventAccess, canManageEvent, canDeleteEvent, canManagePermissions } = await import('../../../src/lib/eventAccess')

  const user = await prisma.users.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  })
  if (!user) {
    return { redirect: { destination: '/auth/signin', permanent: false } }
  }

  const access = await checkEventAccess(user.id, id, 'VIEWER')
  if (!access) {
    return { redirect: { destination: '/events/select', permanent: false } }
  }

  const [event, eventSettings] = await Promise.all([
    prisma.events.findUnique({
      where: { id },
      select: { id: true, name: true, status: true, eventType: true, startDate: true }
    }),
    prisma.events.findUnique({
      where: { id },
      select: { settings: true }
    })
  ])
  if (!event) return { notFound: true }

  const canEdit = await canManageEvent(user.id, id)
  const canDelete = await canDeleteEvent(user.id, id)
  const canManagePerms = await canManagePermissions(user.id, id)

  const notifyUser = await prisma.users.findUnique({
    where: { email: session.user.email },
    select: { role: true }
  })
  const canNotifyChatLaunch =
    !!notifyUser && ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN'].includes(notifyUser.role)

  return {
    props: {
      event: {
        id: event.id,
        name: event.name,
        status: event.status,
        eventType: event.eventType,
        startDate: event.startDate?.toISOString() || new Date().toISOString()
      },
      canEdit,
      canDelete,
      canManagePermissions: canManagePerms,
      canNotifyChatLaunch,
      moduleConfig: (eventSettings?.settings as any)?.modules || null,
      terminology: (eventSettings?.settings as any)?.terminology || null
    }
  }
}
