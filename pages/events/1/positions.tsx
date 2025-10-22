import { useEffect } from 'react'
import { useRouter } from 'next/router'

// Redirect page for legacy event ID "1" 
// Automatically redirects to the correct active event
export default function LegacyEventRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the correct active event
    const correctEventId = 'd43d977b-c06e-446f-8c6d-05b407daf459'
    router.replace(`/events/${correctEventId}/positions`)
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to the correct event...</p>
      </div>
    </div>
  )
}
