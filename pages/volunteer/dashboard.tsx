import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import { revokeVolunteerBrowserSignIn } from '@/lib/revokeVolunteerBrowser'
import Head from 'next/head'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { formatCalendarDateLabel } from '@/lib/calendarDate'
import dynamic from 'next/dynamic'
import AnnouncementBanner from '../../components/AnnouncementBanner'
import PinnedAnnouncementBanner from '../../components/PinnedAnnouncementBanner'
import VolunteerPdfViewer from '../../components/VolunteerPdfViewer'
import EarlyCheckinPanel from '../../components/EarlyCheckinPanel'
import IvsVolunteerRequestPanel from '../../components/IvsVolunteerRequestPanel'
import {
  canSimulateVolunteerRole,
  getViewAsHeaders,
  getViewAsVolunteerId,
  setViewAsVolunteerId,
} from '@/lib/viewAsClient'
import type { ChatPushSetupStatus } from '@/lib/chatPushClient'
import {
  disableChatPushSubscription,
  enableChatPushSubscription,
  fetchChatPushVapidConfigured,
  getChatPushSetupStatus,
} from '@/lib/chatPushClient'
import { notifyAlert, toast } from '../../lib/ui/toast'
import { formatPhoneNumber, displayPhone } from '@/lib/formatPhone'

// Lazy load mobile dashboard (only loaded on mobile devices)
const MobileVolunteerDashboard = dynamic(() => import('../../components/MobileVolunteerDashboard'), {
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  )
})

interface Volunteer {
  id: string
  firstName: string
  lastName: string
  congregation: string
  email: string
  phone: string
  profileVerificationRequired?: boolean
  profileVerifiedAt?: string
}

interface Event {
  id: string
  name: string
  eventType: string
  startDate: string
  endDate: string
  status: string
}

interface Assignment {
  id: string
  positionId: string
  positionName: string
  startTime: string
  endTime: string
  location?: string
  instructions?: string
  overseer?: string
  keyman?: string
  completeSchedule?: Array<{
    volunteerName: string
    isCurrentUser: boolean
    shiftName: string
    startTime: string
    endTime: string
    isAllDay: boolean
  }>
}

interface Document {
  id: string
  title: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  description?: string
  publishedAt: string
}

interface OversightContact {
  name: string
  role: string
  phone?: string
  email?: string
}

interface CountStationTask {
  positionId: string
  name: string
  positionNumber?: number | null
  existingCount?: number | null
  existingNotes?: string | null
  hasSubmitted?: boolean
}

interface CountSession {
  id: string
  sessionName: string
  countTime: string | null
  status: string
  positionIds?: string[]
  stations?: CountStationTask[]
  existingCount?: number | null
  existingNotes?: string | null
  hasSubmitted?: boolean
}

interface ActiveCountGroup {
  sessionId: string
  sessionName: string
  countTime: string | null
  groupId: string
  groupName: string
  primaryVolunteerId?: string | null
  secondaryVolunteerId?: string | null
  primaryName?: string | null
  secondaryName?: string | null
  stations: Array<{ id: string; name: string; positionNumber?: number | null }>
  existingCount?: number | null
  existingNotes?: string | null
  hasSubmitted?: boolean
}

interface AvailabilityRequest {
  id: string
  eventId: string
  status: string
  requestedAt: string
  respondedAt: string | null
  event: {
    id: string
    name: string
    startDate: string
    endDate: string
    location: string
  }
}

interface StationDiagram {
  documentId: string
  title: string
  fileType: string
  fileName: string
}

interface DashboardData {
  volunteer: Volunteer
  event: Event
  stationDiagram?: StationDiagram | null
  assignments: Assignment[]
  documents: Document[]
  oversightContacts: OversightContact[]
  activeCountSessions?: CountSession[]
  activeCountGroups?: ActiveCountGroup[]
  /** When the next assigned count replaces the one on screen. */
  nextCountAvailableAt?: string | null
  canReviseSubmittedCounts?: boolean
  isIVSTeamMember?: boolean
  canSubmitIvsRequests?: boolean
}

interface ChatChannel {
  id: string
  eventId: string
  type: 'EVENT_ANNOUNCEMENTS' | 'EVENT_GENERAL' | 'POSITION' | 'VOLUNTEER_DM'
  name: string
  positionId?: string | null
  unreadCount?: number
  lastMessageAt?: string | null
}

interface VolunteerDashboardProps {
  initialEventId?: string
}

