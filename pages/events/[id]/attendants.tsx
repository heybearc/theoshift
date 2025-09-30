import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

interface Attendant {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: string
  isActive: boolean
  createdAt: string
}

interface Event {
  id: string
  name: string
  eventType: string
  startDate: string
  endDate: string
  status: string
}

export default function EventAttendants() {
  const router = useRouter()
  const { id: eventId } = router.query
  const { data: session, status } = useSession()
  const [event, setEvent] = useState<Event | null>(null)
  const [attendants, setAttendants] = useState<Attendant[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedAttendants, setSelectedAttendants] = useState<string[]>([])
  const [availableAttendants, setAvailableAttendants] = useState<Attendant[]>([])

  useEffect(() => {
    if (eventId && session) {
      fetchEventData()
      fetchEventAttendants()
      fetchAvailableAttendants()
    }
  }, [eventId, session])

  const fetchEventData = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`)
      if (response.ok) {
        const data = await response.json()
        setEvent(data.data)
      }
    } catch (error) {
      console.error('Error fetching event:', error)
      toast.error('Failed to load event data')
    }
  }

  const fetchEventAttendants = async () => {
    try {
      const response = await fetch(`/api/event-attendants/${eventId}`)
      if (response.ok) {
        const data = await response.json()
        setAttendants(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching attendants:', error)
      toast.error('Failed to load attendants')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableAttendants = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        // Filter out attendants already assigned to this event
        const available = data.data.filter((user: Attendant) => 
          user.role === 'ATTENDANT' && 
          user.isActive &&
          !attendants.some(att => att.id === user.id)
        )
        setAvailableAttendants(available)
      }
    } catch (error) {
      console.error('Error fetching available attendants:', error)
    }
  }

  const handleAddAttendants = async () => {
    if (selectedAttendants.length === 0) {
      toast.error('Please select at least one attendant')
      return
    }

    try {
      const response = await fetch(`/api/event-attendants/${eventId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendantIds: selectedAttendants
        }),
      })

      if (response.ok) {
        toast.success('Attendants added successfully')
        setShowAddModal(false)
        setSelectedAttendants([])
        fetchEventAttendants()
        fetchAvailableAttendants()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add attendants')
      }
    } catch (error) {
      console.error('Error adding attendants:', error)
      toast.error('Failed to add attendants')
    }
  }

  const handleRemoveAttendant = async (attendantId: string) => {
    if (!confirm('Are you sure you want to remove this attendant from the event?')) {
      return
    }

    try {
      const response = await fetch(`/api/event-attendants/${eventId}/${attendantId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Attendant removed successfully')
        fetchEventAttendants()
        fetchAvailableAttendants()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to remove attendant')
      }
    } catch (error) {
      console.error('Error removing attendant:', error)
      toast.error('Failed to remove attendant')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendants...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <>
      <Head>
        <title>{event?.name ? `${event.name} - Attendants` : 'Event Attendants'} | JW Attendant Scheduler</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <Link href="/events" className="hover:text-gray-700">Events</Link>
              <span>›</span>
              <Link href={`/events/${eventId}`} className="hover:text-gray-700">
                {event?.name || 'Event'}
              </Link>
              <span>›</span>
              <span className="text-gray-900">Attendants</span>
            </nav>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Event Attendants</h1>
                <p className="text-gray-600 mt-2">
                  Manage attendants for {event?.name}
                </p>
              </div>
              <div className="flex space-x-3">
                <Link
                  href={`/events/${eventId}`}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  ← Back to Event
                </Link>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  + Add Attendants
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">👥</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Attendants</p>
                  <p className="text-2xl font-semibold text-gray-900">{attendants.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-semibold">✓</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Attendants</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {attendants.filter(a => a.isActive).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-semibold">📋</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Available to Add</p>
                  <p className="text-2xl font-semibold text-gray-900">{availableAttendants.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Attendants List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Attendants List</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <span className="text-4xl mb-2">👥</span>
                          <p className="text-lg font-medium">No attendants assigned</p>
                          <p className="text-sm">Click "Add Attendants" to get started</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    attendants.map((attendant) => (
                      <tr key={attendant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-medium">
                                  {attendant.firstName[0]}{attendant.lastName[0]}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {attendant.firstName} {attendant.lastName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {attendant.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {attendant.phone || 'Not provided'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            attendant.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {attendant.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleRemoveAttendant(attendant.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add Attendants Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add Attendants to Event</h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {availableAttendants.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No available attendants to add</p>
                  ) : (
                    <div className="space-y-2">
                      {availableAttendants.map((attendant) => (
                        <label key={attendant.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedAttendants.includes(attendant.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAttendants([...selectedAttendants, attendant.id])
                              } else {
                                setSelectedAttendants(selectedAttendants.filter(id => id !== attendant.id))
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {attendant.firstName} {attendant.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{attendant.email}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddAttendants}
                    disabled={selectedAttendants.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Add Selected ({selectedAttendants.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
