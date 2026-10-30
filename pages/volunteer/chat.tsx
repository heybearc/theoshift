import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Head from 'next/head'
import {
  canSimulateVolunteerRole,
  getViewAsHeaders,
  getViewAsVolunteerId,
  setViewAsVolunteerId,
} from '@/lib/viewAsClient'
import { disableChatPushSubscription, enableChatPushSubscription, isAppleTouchDevice } from '@/lib/chatPushClient'
import { notifyAlert, toast } from '../../lib/ui/toast'

interface ChatChannel {
  id: string
  eventId: string
  type: 'EVENT_ANNOUNCEMENTS' | 'EVENT_GENERAL' | 'POSITION' | 'VOLUNTEER_DM'
  name: string
  positionId?: string | null
  unreadCount?: number
  lastMessageAt?: string | null
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

function sidebarChannelSubtitle(c: ChatChannel): string {
  switch (c.type) {
    case 'EVENT_GENERAL':
      return 'Everyone in this event'
    case 'EVENT_ANNOUNCEMENTS':
      return 'Updates from organizers'
    case 'VOLUNTEER_DM':
      return 'Direct message'
    default:
      return ''
  }
}

export default function VolunteerChatPage() {
  const router = useRouter()
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/volunteer/login')
    }
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [composerValue, setComposerValue] = useState('')
  const [sending, setSending] = useState(false)
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null)
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null)
  const [typingActors, setTypingActors] = useState<Array<{ key: string; label: string; expiresAt: number }>>([])
  const [pushStatus, setPushStatus] = useState<'unknown' | 'enabled' | 'disabled' | 'unsupported'>('unknown')
  const [pushNotificationsEnabledForEvent, setPushNotificationsEnabledForEvent] = useState<boolean>(false)
  const [showEnablePushPrompt, setShowEnablePushPrompt] = useState<boolean>(false)
  const [myVolunteerId, setMyVolunteerId] = useState<string | null>(null)
  const [dmOpen, setDmOpen] = useState(false)
  const [dmVolunteers, setDmVolunteers] = useState<Array<{ id: string; name: string }>>([])
  const [dmPeerId, setDmPeerId] = useState('')
  const [dmBusy, setDmBusy] = useState(false)
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
  const viewAsVolunteerIdFromQuery = typeof router.query.viewAsVolunteerId === 'string' ? router.query.viewAsVolunteerId : null

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!canSimulateVolunteerRole(session?.user?.role)) return
    if (viewAsVolunteerIdFromQuery) {
      setViewAsVolunteerId(viewAsVolunteerIdFromQuery)
    }
  }, [session?.user?.role, viewAsVolunteerIdFromQuery])

  const effectiveViewAsVolunteerId = canSimulateVolunteerRole(session?.user?.role)
    ? (viewAsVolunteerIdFromQuery || getViewAsVolunteerId())
    : null
  const isViewAsSimulationActive = !!effectiveViewAsVolunteerId

  const eventIdForChat = typeof router.query.eventId === 'string' ? router.query.eventId : null

  const primarySidebarChannels = useMemo(() => {
    const primary = channels.filter((c) => c.type !== 'POSITION')
    const rank = (t: ChatChannel['type']) => {
      if (t === 'EVENT_ANNOUNCEMENTS') return 0
      if (t === 'EVENT_GENERAL') return 1
      if (t === 'VOLUNTEER_DM') return 2
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
        headers: { 'Content-Type': 'application/json', ...getViewAsHeaders() },
        body: JSON.stringify({ endpoint: sub.endpoint })
      })
      const j = await r.json()
      setPushStatus(j?.data?.enabled ? 'enabled' : 'disabled')
    } catch {
      setPushStatus('unsupported')
    }
  }

  const enablePush = async () => {
    try {
      await enableChatPushSubscription(getViewAsHeaders)
      await refreshPushStatus()
    } catch (e: any) {
      notifyAlert(e?.message || 'Could not enable notifications.')
      await refreshPushStatus()
    }
  }

  const disablePush = async () => {
    try {
      await disableChatPushSubscription(getViewAsHeaders)
    } finally {
      await refreshPushStatus()
    }
  }

  useEffect(() => {
    refreshPushStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const eventId = typeof router.query.eventId === 'string' ? router.query.eventId : null
    if (!eventId) return
    if (!pushNotificationsEnabledForEvent) return
    if (pushStatus !== 'disabled') return
    if (isViewAsSimulationActive) return
    const key = `chatPushPromptSeen:${eventId}`
    if (window.localStorage.getItem(key)) return
    window.localStorage.setItem(key, '1')
    setShowEnablePushPrompt(true)
  }, [router.query.eventId, pushNotificationsEnabledForEvent, pushStatus, isViewAsSimulationActive])

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
    if (status !== 'authenticated') return
    const eventId = eventIdForChat
    if (!eventId) {
      setError('Missing event selection. Please return to your dashboard.')
      setLoading(false)
      return
    }

    const storageKey = `volunteerEventChat:${eventId}`

    const load = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/events/${eventId}/chat/channels`, {
          headers: { ...getViewAsHeaders() }
        })
        const data = await response.json()
        if (!response.ok || !data.success) {
          setError(data.error || 'Unable to load chat channels.')
          setChannels([])
          return
        }
        const list = data.data?.channels || []
        setChannels(list)
        setPushNotificationsEnabledForEvent(!!data.data?.pushNotificationsEnabled)
        const actor = data.data?.actor
        if (actor?.kind === 'volunteer') setMyVolunteerId(actor.id)
        else setMyVolunteerId(null)

        setSelectedChannelId((current) => {
          if (list.length === 0) return null
          if (current && list.some((c: ChatChannel) => c.id === current)) return current
          try {
            if (typeof window !== 'undefined') {
              const stored = sessionStorage.getItem(storageKey)
              if (stored && list.some((c: ChatChannel) => c.id === stored)) return stored
            }
          } catch {
            // ignore
          }
          const general = list.find((c: ChatChannel) => c.type === 'EVENT_GENERAL')
          return general?.id ?? list[0].id
        })
      } catch (e) {
        setError('Unable to load chat channels.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [status, eventIdForChat])

  useEffect(() => {
    if (!selectedChannelId || !eventIdForChat || typeof window === 'undefined') return
    try {
      sessionStorage.setItem(`volunteerEventChat:${eventIdForChat}`, selectedChannelId)
    } catch {
      // ignore
    }
  }, [selectedChannelId, eventIdForChat])

  // Refresh channel list periodically so unread counts work even if WS is unavailable.
  useEffect(() => {
    if (status !== 'authenticated') return
    const eventId = typeof router.query.eventId === 'string' ? router.query.eventId : null
    if (!eventId) return

    let timer: NodeJS.Timeout | null = null
    const refresh = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}/chat/channels`, { headers: { ...getViewAsHeaders() } })
        const data = await response.json()
        if (response.ok && data?.success) {
          setChannels(data.data?.channels || [])
          setPushNotificationsEnabledForEvent(!!data.data?.pushNotificationsEnabled)
        }
      } catch {
        // ignore
      }
    }

    timer = setInterval(refresh, 8000)
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [status, router.query.eventId])

  useEffect(() => {
    if (status !== 'authenticated') return
    const eventId = typeof router.query.eventId === 'string' ? router.query.eventId : null
    if (!eventId || !selectedChannelId) return

    let mounted = true
    let timer: NodeJS.Timeout | null = null

    const loadMessages = async () => {
      try {
        if (!mounted) return
        setMessagesLoading(true)
        const response = await fetch(
          `/api/events/${eventId}/chat/channels/${selectedChannelId}/messages?limit=50`,
          { headers: { ...getViewAsHeaders() } }
        )
        const data = await response.json()
        if (!mounted) return
        if (!response.ok || !data.success) {
          setError(data.error || 'Unable to load channel messages.')
          setMessages([])
          return
        }
        setMessages(data.data?.messages || [])
        setPinnedMessageId(data.data?.pinnedMessageId || null)
        setPinnedMessage(data.data?.pinnedMessage || null)
        const newest = (data.data?.messages || [])[(data.data?.messages || []).length - 1]
        await markChannelRead(selectedChannelId, newest?.id || null)
      } catch (e) {
        if (mounted) {
          setError('Unable to load channel messages.')
          setMessages([])
        }
      } finally {
        if (mounted) setMessagesLoading(false)
      }
    }

    loadMessages()
    timer = setInterval(loadMessages, 5000)

    return () => {
      mounted = false
      if (timer) clearInterval(timer)
    }
  }, [status, router.query.eventId, selectedChannelId])

  const selectedChannel = channels.find((c) => c.id === selectedChannelId) || null
  selectedChannelIdRef.current = selectedChannelId

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

  const markChannelRead = async (channelId: string, lastReadMessageId?: string | null) => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    const eventId = typeof router.query.eventId === 'string' ? router.query.eventId : null
    if (!eventId) return
    try {
      await fetch(`/api/events/${eventId}/chat/channels/${channelId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getViewAsHeaders() },
        body: JSON.stringify({ lastReadMessageId: lastReadMessageId || null })
      })
      setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, unreadCount: 0 } : c)))
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (status !== 'authenticated') return
    const eventId = typeof router.query.eventId === 'string' ? router.query.eventId : null
    if (!eventId) return

    let cancelled = false

    const connect = async () => {
      try {
        const tokenRes = await fetch(`/api/events/${eventId}/chat/ws-token`, { headers: { ...getViewAsHeaders() } })
        const tokenJson = await tokenRes.json()
        if (!tokenRes.ok || !tokenJson.success) return
        const token = tokenJson.data?.token
        if (!token) return

        // Ensure the WS upgrade handler is initialized in the Node process.
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
          try {
            socket.send(JSON.stringify({ type: 'subscribeEvent' }))
          } catch {
            // ignore
          }
          const ch = selectedChannelIdRef.current
          if (ch) {
            try {
              socket.send(JSON.stringify({ type: 'subscribe', channelId: ch }))
              subscribedChannelIdRef.current = ch
            } catch {
              // ignore
            }
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
              const ch = selectedChannelIdRef.current
              if (!ch) return
              fetch(`/api/events/${eventId}/chat/channels/${ch}/messages?limit=1`, { headers: { ...getViewAsHeaders() } })
                .then((r) => r.json())
                .then((data) => {
                  if (data?.success) {
                    setPinnedMessageId(data.data?.pinnedMessageId || null)
                    setPinnedMessage(data.data?.pinnedMessage || null)
                  }
                })
                .catch(() => {})
            }
          } catch {
            // ignore
          }
        }

        socket.onclose = () => {
          if (cancelled) return
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
  }, [status, router.query.eventId])

  useEffect(() => {
    const ws = wsRef.current
    if (!ws || !selectedChannelId) return

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
  }, [selectedChannelId])

  useEffect(() => {
    if (typingActors.length === 0) return
    const t = setInterval(() => {
      const now = Date.now()
      setTypingActors((prev) => prev.filter((a) => a.expiresAt > now))
    }, 1000)
    return () => clearInterval(t)
  }, [typingActors.length])

  const formatSender = (message: ChatMessage) => {
    if (message.senderUser) return `${message.senderUser.firstName} ${message.senderUser.lastName}`
    if (message.senderVolunteer) return `${message.senderVolunteer.firstName} ${message.senderVolunteer.lastName}`
    return 'Unknown sender'
  }

  const handleSend = async () => {
    const eventId = typeof router.query.eventId === 'string' ? router.query.eventId : null
    if (!eventId || !selectedChannelId || !composerValue.trim()) return

    try {
      setSending(true)
      const response = await fetch(`/api/events/${eventId}/chat/channels/${selectedChannelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getViewAsHeaders() },
        body: JSON.stringify({ body: composerValue.trim() })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send message')
      }
      setComposerValue('')
      setMessages((prev) => [...prev, data.data])
      try {
        sendTyping(false)
      } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const openVolunteerDmModal = async () => {
    setDmOpen(true)
    setDmPeerId('')
    setDmSearch('')
    setError('')
    if (!eventIdForChat || !myVolunteerId || isViewAsSimulationActive) {
      setDmVolunteers([])
      return
    }
    try {
      const r = await fetch(`/api/events/${eventIdForChat}/volunteers`, { headers: { ...getViewAsHeaders() } })
      const j = await r.json()
      const vols = (j.volunteers || []) as Array<{ id: string; name: string }>
      setDmVolunteers(vols.filter((v) => v.id !== myVolunteerId))
    } catch {
      setDmVolunteers([])
    }
  }

  const startVolunteerDm = async () => {
    if (!eventIdForChat || !dmPeerId || !myVolunteerId || isViewAsSimulationActive) return
    setDmBusy(true)
    setError('')
    try {
      const r = await fetch(`/api/events/${eventIdForChat}/chat/direct-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getViewAsHeaders() },
        body: JSON.stringify({ peerVolunteerId: dmPeerId })
      })
      const j = await r.json()
      if (!r.ok || !j.success) throw new Error(j.error || 'Could not open direct message')
      setDmOpen(false)
      const refresh = await fetch(`/api/events/${eventIdForChat}/chat/channels`, {
        headers: { ...getViewAsHeaders() }
      })
      const rd = await refresh.json()
      if (refresh.ok && rd.success) {
        setChannels(rd.data?.channels || [])
        if (j.data?.channel?.id) setSelectedChannelId(j.data.channel.id)
      }
    } catch (e: any) {
      setError(e?.message || 'Could not open direct message')
    } finally {
      setDmBusy(false)
    }
  }

  return (
    <>
      <Head>
        <title>Event Chat | TheoShift</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold text-gray-900">💬 Event Chat</h1>
                {effectiveViewAsVolunteerId ? (
                  <p className="text-sm text-amber-700">View-as volunteer simulation is active.</p>
                ) : (
                  <p className="text-sm text-gray-600 break-words">
                    Signed in as{' '}
                    <span className="break-all">{session?.user?.email || 'your volunteer profile'}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
                {effectiveViewAsVolunteerId && typeof router.query.eventId === 'string' && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await fetch(`/api/admin/view-as?eventId=${router.query.eventId}`, { method: 'DELETE' })
                      } catch {
                        // ignore
                      } finally {
                        setViewAsVolunteerId(null)
                        router.push(`/events/${router.query.eventId}/chat`)
                      }
                    }}
                    className="text-sm px-3 py-2 min-h-[44px] rounded bg-amber-700 text-white hover:bg-amber-800 touch-manipulation"
                  >
                    Exit Simulation
                  </button>
                )}
                <Link
                  href={
                    typeof router.query.eventId === 'string'
                      ? `/volunteer/dashboard?eventId=${router.query.eventId}${
                          effectiveViewAsVolunteerId ? `&viewAsVolunteerId=${effectiveViewAsVolunteerId}` : ''
                        }`
                      : '/volunteer/dashboard'
                  }
                  className="text-sm px-3 py-2 min-h-[44px] inline-flex items-center rounded border border-gray-200 bg-white text-blue-600 hover:bg-gray-50 touch-manipulation"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>

            {pushNotificationsEnabledForEvent && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Chat notifications</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {isViewAsSimulationActive ? (
                    <span className="text-xs text-gray-600">
                      Notifications are disabled during view-as simulation.
                    </span>
                  ) : pushStatus === 'unsupported' ? (
                    <span className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-2">
                      {isAppleTouchDevice()
                        ? 'This browser can\u2019t show push alerts. Add TheoShift to your Home Screen and use Safari 16.4+.'
                        : 'This browser can\u2019t show push alerts. Chat still updates while this page is open; try Chrome, Firefox, or Edge. On iPhone, install TheoShift to the Home Screen if needed.'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => (pushStatus === 'enabled' ? disablePush() : enablePush())}
                      className="text-sm px-4 py-2.5 min-h-[44px] rounded-md border border-gray-300 bg-white font-medium text-gray-900 shadow-sm hover:bg-gray-50 touch-manipulation w-full sm:w-auto"
                    >
                      {pushStatus === 'enabled' ? 'Disable notifications' : 'Enable notifications'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {dmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 max-h-[85vh] flex flex-col">
                <h2 className="text-lg font-semibold text-gray-900">Direct message</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Private chat with another volunteer registered for this event.
                </p>
                {isViewAsSimulationActive ? (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Direct messages are disabled while you are viewing the portal as a volunteer.
                  </div>
                ) : !myVolunteerId ? (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    We couldn&apos;t determine your volunteer profile for this event, so starting a DM isn&apos;t
                    available. Try refreshing or returning from your dashboard.
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
                    disabled={!myVolunteerId || isViewAsSimulationActive || !dmPeerId || dmBusy}
                    onClick={startVolunteerDm}
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
                  Open the chat for a specific assignment. Use search to find a station quickly.
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
          {loading && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-600">Loading chat channels...</p>
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {!loading && !error && channels.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-700">No chat channels are currently available for this event.</p>
            </div>
          )}

          {!loading && !error && channels.length > 0 && (
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
                          void openVolunteerDmModal()
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
                        c.id === selectedChannelId
                          ? 'bg-white border border-blue-300 shadow-sm'
                          : 'hover:bg-white/80 border border-transparent'
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
                  <p className="text-gray-600">Select a channel.</p>
                ) : (
                  <>
                    <div className="border-b border-gray-200 pb-3 mb-3">
                      <h2 className="text-lg font-semibold text-gray-900">{selectedChannel.name}</h2>
                      <p className="text-xs text-gray-500">{selectedChannel.type.replace('_', ' ')}</p>
                      {selectedChannel.type === 'EVENT_ANNOUNCEMENTS' && (
                        <p className="text-xs text-gray-500 mt-1">
                          Updates from organizers. A pinned message also stays on your dashboard until you acknowledge it.
                        </p>
                      )}
                      {selectedChannel.type === 'VOLUNTEER_DM' && (
                        <p className="text-xs text-gray-500 mt-1">Direct message — only you and the other volunteer can see this.</p>
                      )}
                    </div>

                    <div className="h-96 overflow-y-auto border border-gray-100 rounded-md p-3 bg-gray-50 mb-3 space-y-2">
                      {pinnedMessageId && (
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-2 mb-2">
                          <p className="text-xs font-semibold text-amber-800 mb-1">Pinned message</p>
                          {pinnedMessage ? (
                            <div>
                              <p className="text-xs text-amber-700">
                                {formatSender(pinnedMessage)} · {new Date(pinnedMessage.createdAt).toLocaleTimeString()}
                              </p>
                              <p className="text-sm text-amber-900 mt-1 whitespace-pre-wrap">{pinnedMessage.body}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-amber-700">Pinned message is not available.</p>
                          )}
                        </div>
                      )}
                      {messagesLoading && <p className="text-sm text-gray-500">Loading messages...</p>}
                      {!messagesLoading && messages.length === 0 && (
                        <p className="text-sm text-gray-500">No messages yet. Start the conversation.</p>
                      )}
                      {messages.map((message) => (
                        <div key={message.id} className="bg-white border border-gray-200 rounded-md p-2">
                          <p className="text-xs text-gray-500">
                            {formatSender(message)} · {new Date(message.createdAt).toLocaleTimeString()}
                          </p>
                          <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{message.body}</p>
                        </div>
                      ))}
                    </div>

                    {selectedChannel.type === 'EVENT_ANNOUNCEMENTS' ? (
                      <p className="text-sm text-gray-600">Only organizers can post in Announcements.</p>
                    ) : (
                    <>
                    {typingActors.length > 0 && (
                      <p className="text-xs text-gray-500 mb-1">
                        {typingActors.map((a) => a.label).join(', ')} typing…
                      </p>
                    )}
                    <div className="flex gap-2">
                      <textarea
                        value={composerValue}
                        onChange={(e) => {
                          setComposerValue(e.target.value)
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
                          if (sending || !composerValue.trim()) return
                          e.preventDefault()
                          void handleSend()
                        }}
                        placeholder="Type a message… Enter to send, Shift+Enter for a new line."
                        rows={2}
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={2000}
                      />
                      <button
                        onClick={handleSend}
                        disabled={sending || !composerValue.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {sending ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                    </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {!loading && !error && channels.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500">
                Messages auto-refresh every 5 seconds. Live socket streaming is planned next.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export async function getServerSideProps(context: any) {
  const { getServerSession } = await import('next-auth')
  const { authOptions } = await import('../api/auth/[...nextauth]')
  const { canSimulateVolunteerRole } = await import('@/lib/viewAsClient')

  const session = await getServerSession(context.req, context.res, authOptions)
  const isVolunteer = session?.user?.role === 'VOLUNTEER'
  const isStaffViewAs =
    canSimulateVolunteerRole(session?.user?.role) &&
    typeof context.query.viewAsVolunteerId === 'string' &&
    context.query.viewAsVolunteerId.length > 0

  if (!session || (!isVolunteer && !isStaffViewAs)) {
    return {
      redirect: {
        destination: '/volunteer/login',
        permanent: false
      }
    }
  }

  return { props: {} }
}
