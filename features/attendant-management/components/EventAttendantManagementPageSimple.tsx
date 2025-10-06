import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Link from 'next/link'

// APEX GUARDIAN Event-Specific Attendant Management - Minimal Version
// Debugging client-side exceptions with minimal dependencies

interface EventAttendantManagementPageProps {
  eventId: string
  eventName?: string
}

export default function EventAttendantManagementPageSimple({ 
  eventId, 
  eventName 
}: EventAttendantManagementPageProps) {
  const { data: session } = useSession()
  const [attendants, setAttendants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)

  // Error boundary effect
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('APEX GUARDIAN: Global error caught:', event.error)
      setRenderError(`Global error: ${event.error?.message || 'Unknown error'}`)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('APEX GUARDIAN: Unhandled promise rejection:', event.reason)
      setRenderError(`Promise rejection: ${event.reason?.message || 'Unknown rejection'}`)
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // Permission check
  const canManageAttendants = session?.user && ['ADMIN', 'OVERSEER'].includes((session.user as any).role)

  // Fetch attendants
  useEffect(() => {
    if (!eventId || !canManageAttendants) {
      setLoading(false)
      return
    }

    const fetchAttendants = async () => {
      try {
        console.log('APEX GUARDIAN: Fetching attendants for event:', eventId)
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/events/${eventId}/attendants?page=1&limit=25`)
        console.log('APEX GUARDIAN: Response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('APEX GUARDIAN: Response data:', data)
          console.log('APEX GUARDIAN: data.data:', data.data)
          console.log('APEX GUARDIAN: data.data.attendants:', data.data?.attendants)
          console.log('APEX GUARDIAN: Array.isArray check:', Array.isArray(data.data?.attendants))
          
          if (data.success && data.data) {
            const attendantsArray = data.data.attendants
            if (Array.isArray(attendantsArray)) {
              console.log('APEX GUARDIAN: Setting attendants array with length:', attendantsArray.length)
              setAttendants(attendantsArray)
            } else {
              console.log('APEX GUARDIAN: attendants is not an array:', typeof attendantsArray)
              setAttendants([])
            }
          } else {
            setError(data.error || 'Failed to fetch attendants')
          }
        } else {
          setError(`HTTP ${response.status}: ${response.statusText}`)
        }
      } catch (err) {
        console.error('APEX GUARDIAN: Fetch error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchAttendants()
  }, [eventId, canManageAttendants])

  // Render error display
  if (renderError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-900 mb-4">Render Error Detected</h2>
          <p className="text-red-600 mb-4">{renderError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-blue-600 hover:text-blue-800"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  if (!canManageAttendants) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to manage attendants.</p>
          <Link href="/events" className="text-blue-600 hover:text-blue-800">
            Return to Events
          </Link>
        </div>
      </div>
    )
  }

  try {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Head>
        <title>{eventName || 'Event'} - Attendants | JW Attendant Scheduler</title>
      </Head>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Event Attendants</h1>
            <p className="mt-2 text-gray-600">
              Manage attendants for {eventName || 'this event'}
            </p>
          </div>
          
          <Link 
            href={`/events/${eventId}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            ← Back to Event
          </Link>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading attendants...</span>
        </div>
      )}

      {/* Attendants Display */}
      {!loading && !error && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {attendants.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No attendants</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Looks like we don't have any attendants yet for this event.
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Attendants ({Array.isArray(attendants) ? attendants.length : 0})
                </h3>
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Congregation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.isArray(attendants) && attendants.slice(0, 10).map((attendant, index) => {
                        // Safety check for attendant object
                        if (!attendant || typeof attendant !== 'object') {
                          console.log('APEX GUARDIAN: Invalid attendant at index:', index, attendant)
                          return null
                        }
                        
                        return (
                          <tr key={attendant.id || `attendant-${index}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {(attendant.first_name || attendant.firstName || 'N/A')} {(attendant.last_name || attendant.lastName || '')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {attendant.email || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {attendant.congregation || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                (attendant.is_active ?? attendant.isActive) 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {(attendant.is_active ?? attendant.isActive) ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                
                {Array.isArray(attendants) && attendants.length > 10 && (
                  <div className="mt-4 text-sm text-gray-500 text-center">
                    Showing first 10 of {attendants.length} attendants
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    )
  } catch (renderError) {
    console.error('APEX GUARDIAN: Render error caught:', renderError)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-900 mb-4">Component Render Error</h2>
          <p className="text-red-600 mb-4">
            {renderError instanceof Error ? renderError.message : 'Unknown render error'}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }
}
