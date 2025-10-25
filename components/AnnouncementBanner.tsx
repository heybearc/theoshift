import { useState, useEffect } from 'react'

interface Announcement {
  id: string
  title: string
  message: string
  type: 'INFO' | 'WARNING' | 'URGENT'
  createdAt: string
}

interface AnnouncementBannerProps {
  eventId: string
}

export default function AnnouncementBanner({ eventId }: AnnouncementBannerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        console.log('🔔 Fetching announcements for event:', eventId)
        const response = await fetch(`/api/events/${eventId}/announcements`, {
          credentials: 'include'
        })
        console.log('🔔 Response status:', response.status)
        if (response.ok) {
          const result = await response.json()
          console.log('🔔 Raw response:', result)
          // Extract announcements array from response
          const data = result.data || result
          console.log('🔔 Announcements array:', data)
          // Filter to only active announcements within date range
          const now = new Date()
          console.log('🔔 Current time:', now)
          const active = data.filter((a: any) => {
            console.log('🔔 Checking announcement:', a.title, {
              isActive: a.isActive,
              startDate: a.startDate,
              endDate: a.endDate,
              startCheck: a.startDate ? new Date(a.startDate) <= now : true,
              endCheck: a.endDate ? new Date(a.endDate) >= now : true
            })
            if (!a.isActive) return false
            if (a.startDate && new Date(a.startDate) > now) return false
            if (a.endDate && new Date(a.endDate) < now) return false
            return true
          })
          console.log('🔔 Active announcements after filter:', active)
          setAnnouncements(active)
        }
      } catch (error) {
        console.error('🔔 Failed to fetch announcements:', error)
        console.error('🔔 Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof TypeError ? 'TypeError' : typeof error
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncements()
  }, [eventId])

  if (loading) {
    console.log('🔔 Still loading announcements...')
    return null
  }

  if (announcements.length === 0) {
    console.log('🔔 No announcements to display')
    return null
  }

  const visibleAnnouncements = announcements.filter(a => !dismissed.has(a.id))

  if (visibleAnnouncements.length === 0) {
    console.log('🔔 All announcements dismissed')
    return null
  }

  console.log('🔔 RENDERING BANNER with', visibleAnnouncements.length, 'announcements')

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]))
  }

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'URGENT':
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          text: 'text-red-900',
          icon: '🚨',
          titleColor: 'text-red-800'
        }
      case 'WARNING':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          text: 'text-yellow-900',
          icon: '⚠️',
          titleColor: 'text-yellow-800'
        }
      default: // INFO
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-300',
          text: 'text-blue-900',
          icon: 'ℹ️',
          titleColor: 'text-blue-800'
        }
    }
  }

  return (
    <div className="space-y-3 mb-6">
      {visibleAnnouncements.map((announcement) => {
        const styles = getTypeStyles(announcement.type)
        
        return (
          <div
            key={announcement.id}
            className={`${styles.bg} border ${styles.border} rounded-lg p-4 ${styles.text} relative`}
          >
            <button
              onClick={() => handleDismiss(announcement.id)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Dismiss announcement"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex items-start pr-8">
              <div className="text-2xl mr-3 flex-shrink-0">
                {styles.icon}
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold text-lg mb-1 ${styles.titleColor}`}>
                  {announcement.title}
                </h3>
                <p className="text-sm whitespace-pre-wrap">
                  {announcement.message}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
