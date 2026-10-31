import { useRouter } from 'next/router'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface PWABottomNavProps {
  activeTab?: 'dashboard' | 'checkin' | 'select-event' | 'profile'
  eventId?: string | null
  viewAsVolunteerId?: string | null
  /** When false, Check-In looks disabled and does not navigate */
  showCheckIn?: boolean
  /** When false, a disabled Check-In tab is left off the bar */
  showDisabledCheckIn?: boolean
}

export default function PWABottomNav({
  activeTab,
  eventId: eventIdProp,
  viewAsVolunteerId: viewAsProp,
  showCheckIn = false,
  showDisabledCheckIn = true,
}: PWABottomNavProps) {
  const router = useRouter()
  const [eventId, setEventId] = useState<string | null>(eventIdProp ?? null)

  useEffect(() => {
    if (eventIdProp) {
      setEventId(eventIdProp)
      return
    }
    const fromQuery =
      typeof router.query.eventId === 'string' ? router.query.eventId : null
    if (fromQuery) {
      setEventId(fromQuery)
      return
    }
    if (typeof window !== 'undefined') {
      setEventId(localStorage.getItem('selectedEventId'))
    }
  }, [eventIdProp, router.query.eventId])

  const viewAs =
    viewAsProp ||
    (typeof router.query.viewAsVolunteerId === 'string'
      ? router.query.viewAsVolunteerId
      : null)

  const viewAsQuery = viewAs ? `&viewAsVolunteerId=${encodeURIComponent(viewAs)}` : ''
  const dashboardHref = eventId
    ? `/volunteer/dashboard?eventId=${encodeURIComponent(eventId)}${viewAsQuery}`
    : '/volunteer/dashboard'
  const checkInHref =
    showCheckIn && eventId
      ? `/volunteer/early-checkin?eventId=${encodeURIComponent(eventId)}${viewAsQuery}`
      : null

  const tabs = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      href: dashboardHref,
      enabled: true,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      id: 'checkin' as const,
      label: 'Check-In',
      href: checkInHref,
      enabled: !!checkInHref,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: 'select-event' as const,
      label: 'Events',
      href: '/volunteer/select-event',
      enabled: true,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ]

  const currentTab =
    activeTab ||
    (() => {
      if (router.pathname.startsWith('/volunteer/dashboard')) return 'dashboard'
      if (router.pathname.startsWith('/volunteer/early-checkin')) return 'checkin'
      if (router.pathname.startsWith('/volunteer/select-event')) return 'select-event'
      return undefined
    })()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg"
      style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-stretch">
        {tabs
          .filter((tab) => tab.id !== 'checkin' || tab.enabled || showDisabledCheckIn)
          .map((tab) => {
          const isActive = currentTab === tab.id
          const className = `flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] touch-manipulation select-none transition-colors ${
            !tab.enabled
              ? 'text-gray-300 cursor-not-allowed'
              : isActive
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 active:bg-gray-100'
          }`

          if (!tab.enabled || !tab.href) {
            return (
              <div
                key={tab.id}
                className={className}
                role="link"
                aria-disabled="true"
                title={
                  tab.id === 'checkin'
                    ? !eventId
                      ? 'Select an event first'
                      : 'Early Check-In is not available for this event'
                    : undefined
                }
              >
                {tab.icon}
                <span className="text-xs mt-1 font-medium text-gray-300">{tab.label}</span>
              </div>
            )
          }

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={className}
              prefetch={false}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.icon}
              <span
                className={`text-xs mt-1 font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