export default function VolunteerDashboard({ initialEventId }: VolunteerDashboardProps) {
  const router = useRouter()
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      // Redirect to volunteer login, not admin login
      router.push('/volunteer/login')
    },
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [showProfileVerification, setShowProfileVerification] = useState(false)
  const [profileData, setProfileData] = useState({ email: '', phone: '' })
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editProfileData, setEditProfileData] = useState({ email: '', phone: '' })
  const [countValues, setCountValues] = useState<Map<string, string>>(new Map())
  const [countNotes, setCountNotes] = useState<Map<string, string>>(new Map())
  const [submittingCount, setSubmittingCount] = useState(false)
  const [countSuccess, setCountSuccess] = useState('')
  const [submittedCounts, setSubmittedCounts] = useState<Map<string, {count: number, notes?: string}>>(new Map())
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [availabilityRequests, setAvailabilityRequests] = useState<AvailabilityRequest[]>([])
  const [respondingToRequest, setRespondingToRequest] = useState<string | null>(null)
  const [availabilityComments, setAvailabilityComments] = useState<Record<string, string>>({})
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'checkin' | 'request'>('dashboard')
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null)
  const [chatChannels, setChatChannels] = useState<ChatChannel[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [showChatOnboarding, setShowChatOnboarding] = useState(false)
  /** Shown when polling detects new unread while the dashboard tab is visible */
  const [chatNotice, setChatNotice] = useState<string | null>(null)
  const lastChatUnreadTotalRef = useRef<number | null>(null)

  const [chatPushEnabledForEvent, setChatPushEnabledForEvent] = useState(false)
  const [chatPushVapidOk, setChatPushVapidOk] = useState(false)
  const [chatPushSetupStatus, setChatPushSetupStatus] = useState<ChatPushSetupStatus>('unknown')
  const [chatPushNudgeDismissed, setChatPushNudgeDismissed] = useState(false)
  const [chatPushEnabling, setChatPushEnabling] = useState(false)
  const [notifPermissionDenied, setNotifPermissionDenied] = useState(false)
  const simulatedVolunteerIdFromQuery = typeof router.query.viewAsVolunteerId === 'string' ? router.query.viewAsVolunteerId : null

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!canSimulateVolunteerRole(session?.user?.role)) return
    if (simulatedVolunteerIdFromQuery) {
      setViewAsVolunteerId(simulatedVolunteerIdFromQuery)
    }
  }, [session?.user?.role, simulatedVolunteerIdFromQuery])

  useEffect(() => {
    if (!viewingDocument) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewingDocument(null)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [viewingDocument])

  useEffect(() => {
    // Detect mobile on mount and window resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Session is guaranteed to exist due to server-side check and useSession({ required: true })
    if (status === 'loading') {
      console.log('⏳ Waiting for session to load...')
      return
    }
    
    if (session) {
      console.log('✅ Session ready, loading dashboard for volunteer:', session.user.id)
      loadDashboard()
    }
  }, [status, session, simulatedVolunteerIdFromQuery])

  const fetchAvailabilityRequests = async (eventId: string) => {
    try {
      const response = await fetch(`/api/volunteer/availability?eventId=${eventId}`, {
        headers: { ...getViewAsHeaders() }
      })
      const data = await response.json()
      
      if (data.success) {
        setAvailabilityRequests(data.requests)
      }
    } catch (error) {
      console.error('Failed to fetch availability requests:', error)
    }
  }

  const fetchChatChannels = useCallback(async (eventId: string, opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setChatLoading(true)
      const response = await fetch(`/api/events/${eventId}/chat/channels`, {
        headers: { ...getViewAsHeaders() }
      })
      const data = await response.json()

      if (response.ok && data.success) {
        const channels: ChatChannel[] = data.data?.channels || []
        const total = channels.reduce((sum, c) => sum + (c.unreadCount || 0), 0)

        if (
          opts?.silent &&
          lastChatUnreadTotalRef.current !== null &&
          total > lastChatUnreadTotalRef.current
        ) {
          const delta = total - lastChatUnreadTotalRef.current
          if (typeof document !== 'undefined') {
            if (
              document.visibilityState === 'hidden' &&
              typeof Notification !== 'undefined' &&
              Notification.permission === 'granted'
            ) {
              try {
                new Notification('TheoShift — Event chat', {
                  body: delta === 1 ? '1 new unread message' : `${delta} new unread messages`,
                  icon: '/logo-192.png',
                  tag: `theoshift-chat-${eventId}`,
                })
              } catch {
                // ignore
              }
            } else if (document.visibilityState === 'visible') {
              setChatNotice(delta === 1 ? 'New chat message' : `${delta} new chat messages`)
              window.setTimeout(() => setChatNotice(null), 6000)
            }
          }
        }
        lastChatUnreadTotalRef.current = total

        setChatChannels(channels)
        setChatPushEnabledForEvent(!!data.data?.pushNotificationsEnabled)

        if (!opts?.silent) {
          void (async () => {
            const vapidOk = await fetchChatPushVapidConfigured()
            setChatPushVapidOk(vapidOk)
            if (!vapidOk) {
              setChatPushSetupStatus('unsupported')
              return
            }
            const st = await getChatPushSetupStatus(getViewAsHeaders)
            setChatPushSetupStatus(st)
          })()
        }

        if (!opts?.silent && channels.length > 0 && volunteer?.id) {
          const onboardingKey = `chatOnboardingSeen:${eventId}:${volunteer.id}`
          const seen = localStorage.getItem(onboardingKey)
          if (!seen) {
            setShowChatOnboarding(true)
          }
        }
      } else if (!opts?.silent) {
        setChatChannels([])
      }
    } catch (error) {
      console.error('Failed to fetch chat channels:', error)
      if (!opts?.silent) setChatChannels([])
    } finally {
      if (!opts?.silent) setChatLoading(false)
    }
  }, [volunteer?.id])

  useEffect(() => {
    lastChatUnreadTotalRef.current = null
  }, [selectedEventId])

  useEffect(() => {
    if (!selectedEventId || status !== 'authenticated') return
    const eventId = selectedEventId
    const intervalId = window.setInterval(() => {
      fetchChatChannels(eventId, { silent: true })
    }, 20000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchChatChannels(eventId, { silent: true })
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [selectedEventId, status, fetchChatChannels])

  useEffect(() => {
    setChatPushEnabledForEvent(false)
    setChatPushVapidOk(false)
    setChatPushSetupStatus('unknown')
    if (!selectedEventId || typeof window === 'undefined') {
      setChatPushNudgeDismissed(false)
      return
    }
    setChatPushNudgeDismissed(
      !!localStorage.getItem(`chatPushDashboardNudgeDismissed:${selectedEventId}`)
    )
  }, [selectedEventId])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return
    setNotifPermissionDenied(Notification.permission === 'denied')
  }, [])

  const handleEnableChatPushNudge = async () => {
    setChatPushEnabling(true)
    try {
      await enableChatPushSubscription(getViewAsHeaders)
      const st = await getChatPushSetupStatus(getViewAsHeaders)
      setChatPushSetupStatus(st)
      if (typeof Notification !== 'undefined') {
        setNotifPermissionDenied(Notification.permission === 'denied')
      }
    } catch (e: any) {
      notifyAlert(e?.message || 'Could not enable notifications.')
      if (typeof Notification !== 'undefined') {
        setNotifPermissionDenied(Notification.permission === 'denied')
      }
    } finally {
      setChatPushEnabling(false)
    }
  }

  const handleDismissChatPushNudge = () => {
    if (selectedEventId && typeof window !== 'undefined') {
      localStorage.setItem(`chatPushDashboardNudgeDismissed:${selectedEventId}`, '1')
    }
    setChatPushNudgeDismissed(true)
  }

  const handleDisableChatPush = async () => {
    setChatPushEnabling(true)
    try {
      await disableChatPushSubscription(getViewAsHeaders)
      const st = await getChatPushSetupStatus(getViewAsHeaders)
      setChatPushSetupStatus(st)
    } catch {
      notifyAlert('Could not turn off notifications. Try again.')
    } finally {
      setChatPushEnabling(false)
    }
  }

  const handleAvailabilityResponse = async (requestId: string, status: string, notes?: string) => {
    try {
      const comment = (notes ?? availabilityComments[requestId] ?? '').trim()
      if (status === 'PARTIAL' && !comment) {
        notifyAlert('Please add a comment explaining your partial availability (for example: “Friday only” or “mornings only”).')
        return
      }

      setRespondingToRequest(requestId)
      
      const response = await fetch(`/api/volunteer/availability?eventId=${selectedEventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getViewAsHeaders() },
        body: JSON.stringify({ requestId, status, notes: comment || undefined })
      })

      const data = await response.json()

      if (data.success) {
        setAvailabilityComments((prev) => {
          const next = { ...prev }
          delete next[requestId]
          return next
        })
        if (selectedEventId) {
          await fetchAvailabilityRequests(selectedEventId)
        }
      } else {
        notifyAlert(data.error || 'Failed to submit response')
      }
    } catch (error) {
      console.error('Failed to submit availability response:', error)
      notifyAlert('Failed to submit response')
    } finally {
      setRespondingToRequest(null)
    }
  }

  const loadDashboard = async (options?: { silent?: boolean }) => {
    try {
      if (!session?.user?.id) {
        console.error('❌ loadDashboard called without session.user.id')
        setError('Session not ready. Please wait...')
        setLoading(false)
        return
      }
      
      const simulatedVolunteerId = canSimulateVolunteerRole(session.user.role)
        ? (simulatedVolunteerIdFromQuery || getViewAsVolunteerId())
        : null
      const effectiveVolunteerId = simulatedVolunteerId || session.user.id

      console.log('📊 Loading dashboard for volunteer:', effectiveVolunteerId)
      
      // Get selected event from query param or localStorage fallback
      const eventId = router.query.eventId as string || localStorage.getItem('selectedEventId')
      
      if (!eventId) {
        console.log('📊 No eventId found, redirecting to select-event')
        // Need to select an event first
        router.push('/volunteer/select-event')
        return
      }
      
      console.log('📊 Using eventId:', eventId)
      setSelectedEventId(eventId)

      // Fetch dashboard data
      console.log('📊 Fetching dashboard data from API...')
      const response = await fetch(
        `/api/volunteer/dashboard?volunteerId=${effectiveVolunteerId}&eventId=${eventId}`,
        { headers: { ...getViewAsHeaders() } }
      )
      
      if (!response.ok) {
        console.error('❌ API response not OK:', response.status, response.statusText)
        throw new Error(`API error: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('📊 API response:', result)

      if (result.success) {
        console.log('✅ Dashboard data loaded successfully')
        setDashboardData(result.data)
        setVolunteer(result.data.volunteer)

        const groups = result.data.activeCountGroups ?? []
        const countSessions = result.data.activeCountSessions ?? []
        const rememberSubmitted = (
          next: Map<string, { count: number; notes?: string }>,
          key: string,
          count: number | null | undefined,
          notes: string | null | undefined,
          submitted: boolean | undefined
        ) => {
          if (!submitted && count == null) return
          next.set(key, {
            count: count ?? 0,
            notes: notes || undefined
          })
        }
        setSubmittedCounts((prev) => {
          const next = new Map(prev)
          for (const g of groups) {
            rememberSubmitted(next, `g:${g.groupId}`, g.existingCount, g.existingNotes, g.hasSubmitted)
          }
          for (const s of countSessions) {
            const stations = s.stations ?? []
            if (stations.length === 0) {
              rememberSubmitted(next, s.id, s.existingCount, s.existingNotes, s.hasSubmitted)
            }
            for (const station of stations) {
              rememberSubmitted(
                next,
                `${s.id}:${station.positionId}`,
                station.existingCount,
                station.existingNotes,
                station.hasSubmitted
              )
            }
          }
          return next
        })
        setCountValues((prev) => {
          const next = new Map(prev)
          for (const g of groups) {
            if (g.existingCount != null && !next.has(`g:${g.groupId}`)) {
              next.set(`g:${g.groupId}`, String(g.existingCount))
            }
          }
          for (const s of countSessions) {
            for (const station of s.stations ?? []) {
              const key = `${s.id}:${station.positionId}`
              if (station.existingCount != null && !next.has(key)) {
                next.set(key, String(station.existingCount))
              }
            }
          }
          return next
        })
        setCountNotes((prev) => {
          const next = new Map(prev)
          for (const g of groups) {
            if (g.existingNotes && !next.has(`g:${g.groupId}`)) {
              next.set(`g:${g.groupId}`, g.existingNotes)
            }
          }
          for (const s of countSessions) {
            for (const station of s.stations ?? []) {
              const key = `${s.id}:${station.positionId}`
              if (station.existingNotes && !next.has(key)) {
                next.set(key, station.existingNotes)
              }
            }
          }
          return next
        })
        
        if (!options?.silent) {
          await fetchAvailabilityRequests(eventId)
          await fetchChatChannels(eventId)

          const needsVerification = !result.data.volunteer.email ||
                                    !result.data.volunteer.phone ||
                                    result.data.volunteer.profileVerificationRequired

          if (needsVerification) {
            setProfileData({
              email: result.data.volunteer.email || '',
              phone: result.data.volunteer.phone || ''
            })
            setShowProfileVerification(true)
          }
        }
      } else if (!options?.silent) {
        setError(result.error || 'Failed to load dashboard')
      }
    } catch (error) {
      console.error('Dashboard loading error:', error)
      if (!options?.silent) {
        setError('An error occurred while loading your dashboard')
      }
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }

  const loadDashboardRef = useRef(loadDashboard)
  loadDashboardRef.current = loadDashboard

  useEffect(() => {
    const revealAt = dashboardData?.nextCountAvailableAt
    const hasCountWork = Boolean(
      revealAt ||
      dashboardData?.activeCountGroups?.length ||
      dashboardData?.activeCountSessions?.length
    )
    if (!hasCountWork) return

    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      void loadDashboardRef.current({ silent: true })
    }
    const intervalId = window.setInterval(refresh, 20000)
    let handoffId: number | undefined
    if (revealAt) {
      const delay = new Date(revealAt).getTime() - Date.now()
      handoffId = window.setTimeout(refresh, Math.max(delay, 0) + 1000)
    }
    return () => {
      window.clearInterval(intervalId)
      if (handoffId) window.clearTimeout(handoffId)
    }
  }, [
    dashboardData?.nextCountAvailableAt,
    dashboardData?.activeCountGroups?.length,
    dashboardData?.activeCountSessions?.length,
  ])
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setProfileData({ ...profileData, phone: formatted })
  }

  const handleProfileVerification = async () => {
    try {
      // Validate phone number (must be 10 digits)
      const cleaned = profileData.phone.replace(/\D/g, '')
      if (cleaned.length !== 10) {
        notifyAlert('Please enter a valid 10-digit phone number')
        return
      }

      // Update profile via API
      const response = await fetch(`/api/volunteer/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volunteerId: volunteer?.id,
          email: profileData.email,
          phone: profileData.phone
        })
      })
      
      if (response.ok) {
        setShowProfileVerification(false)
        loadDashboard()
      }
    } catch (error) {
      console.error('Profile update failed:', error)
    }
  }

  const handleEditProfile = () => {
    setEditProfileData({
      email: dashboardData?.volunteer.email || '',
      phone: dashboardData?.volunteer.phone || ''
    })
    setIsEditingProfile(true)
  }

  const handleSaveProfile = async () => {
    try {
      const response = await fetch(`/api/volunteer/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volunteerId: volunteer?.id,
          email: editProfileData.email,
          phone: editProfileData.phone
        })
      })
      
      if (response.ok) {
        setIsEditingProfile(false)
        // Reload dashboard to get updated data
        loadDashboard()
      } else {
        notifyAlert('Failed to update profile')
      }
    } catch (error) {
      console.error('Profile update failed:', error)
      notifyAlert('Failed to update profile')
    }
  }

  const handleCancelEdit = () => {
    setIsEditingProfile(false)
    setEditProfileData({ email: '', phone: '' })
  }

  const handleLogout = async () => {
    // Clear localStorage
    localStorage.removeItem('volunteerSession')
    localStorage.removeItem('selectedEventId')
    localStorage.removeItem('profileVerified')
    
    await revokeVolunteerBrowserSignIn()
    await signOut({ redirect: false })
    
    // Redirect to volunteer login
    router.push('/volunteer/login')
  }

  const handleSwitchEvent = () => {
    router.push('/volunteer/select-event')
  }

  const dismissChatOnboarding = () => {
    if (selectedEventId && volunteer?.id) {
      localStorage.setItem(`chatOnboardingSeen:${selectedEventId}:${volunteer.id}`, '1')
    }
    setShowChatOnboarding(false)
  }

  const totalUnreadChat = chatChannels.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  const effectiveViewAsVolunteerId = canSimulateVolunteerRole(session?.user?.role)
    ? (simulatedVolunteerIdFromQuery || getViewAsVolunteerId())
    : null

  const showChatPushNudge = useMemo(
    () =>
      !!selectedEventId &&
      chatChannels.length > 0 &&
      chatPushEnabledForEvent &&
      chatPushVapidOk &&
      chatPushSetupStatus === 'disabled' &&
      !effectiveViewAsVolunteerId &&
      !chatPushNudgeDismissed,
    [
      selectedEventId,
      chatChannels.length,
      chatPushEnabledForEvent,
      chatPushVapidOk,
      chatPushSetupStatus,
      effectiveViewAsVolunteerId,
      chatPushNudgeDismissed,
    ]
  )

  const chatNoticeToast =
    chatNotice && selectedEventId ? (
      <div
        className="fixed z-[60] left-3 right-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-md rounded-lg bg-blue-600 text-white text-sm shadow-lg px-4 py-3 flex flex-wrap items-center gap-2 sm:gap-3"
        role="status"
      >
        <span className="font-medium flex-1 min-w-0">💬 {chatNotice}</span>
        <Link
          href={`/volunteer/chat?eventId=${selectedEventId}${
            effectiveViewAsVolunteerId ? `&viewAsVolunteerId=${effectiveViewAsVolunteerId}` : ''
          }`}
          className="shrink-0 underline font-semibold text-white"
        >
          Open chat
        </Link>
        <button
          type="button"
          className="shrink-0 ml-auto text-white/90 hover:text-white px-2 py-1"
          onClick={() => setChatNotice(null)}
          aria-label="Dismiss chat notice"
        >
          ✕
        </button>
      </div>
    ) : null

  const showChatPushEnabledBar =
    !!selectedEventId &&
    chatChannels.length > 0 &&
    chatPushEnabledForEvent &&
    chatPushVapidOk &&
    chatPushSetupStatus === 'enabled' &&
    !effectiveViewAsVolunteerId

  const chatPushEnabledBar = showChatPushEnabledBar ? (
    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-950 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium">Chat notifications are on for this browser.</p>
        <button
          type="button"
          onClick={() => void handleDisableChatPush()}
          disabled={chatPushEnabling}
          className="rounded-md border border-green-300 bg-white px-3 py-2 text-xs font-semibold text-green-900 hover:bg-green-100 disabled:opacity-50"
        >
          {chatPushEnabling ? 'Updating…' : 'Turn off notifications'}
        </button>
      </div>
    </div>
  ) : null

  const chatPushNudgeBanner = showChatPushNudge ? (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-amber-950">Get notified for event chat</p>
          <p className="mt-1 text-xs text-amber-900/90">
            Receive browser alerts when someone posts while this tab is in the background. Push uses your server&apos;s
            VAPID keys — they are configured when the enable button is available.
          </p>
          {notifPermissionDenied && (
            <p className="mt-2 text-xs font-medium text-amber-900">
              Notifications are blocked for this site. Open your browser&apos;s site settings for TheoShift and allow
              notifications, then try again.
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-wrap gap-2 sm:pt-0.5">
          <button
            type="button"
            onClick={() => void handleEnableChatPushNudge()}
            disabled={chatPushEnabling || notifPermissionDenied}
            className="rounded-md bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {chatPushEnabling ? 'Enabling…' : 'Turn on notifications'}
          </button>
          <button
            type="button"
            onClick={handleDismissChatPushNudge}
            className="rounded-md px-3 py-2 text-xs font-medium text-amber-900 underline hover:text-amber-950"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  ) : null

  const handleSubmitCount = async (sessionId: string, positionId: string) => {
    const key = `${sessionId}:${positionId}`
    const countValue = countValues.get(key) || ''
    if (!countValue || !positionId) {
      return
    }

    setSubmittingCount(true)
    setCountSuccess('')

    try {
      const notes = countNotes.get(key) || ''
      
      const response = await fetch(`/api/events/${selectedEventId}/count-sessions/${sessionId}/counts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getViewAsHeaders() },
        body: JSON.stringify({
          positionId,
          attendeeCount: parseInt(countValue),
          notes: notes || undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        setCountSuccess('Count submitted successfully!')
        setEditingSession(null)
        setSubmittedCounts(prev => new Map(prev).set(key, {
          count: parseInt(countValue),
          notes: notes || undefined
        }))
        setTimeout(() => setCountSuccess(''), 3000)
      } else {
        notifyAlert(result.error || 'Failed to submit count')
      }
    } catch (error) {
      console.error('Count submission error:', error)
      notifyAlert('An error occurred while submitting the count')
    } finally {
      setSubmittingCount(false)
    }
  }

  const handleSubmitGroupCount = async (task: ActiveCountGroup) => {
    const key = `g:${task.groupId}`
    const countValue = countValues.get(key) || ''
    if (!countValue || !selectedEventId) {
      return
    }

    setSubmittingCount(true)
    setCountSuccess('')

    try {
      const notes = countNotes.get(key) || ''
      const response = await fetch(
        `/api/events/${selectedEventId}/count-sessions/${task.sessionId}/counts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getViewAsHeaders() },
          body: JSON.stringify({
            groupId: task.groupId,
            attendeeCount: parseInt(countValue, 10),
            notes: notes.trim() || undefined
          })
        }
      )

      const result = await response.json()

      if (result.success) {
        setCountSuccess('Count submitted successfully!')
        setEditingSession(null)
        setSubmittedCounts((prev) =>
          new Map(prev).set(key, {
            count: parseInt(countValue, 10),
            notes: notes.trim() || undefined
          })
        )
        setTimeout(() => setCountSuccess(''), 3000)
      } else {
        notifyAlert(result.error || 'Failed to submit count')
      }
    } catch (error) {
      console.error('Group count submission error:', error)
      notifyAlert('An error occurred while submitting the count')
    } finally {
      setSubmittingCount(false)
    }
  }

  const formatDate = (dateString: string) => formatCalendarDateLabel(dateString) || 'Invalid date'

  const formatTime = (timeString: string) => {
    // If the time string already includes AM/PM, return it as-is
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString
    }
    
    // Otherwise, try to parse it as a 24-hour format
    try {
      return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch (error) {
      // If parsing fails, return the original string
      return timeString
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('video')) return '🎥'
    if (fileType.includes('audio')) return '🎵'
    if (fileType.includes('text')) return '📝'
    return '📎'
  }

  const profileVerificationModal = showProfileVerification ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Information</h2>
          <p className="text-sm text-gray-600">
            Please confirm or update your contact information. This helps us keep you informed about your assignments.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={handlePhoneChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(555) 123-4567"
              maxLength={14}
            />
            <p className="text-xs text-gray-500 mt-1">Format: (XXX) XXX-XXXX</p>
          </div>

          <button
            onClick={handleProfileVerification}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Confirm Information
          </button>
        </div>
      </div>
    </div>
  ) : null

  const chatOnboardingModal = showChatOnboarding ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">💬</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Chat Is Now Available</h2>
          <p className="text-sm text-gray-600">
            You can now receive real-time event updates and messages directly in your dashboard.
            No additional login is required.
          </p>
        </div>

        <div className="space-y-3 mb-6 text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p>• <strong>Announcements</strong> from oversight</p>
          <p>• <strong>Event General</strong> team chat</p>
          <p>• <strong>Position channels</strong> for your assignments</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={dismissChatOnboarding}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={() => {
              dismissChatOnboarding()
              if (selectedEventId) {
                const viewAs = effectiveViewAsVolunteerId ? `&viewAsVolunteerId=${effectiveViewAsVolunteerId}` : ''
                router.push(`/volunteer/chat?eventId=${selectedEventId}${viewAs}`)
              }
            }}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Open Chat
          </button>
        </div>
      </div>
    </div>
  ) : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !dashboardData) {
    if (!dashboardData) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">No dashboard data available</p>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => void handleLogout()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  // Mobile View
  if (isMobile) {
    return (
      <>
        <Head>
          <title>My Dashboard - {dashboardData.event.name}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        </Head>
        {chatNoticeToast}
        {chatPushEnabledBar && (
          <div className="bg-gray-50 px-4 pt-3 pb-1">
            {chatPushEnabledBar}
          </div>
        )}
        {chatPushNudgeBanner && (
          <div className="bg-gray-50 px-4 pt-3 pb-1">
            {chatPushNudgeBanner}
          </div>
        )}
        {profileVerificationModal}
        {chatOnboardingModal}
        <MobileVolunteerDashboard
          volunteer={dashboardData.volunteer}
          event={dashboardData.event}
          assignments={dashboardData.assignments}
          stationDiagram={dashboardData.stationDiagram || null}
          oversightContacts={dashboardData.oversightContacts}
          activeCountSessions={dashboardData.activeCountSessions}
          activeCountGroups={dashboardData.activeCountGroups}
          nextCountAvailableAt={dashboardData.nextCountAvailableAt}
          canReviseSubmittedCounts={Boolean(dashboardData.canReviseSubmittedCounts)}
          documents={dashboardData.documents}
          availabilityRequests={availabilityRequests}
          onAvailabilityResponse={handleAvailabilityResponse}
          onRefresh={loadDashboard}
          onSignOut={() => void handleLogout()}
          chatEnabled={chatChannels.length > 0}
          chatChannelCount={chatChannels.length}
          chatUnreadCount={totalUnreadChat}
          chatHref={
            selectedEventId
              ? `/volunteer/chat?eventId=${selectedEventId}${
                  effectiveViewAsVolunteerId ? `&viewAsVolunteerId=${effectiveViewAsVolunteerId}` : ''
                }`
              : '/volunteer/chat'
          }
          enterCountViewAsVolunteerId={effectiveViewAsVolunteerId}
          showEarlyCheckIn={!!dashboardData.isIVSTeamMember}
          showIvsRequest={!!dashboardData.canSubmitIvsRequests}
        />
      </>
    )
  }

  // Desktop View
  return (
    <>
      <Head>
        <title>Volunteer Dashboard | TheoShift</title>
      </Head>

      {chatNoticeToast}
      {profileVerificationModal}
      {chatOnboardingModal}

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <span className="text-2xl font-bold text-blue-600">📋</span>
                <span className="ml-2 text-xl font-semibold text-gray-900">
                  TheoShift
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {volunteer?.firstName} {volunteer?.lastName}
                </span>
                <Link href="/volunteer/devices" className="text-sm text-blue-600 hover:text-blue-800">
                  Phones
                </Link>
                <button
                  onClick={handleSwitchEvent}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Switch Event
                </button>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {effectiveViewAsVolunteerId && dashboardData?.event?.id && (
          <div className="bg-amber-100 border-b border-amber-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
              <p className="text-sm text-amber-900 font-medium">
                View-as volunteer simulation is active. You are seeing the volunteer experience.
              </p>
              <button
                onClick={async () => {
                  try {
                    await fetch(`/api/admin/view-as?eventId=${dashboardData.event.id}`, { method: 'DELETE' })
                  } catch {
                    // ignore
                  } finally {
                    setViewAsVolunteerId(null)
                    router.push(`/events/${dashboardData.event.id}`)
                  }
                }}
                className="px-3 py-1 bg-amber-700 text-white rounded text-sm hover:bg-amber-800"
              >
                Exit Simulation
              </button>
            </div>
          </div>
        )}

        {/* Announcements Banner */}
        {dashboardData?.event?.id && <AnnouncementBanner eventId={dashboardData.event.id} />}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PinnedAnnouncementBanner eventId={dashboardData.event.id} className="mb-6" />
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, {dashboardData.volunteer.firstName}!
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              {dashboardData.event.name}
            </p>
            <p className="text-sm text-gray-500">
              {formatDate(dashboardData.event.startDate)} - {formatDate(dashboardData.event.endDate)}
            </p>
          </div>

          {/* Chat Availability Card */}
          {chatChannels.length > 0 && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-blue-900">💬 Event Chat is available</h2>
                  <p className="text-sm text-blue-800 mt-1">
                    Join {chatChannels.length} channel{chatChannels.length === 1 ? '' : 's'} for real-time event communication.
                  </p>
                  {totalUnreadChat > 0 && (
                    <p className="text-xs font-medium text-blue-900 mt-1">
                      {totalUnreadChat} unread message{totalUnreadChat === 1 ? '' : 's'}
                    </p>
                  )}
                </div>
                <Link
                  href={
                    selectedEventId
                      ? `/volunteer/chat?eventId=${selectedEventId}${
                          effectiveViewAsVolunteerId ? `&viewAsVolunteerId=${effectiveViewAsVolunteerId}` : ''
                        }`
                      : '/volunteer/chat'
                  }
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors whitespace-nowrap"
                >
                  Open Chat
                </Link>
              </div>
            </div>
          )}
          {chatPushEnabledBar && <div className="mb-6">{chatPushEnabledBar}</div>}
          {chatPushNudgeBanner && <div className="mb-6">{chatPushNudgeBanner}</div>}
          {chatLoading && (
            <p className="mb-6 text-sm text-gray-500">Loading chat availability...</p>
          )}

          {/* Tab Navigation for IVS features */}
          {(dashboardData.isIVSTeamMember || dashboardData.canSubmitIvsRequests) && (
            <div className="mb-6 border-b border-gray-200">
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
                    activeTab === 'dashboard'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📋 Dashboard
                </button>
                {dashboardData.isIVSTeamMember && (
                  <button
                    onClick={() => setActiveTab('checkin')}
                    className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
                      activeTab === 'checkin'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ✅ Early Check-In
                  </button>
                )}
                {dashboardData.canSubmitIvsRequests && (
                  <button
                    onClick={() => setActiveTab('request')}
                    className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
                      activeTab === 'request'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ➕ Request Volunteer
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* My Assignments */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="text-xl mr-2">📋</span>
                    My Assignments
                  </h2>
                </div>
                <div className="p-6">
                  {!dashboardData.assignments || dashboardData.assignments.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">📝</div>
                      <p className="text-gray-600">No assignments yet</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Check back later or contact your overseer
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.assignments?.map((assignment) => (
                        <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="w-full">
                              <h3 className="font-medium text-gray-900">{assignment.positionName}</h3>
                              {assignment.location && (
                                <p className="text-sm text-gray-600 mt-1">📍 {assignment.location}</p>
                              )}
                              {dashboardData.stationDiagram && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewingDocument({
                                      id: dashboardData.stationDiagram!.documentId,
                                      title: `Look for ${assignment.positionName}`,
                                      fileName: dashboardData.stationDiagram!.fileName,
                                      fileUrl: '',
                                      fileType:
                                        dashboardData.stationDiagram!.fileType ||
                                        (dashboardData.stationDiagram!.fileName.toLowerCase().endsWith('.pdf')
                                          ? 'application/pdf'
                                          : 'image/jpeg'),
                                      fileSize: 0,
                                      publishedAt: '',
                                    })
                                  }
                                  className="mt-2 text-sm font-medium text-blue-700 hover:underline"
                                >
                                  Show on diagram
                                </button>
                              )}
                              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                <span>🕐 {assignment.startTime === 'All Day' ? 'All Day' : `${formatTime(assignment.startTime)}${assignment.endTime ? ` - ${formatTime(assignment.endTime)}` : ''}`}</span>
                              </div>
                              {assignment.instructions && (
                                <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                                  {assignment.instructions}
                                </p>
                              )}
                              
                              {/* Complete Schedule (FB-003) */}
                              {assignment.completeSchedule && assignment.completeSchedule.length > 1 && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                  <p className="text-xs font-medium text-gray-700 mb-2">📅 Complete Position Schedule:</p>
                                  <div className="space-y-1">
                                    {assignment.completeSchedule.map((schedule, idx) => (
                                      <div 
                                        key={idx} 
                                        className={`text-xs p-2 rounded ${
                                          schedule.isCurrentUser 
                                            ? 'bg-blue-50 border border-blue-200 font-medium text-blue-900' 
                                            : 'bg-gray-50 text-gray-700'
                                        }`}
                                      >
                                        <span className="font-medium">{schedule.volunteerName}</span>
                                        {schedule.isCurrentUser && <span className="ml-1 text-blue-600">(You)</span>}
                                        <span className="mx-2">•</span>
                                        <span>
                                          {schedule.isAllDay ? 'All Day' : `${formatTime(schedule.startTime)}${schedule.endTime ? ` - ${formatTime(schedule.endTime)}` : ''}`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {(assignment.overseer || assignment.keyman) && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <p className="text-xs text-gray-500 mb-1">Position Oversight:</p>
                                  <div className="flex flex-wrap gap-3 text-sm">
                                    {assignment.overseer && (
                                      <span className="text-blue-600">
                                        👤 Overseer: {assignment.overseer}
                                      </span>
                                    )}
                                    {assignment.keyman && (
                                      <span className="text-green-600">
                                        🔑 Keyman: {assignment.keyman}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Availability Requests */}
              {availabilityRequests.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 shadow-lg rounded-lg">
                  <div className="px-6 py-4 border-b border-blue-200 bg-white bg-opacity-60">
                    <h2 className="text-lg font-medium text-gray-900 flex items-center">
                      <span className="text-xl mr-2">📅</span>
                      Availability Requests
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Please respond to confirm your availability
                    </p>
                  </div>
                  <div className="p-6 space-y-4">
                    {availabilityRequests.map((request) => (
                      <div key={request.id} className="bg-white rounded-lg border border-blue-200 p-4">
                        <div className="mb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{request.event.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                📍 {request.event.location}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                📅 {formatDate(request.event.startDate)} - {formatDate(request.event.endDate)}
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                Requested: {format(parseISO(request.requestedAt), 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                            {request.status !== 'PENDING' && (
                              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                request.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                                request.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {request.status === 'AVAILABLE' ? '✅ Available' :
                                 request.status === 'PARTIAL' ? '⚡ Partial' :
                                 '❌ Not Available'}
                              </div>
                            )}
                          </div>
                          {request.respondedAt && (
                            <p className="text-xs text-gray-400 mt-2">
                              Responded: {format(parseISO(request.respondedAt), 'MMM d, yyyy h:mm a')}
                            </p>
                          )}
                        </div>
                        
                        {request.status === 'PENDING' ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Comments <span className="text-gray-500 font-normal">(required for Partial)</span>
                              </label>
                              <textarea
                                value={availabilityComments[request.id] || ''}
                                onChange={(e) =>
                                  setAvailabilityComments((prev) => ({
                                    ...prev,
                                    [request.id]: e.target.value
                                  }))
                                }
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Optional for Available / Not Available. Required for Partial — e.g. Friday only, mornings only."
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleAvailabilityResponse(request.id, 'AVAILABLE')}
                              disabled={respondingToRequest === request.id}
                              className="flex-1 min-w-[150px] bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              ✅ Available
                            </button>
                            <button
                              onClick={() => handleAvailabilityResponse(request.id, 'PARTIAL')}
                              disabled={respondingToRequest === request.id}
                              className="flex-1 min-w-[150px] bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              ⚡ Partial Availability
                            </button>
                            <button
                              onClick={() => handleAvailabilityResponse(request.id, 'NOT_AVAILABLE')}
                              disabled={respondingToRequest === request.id}
                              className="flex-1 min-w-[150px] bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              ❌ Not Available
                            </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600">Want to change your response?</p>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Comments
                              </label>
                              <textarea
                                value={availabilityComments[request.id] || ''}
                                onChange={(e) =>
                                  setAvailabilityComments((prev) => ({
                                    ...prev,
                                    [request.id]: e.target.value
                                  }))
                                }
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Optional comment (required if choosing Partial)"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleAvailabilityResponse(request.id, 'AVAILABLE')}
                                disabled={respondingToRequest === request.id}
                                className="flex-1 min-w-[150px] bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                ✅ Available
                              </button>
                              <button
                                onClick={() => handleAvailabilityResponse(request.id, 'PARTIAL')}
                                disabled={respondingToRequest === request.id}
                                className="flex-1 min-w-[150px] bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                ⚡ Partial Availability
                              </button>
                              <button
                                onClick={() => handleAvailabilityResponse(request.id, 'NOT_AVAILABLE')}
                                disabled={respondingToRequest === request.id}
                                className="flex-1 min-w-[150px] bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                ❌ Not Available
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {respondingToRequest === request.id && (
                          <div className="mt-3 text-center">
                            <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            <p className="text-sm text-gray-600 mt-1">Submitting response...</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Count Entry: grouped sections + per-station sessions */}
              {((dashboardData.activeCountGroups?.length ?? 0) > 0 ||
                (dashboardData.activeCountSessions?.length ?? 0) > 0) && (
                <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 shadow-lg rounded-lg">
                  <div className="px-6 py-4 border-b border-green-200 bg-white bg-opacity-60">
                    <h2 className="text-lg font-medium text-gray-900 flex items-center">
                      <span className="text-xl mr-2">📊</span>
                      Submit attendance count
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Count tasks assigned to you for this event (group sections or individual stations).
                    </p>
                    {dashboardData.nextCountAvailableAt && (
                      <p className="text-sm text-gray-600 mt-2">
                        Your next count opens at{' '}
                        {new Date(dashboardData.nextCountAvailableAt).toLocaleString()}. This page updates on its own.
                      </p>
                    )}
                  </div>
                  <div className="p-6">
                    {countSuccess && (
                      <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                        ✓ {countSuccess}
                      </div>
                    )}

                    {(dashboardData.activeCountGroups?.length ?? 0) > 0 && (
                      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-teal-900">
                          <strong>Grouped counts:</strong> enter <span className="font-semibold">one total</span> for the
                          section — it applies to every station listed under that group name.
                        </p>
                      </div>
                    )}

                    {(dashboardData.activeCountSessions?.length ?? 0) > 0 && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                              <strong>Station counts:</strong> only submit if requested by your overseer or keyman. If you
                              do not see a grouped section above, use notes when one number covers multiple stations.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {(dashboardData.activeCountGroups ?? []).map((task) => {
                      const gKey = `g:${task.groupId}`
                      const canRevise = Boolean(dashboardData.canReviseSubmittedCounts)
                      const hasSubmitted = Boolean(task.hasSubmitted) || task.existingCount != null || submittedCounts.has(gKey)
                      const isEditing = canRevise && editingSession === gKey
                      const submittedData = submittedCounts.get(gKey)
                      const locked = hasSubmitted && !isEditing && !canRevise
                      return (
                        <div key={task.groupId} className={`rounded-lg p-4 shadow-sm mb-4 border-2 ${locked ? 'bg-gray-100 border-gray-300' : 'bg-white border-teal-100'}`}>
                          <div className="mb-3">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-xl font-extrabold text-teal-900 tracking-tight">
                                {task.sessionName}
                              </h3>
                              {task.countTime && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-teal-50 text-teal-900 text-xs font-semibold border border-teal-200">
                                  {new Date(task.countTime).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-gray-800">{task.groupName}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Stations in this section ({task.stations.length}):{' '}
                              {task.stations.map((s) => s.name).join(', ')}
                            </p>
                            {(task.primaryName || task.secondaryName) && (
                              <p className="text-xs text-gray-500 mt-2">
                                Primary: {task.primaryName || '—'} · Secondary: {task.secondaryName || '—'}
                              </p>
                            )}
                          </div>

                          {hasSubmitted && !isEditing ? (
                            <div className="space-y-3">
                              <div className={`rounded-lg p-4 border ${locked ? 'bg-gray-200 border-gray-300' : 'bg-green-50 border-green-200'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${locked ? 'bg-gray-300 text-gray-700' : 'bg-green-100 text-green-800'}`}>
                                    Submitted
                                  </span>
                                  {canRevise && (
                                    <button
                                      type="button"
                                      onClick={() => setEditingSession(gKey)}
                                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>
                                <div className="mt-2">
                                  <p className={`text-lg font-bold ${locked ? 'text-gray-600' : 'text-gray-900'}`}>Count: {submittedData?.count ?? task.existingCount}</p>
                                  {(submittedData?.notes || task.existingNotes) && (
                                    <p className="text-sm text-gray-600 mt-1">Notes: {submittedData?.notes || task.existingNotes}</p>
                                  )}
                                  {locked && (
                                    <p className="text-sm text-gray-500 mt-2">An overseer or event staff can change this count.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Total attendance for this section *
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={countValues.get(gKey) || ''}
                                  onChange={(e) =>
                                    setCountValues((prev) => new Map(prev).set(gKey, e.target.value))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  placeholder="Enter total count"
                                  disabled={submittingCount}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Notes (optional)
                                </label>
                                <textarea
                                  value={countNotes.get(gKey) || ''}
                                  onChange={(e) =>
                                    setCountNotes((prev) => new Map(prev).set(gKey, e.target.value))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  placeholder="Optional context for your team"
                                  rows={2}
                                  disabled={submittingCount}
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSubmitGroupCount(task)}
                                  disabled={submittingCount || !countValues.get(gKey)}
                                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {submittingCount ? 'Submitting...' : hasSubmitted ? 'Update count' : 'Submit count'}
                                </button>
                                {isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSession(null)
                                      setCountValues((prev) =>
                                        new Map(prev).set(
                                          gKey,
                                          submittedData?.count.toString() || ''
                                        )
                                      )
                                      setCountNotes((prev) =>
                                        new Map(prev).set(gKey, submittedData?.notes || '')
                                      )
                                    }}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {(dashboardData.activeCountSessions ?? []).map((session) => {
                      const canRevise = Boolean(dashboardData.canReviseSubmittedCounts)
                      const stations = (session.stations?.length
                        ? session.stations
                        : [{
                            positionId: session.positionIds?.[0] || '',
                            name: '',
                            existingCount: session.existingCount,
                            existingNotes: session.existingNotes,
                            hasSubmitted: session.hasSubmitted,
                          }]
                      ).filter((station) => station.positionId)
                      const allLocked = stations.length > 0 && stations.every((station) => {
                        const key = `${session.id}:${station.positionId}`
                        const submitted = Boolean(station.hasSubmitted) || station.existingCount != null || submittedCounts.has(key)
                        const editing = canRevise && editingSession === key
                        return submitted && !editing && !canRevise
                      })

                      return (
                        <div key={session.id} className={`rounded-lg p-4 shadow-sm mb-4 ${allLocked ? 'bg-gray-100 border border-gray-300' : 'bg-white'}`}>
                          <div className="mb-3">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-xl font-extrabold text-emerald-900 tracking-tight">
                                {session.sessionName}
                              </h3>
                              {session.countTime ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-50 text-emerald-900 text-xs font-semibold border border-emerald-200">
                                  {new Date(session.countTime).toLocaleString()}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="space-y-4">
                            {stations.map((station) => {
                              const key = `${session.id}:${station.positionId}`
                              const hasSubmitted = Boolean(station.hasSubmitted) || station.existingCount != null || submittedCounts.has(key)
                              const isEditing = canRevise && editingSession === key
                              const submittedData = submittedCounts.get(key)
                              const locked = hasSubmitted && !isEditing && !canRevise
                              const stationLabel = station.name
                                ? `${station.positionNumber != null ? `#${station.positionNumber} ` : ''}${station.name}`
                                : ''
                              return (
                                <div key={key}>
                                  {stationLabel ? (
                                    <p className="text-sm font-semibold text-gray-800 mb-2">{stationLabel}</p>
                                  ) : null}
                                  {hasSubmitted && !isEditing ? (
                                    <div className={`rounded-lg p-4 border ${locked ? 'bg-gray-200 border-gray-300' : 'bg-green-50 border-green-200'}`}>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${locked ? 'bg-gray-300 text-gray-700' : 'bg-green-100 text-green-800'}`}>
                                          Submitted
                                        </span>
                                        {canRevise && (
                                          <button
                                            onClick={() => setEditingSession(key)}
                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                          >
                                            Edit
                                          </button>
                                        )}
                                      </div>
                                      <p className={`text-lg font-bold ${locked ? 'text-gray-600' : 'text-gray-900'}`}>Count: {submittedData?.count ?? station.existingCount}</p>
                                      {(submittedData?.notes || station.existingNotes) && (
                                        <p className="text-sm text-gray-600 mt-1">Notes: {submittedData?.notes || station.existingNotes}</p>
                                      )}
                                      {locked && (
                                        <p className="text-sm text-gray-500 mt-2">An overseer or event staff can change this count.</p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Attendance Count *
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          value={countValues.get(key) || ''}
                                          onChange={(e) => setCountValues(prev => new Map(prev).set(key, e.target.value))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          placeholder="Enter count"
                                          disabled={submittingCount}
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Notes (optional)
                                        </label>
                                        <textarea
                                          value={countNotes.get(key) || ''}
                                          onChange={(e) => setCountNotes(prev => new Map(prev).set(key, e.target.value))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          placeholder="Optional context for this station"
                                          rows={2}
                                          disabled={submittingCount}
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleSubmitCount(session.id, station.positionId)}
                                          disabled={submittingCount || !countValues.get(key)}
                                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                          {submittingCount ? 'Submitting...' : hasSubmitted ? 'Update Count' : 'Submit Count'}
                                        </button>
                                        {isEditing && (
                                          <button
                                            onClick={() => {
                                              setEditingSession(null)
                                              setCountValues(prev => new Map(prev).set(key, submittedData?.count.toString() || station.existingCount?.toString() || ''))
                                              setCountNotes(prev => new Map(prev).set(key, submittedData?.notes || station.existingNotes || ''))
                                            }}
                                            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Documents */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="text-xl mr-2">📄</span>
                    My Documents
                  </h2>
                </div>
                <div className="p-6">
                  {!dashboardData.documents || dashboardData.documents.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">📄</div>
                      <p className="text-gray-600">No documents available</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Documents will appear here when published by your overseer
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.documents?.map((document) => (
                        <div key={document.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className="text-2xl">{getFileIcon(document.fileType)}</div>
                              <div>
                                <h3 className="font-medium text-gray-900">{document.title}</h3>
                                {document.description && (
                                  <p className="text-sm text-gray-600 mt-1">{document.description}</p>
                                )}
                                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                  <span>📁 {document.fileName}</span>
                                  <span>📏 {formatFileSize(document.fileSize)}</span>
                                  <span>📅 {format(parseISO(document.publishedAt), 'MMM d, yyyy h:mm a')}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setViewingDocument(document)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                            >
                              👁️ View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Personal Info */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="text-xl mr-2">👤</span>
                    My Information
                  </h3>
                  {!isEditingProfile && (
                    <button
                      onClick={handleEditProfile}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                  )}
                </div>
                
                {isEditingProfile ? (
                  <div className="space-y-4">
                    <div>
                      <span className="text-gray-500 text-sm">Name:</span>
                      <p className="font-medium text-gray-400">{dashboardData.volunteer.firstName} {dashboardData.volunteer.lastName} (cannot be changed)</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm">Congregation:</span>
                      <p className="font-medium text-gray-400">{dashboardData.volunteer.congregation} (cannot be changed)</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Email:</label>
                      <input
                        type="email"
                        value={editProfileData.email}
                        onChange={(e) => setEditProfileData({ ...editProfileData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="your.email@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Phone:</label>
                      <input
                        type="tel"
                        value={editProfileData.phone}
                        onChange={(e) =>
                          setEditProfileData({
                            ...editProfileData,
                            phone: formatPhoneNumber(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="(555) 123-4567"
                        maxLength={14}
                      />
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={handleSaveProfile}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <p className="font-medium">{dashboardData.volunteer.firstName} {dashboardData.volunteer.lastName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Congregation:</span>
                      <p className="font-medium">{dashboardData.volunteer.congregation}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <p className="font-medium">{dashboardData.volunteer.email || <span className="text-gray-400">Not provided</span>}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <p className="font-medium">{displayPhone(dashboardData.volunteer.phone) || <span className="text-gray-400">Not provided</span>}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Oversight Contacts */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <span className="text-xl mr-2">👥</span>
                  My Oversight
                </h3>
                {!dashboardData.oversightContacts || dashboardData.oversightContacts.length === 0 ? (
                  <p className="text-sm text-gray-600">No oversight contacts assigned</p>
                ) : (
                  <div className="space-y-4">
                    {dashboardData.oversightContacts?.map((contact, index) => (
                      <div key={index} className="border-b border-gray-200 last:border-b-0 pb-3 last:pb-0">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{contact.name}</p>
                          <p className="text-gray-600">{contact.role}</p>
                          {contact.phone && (
                            <p className="text-gray-600">📞 {displayPhone(contact.phone)}</p>
                          )}
                          {contact.email && (
                            <p className="text-gray-600">📧 {contact.email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Event Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Event Information</h3>
                <div className="text-xs text-blue-700 space-y-1">
                  <p><strong>Type:</strong> {dashboardData.event.eventType}</p>
                  <p><strong>Status:</strong> {dashboardData.event.status}</p>
                  <p><strong>Dates:</strong> {formatDate(dashboardData.event.startDate)} - {formatDate(dashboardData.event.endDate)}</p>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Early Check-In Tab */}
          {activeTab === 'checkin' && dashboardData.isIVSTeamMember && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <EarlyCheckinPanel 
                eventId={dashboardData.event.id}
                eventName={dashboardData.event.name}
                showHeader={false}
              />
            </div>
          )}

          {activeTab === 'request' && dashboardData.canSubmitIvsRequests && (
            <IvsVolunteerRequestPanel eventId={dashboardData.event.id} />
          )}
        </div>
      </div>

      {viewingDocument && dashboardData && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <div className="flex items-center justify-between bg-gray-900 text-white px-4 py-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => setViewingDocument(null)}
              className="flex items-center space-x-2 text-white min-h-[44px] pr-4"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </button>
            <p className="text-sm font-semibold truncate flex-1 text-center px-2">{viewingDocument.title}</p>
            <a
              href={`/api/events/${dashboardData.event.id}/documents/${viewingDocument.id}/file`}
              download
              className="text-blue-300 text-sm min-h-[44px] flex items-center pl-4"
            >
              ⬇️
            </a>
          </div>
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
            {viewingDocument.fileType.includes('pdf') ? (
              <VolunteerPdfViewer
                apiPath={`/api/events/${dashboardData.event.id}/documents/${viewingDocument.id}/file`}
                title={viewingDocument.title}
              />
            ) : viewingDocument.fileType.includes('image') ? (
              <div className="flex items-center justify-center h-full bg-black p-4">
                <img
                  src={`/api/events/${dashboardData.event.id}/documents/${viewingDocument.id}/file`}
                  alt={viewingDocument.title}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8 text-center">
                <div className="text-6xl mb-4">📎</div>
                <p className="text-lg font-medium mb-2">{viewingDocument.title}</p>
                <p className="text-sm text-gray-400 mb-6">{viewingDocument.fileName}</p>
                <a
                  href={`/api/events/${dashboardData.event.id}/documents/${viewingDocument.id}/file`}
                  download
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium"
                >
                  ⬇️ Download File
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export async function getServerSideProps(context: any) {
  const { getServerSession } = await import('next-auth')
  const { authOptions } = await import('../api/auth/[...nextauth]')
  
  const session = await getServerSession(context.req, context.res, authOptions)
  
  const isVolunteer = session?.user?.role === 'VOLUNTEER'
  const isStaffViewAs =
    canSimulateVolunteerRole(session?.user?.role) &&
    typeof context.query.viewAsVolunteerId === 'string' &&
    context.query.viewAsVolunteerId.length > 0

  // Allow volunteers normally, and staff only when previewing a selected volunteer.
  if (!session || (!isVolunteer && !isStaffViewAs)) {
    return {
      redirect: {
        destination: '/volunteer/login',
        permanent: false,
      },
    }
  }
  
  return {
    props: {
      initialEventId: context.query.eventId || null
    }
  }
}
