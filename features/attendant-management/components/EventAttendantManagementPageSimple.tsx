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
          
          if (data.success) {
            setAttendants(data.data.attendants || [])
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
                  Attendants ({attendants.length})
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
                      {attendants.slice(0, 10).map((attendant, index) => (
                        <tr key={attendant.id || index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {attendant.first_name || attendant.firstName} {attendant.last_name || attendant.lastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {attendant.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {attendant.congregation}
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
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {attendants.length > 10 && (
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
}
