import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { canSimulateVolunteerRole, getViewAsVolunteerId } from '@/lib/viewAsClient'

interface PinnedAnnouncement {
  messageId: string
  channelId: string
  body: string
  createdAt: string
  senderName: string
  simulated?: boolean
}

interface PinnedAnnouncementBannerProps {
  eventId: string
  className?: string
}

export default function PinnedAnnouncementBanner({ eventId, className = '' }: PinnedAnnouncementBannerProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [announcement, setAnnouncement] = useState<PinnedAnnouncement | null>(null)
  const [acknowledging, setAcknowledging] = useState(false)
  const [error, setError] = useState('')

  const queryViewAs = typeof router.query.viewAsVolunteerId === 'string' ? router.query.viewAsVolunteerId : null
  const viewAsId = canSimulateVolunteerRole(session?.user?.role)
    ? (queryViewAs || getViewAsVolunteerId())
    : null

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}/chat/pinned-announcement`, {
          headers: viewAsId ? { 'x-view-as-volunteer-id': viewAsId } : {}
        })
        if (!response.ok) return
        const result = await response.json()
        if (!cancelled) setAnnouncement(result.data || null)
      } catch {
        // Dashboard stays usable if the announcement request fails.
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [eventId, viewAsId])

  if (!announcement) return null

  const chatHref = `/volunteer/chat?eventId=${encodeURIComponent(eventId)}${
    viewAsId ? `&viewAsVolunteerId=${encodeURIComponent(viewAsId)}` : ''
  }`

  const acknowledge = async () => {
    setAcknowledging(true)
    setError('')
    try {
        const response = await fetch(`/api/events/${eventId}/chat/pinned-announcement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(viewAsId ? { 'x-view-as-volunteer-id': viewAsId } : {})
        },
        body: JSON.stringify({ messageId: announcement.messageId })
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        setError(result.error || 'Could not record your acknowledgment')
        return
      }
      setAnnouncement(null)
    } catch {
      setError('Could not record your acknowledgment')
    } finally {
      setAcknowledging(false)
    }
  }

  return (
    <div className={className}>
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-amber-950">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Announcement</p>
        <p className="text-sm whitespace-pre-wrap mt-2">{announcement.body}</p>
        <p className="text-xs text-amber-800 mt-2">
          {announcement.senderName} · {new Date(announcement.createdAt).toLocaleString()}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void acknowledge()}
            disabled={acknowledging || !!viewAsId || announcement.simulated}
            className="px-4 py-2 min-h-[44px] bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-md disabled:bg-amber-300 disabled:cursor-not-allowed"
          >
            {acknowledging ? 'Saving…' : "I've read this"}
          </button>
          <Link href={chatHref} className="text-sm font-medium text-amber-900 underline min-h-[44px] inline-flex items-center">
            Open in chat
          </Link>
        </div>
        {(viewAsId || announcement.simulated) && (
          <p className="text-xs text-amber-800 mt-2">
            Acknowledgment is saved only when this volunteer signs in.
          </p>
        )}
        {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
      </div>
    </div>
  )
}
