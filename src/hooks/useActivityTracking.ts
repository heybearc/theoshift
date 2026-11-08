import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

const ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000 // Update every 5 minutes

function reportActivityError(label: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  if (message.includes('Failed to fetch') || message.includes('aborted')) return
  console.error(label, err)
}
const SESSION_STORAGE_KEY = 'user_session_id' // Using localStorage to share across tabs

export function useActivityTracking() {
  const { data: session, status } = useSession()
  const intervalRef = useRef<NodeJS.Timeout>()
  const sessionIdRef = useRef<string>()

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Get or create session ID (using localStorage to share across tabs)
      let sessionId = localStorage.getItem(SESSION_STORAGE_KEY)
      
      if (!sessionId) {
        // Create new session on login
        fetch('/api/auth/track-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login' })
        })
          .then(res => res.json())
          .then(data => {
            if (data.sessionId) {
              localStorage.setItem(SESSION_STORAGE_KEY, data.sessionId)
              sessionIdRef.current = data.sessionId
            }
          })
          .catch(err => reportActivityError('[ACTIVITY] Login tracking failed:', err))
      } else {
        sessionIdRef.current = sessionId
      }

      // Update activity periodically
      const updateActivity = () => {
        const currentSessionId = localStorage.getItem(SESSION_STORAGE_KEY)
        if (currentSessionId) {
          fetch('/api/auth/track-activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'activity',
              sessionId: currentSessionId
            })
          }).catch(err => reportActivityError('[ACTIVITY] Update failed:', err))
        }
      }

      // Update immediately
      if (sessionId) {
        updateActivity()
      }

      // Set up periodic updates
      intervalRef.current = setInterval(updateActivity, ACTIVITY_UPDATE_INTERVAL)

      // Cleanup on unmount or logout
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    } else if (status === 'unauthenticated') {
      // User logged out - mark session inactive
      const sessionId = localStorage.getItem(SESSION_STORAGE_KEY)
      if (sessionId) {
        fetch('/api/auth/track-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'logout',
            sessionId
          })
        }).catch(err => console.error('[ACTIVITY] Logout tracking failed:', err))
        
        localStorage.removeItem(SESSION_STORAGE_KEY)
      }

      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [status, session])

  return null
}
