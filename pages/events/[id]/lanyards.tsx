import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventLayout from '../../../components/EventLayout'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface Lanyard {
  id: string
  badgeNumber: string
  status: string
  notes?: string
  isCheckedOut: boolean
  checkedOutTo?: string
  checkedOutAt?: string
  checkedInAt?: string
  createdAt: string
  updatedAt: string
}

interface Event {
  id: string
  name: string
  eventType: string
  startDate: string
  endDate: string
  status: string
}

interface Attendant {
  id: string
  users: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
  }
  role?: string
}

export default function EventLanyardsPage() {
  const router = useRouter()
  const { id } = router.query
  const [event, setEvent] = useState<Event | null>(null)
  const [lanyards, setLanyards] = useState<Lanyard[]>([])
  const [attendants, setAttendants] = useState<Attendant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCheckOutModal, setShowCheckOutModal] = useState(false)
  const [selectedLanyardId, setSelectedLanyardId] = useState<string>('')
  const [selectedAttendant, setSelectedAttendant] = useState<Attendant | null>(null)
  const [attendantSearch, setAttendantSearch] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [editingLanyard, setEditingLanyard] = useState<Lanyard | null>(null)
  const [formData, setFormData] = useState({
    badgeNumber: '',
    notes: ''
  })
  const [bulkData, setBulkData] = useState({
    startNumber: 1,
    endNumber: 10,
    prefix: '',
    notes: ''
  })

  const fetchEventAndLanyards = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      
      // Fetch event details
      const eventResponse = await fetch(`/api/events/${id}`)
      const eventData = await eventResponse.json()
      setEvent(eventData.data)
      
      // Fetch lanyards for this event
      const lanyardsResponse = await fetch(`/api/event-lanyards/${id}`)
      const lanyardsData = await lanyardsResponse.json()
      setLanyards(lanyardsData.data || [])
      
      // Fetch attendants for this event
      const attendantsResponse = await fetch(`/api/event-attendants/${id}?limit=100`)
      const attendantsData = await attendantsResponse.json()
      setAttendants(attendantsData.data.associations || [])
      
    } catch (error) {
      setError('Failed to load event and lanyards')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEventAndLanyards()
  }, [id])

  const handleCreateLanyard = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch(`/api/event-lanyards/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setFormData({ badgeNumber: '', notes: '' })
        setShowCreateForm(false)
        fetchEventAndLanyards()
      } else {
        setError('Failed to create lanyard')
      }
    } catch (error) {
      setError('Error creating lanyard')
      console.error('Error:', error)
    }
  }

  const handleEditLanyard = (lanyard: Lanyard) => {
    setEditingLanyard(lanyard)
    setFormData({
      badgeNumber: lanyard.badgeNumber,
      notes: lanyard.notes || ''
    })
    setShowCreateForm(true)
  }

  const handleUpdateLanyard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLanyard) return
    
    try {
      const response = await fetch(`/api/event-lanyards/${id}/${editingLanyard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setFormData({ badgeNumber: '', notes: '' })
        setShowCreateForm(false)
        setEditingLanyard(null)
        fetchEventAndLanyards()
      } else {
        setError('Failed to update lanyard')
      }
    } catch (error) {
      setError('Error updating lanyard')
      console.error('Error:', error)
    }
  }

  const handleDeleteLanyard = async (lanyardId: string) => {
    if (!confirm('Are you sure you want to delete this lanyard?')) return
    
    try {
      const response = await fetch(`/api/event-lanyards/${id}/${lanyardId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchEventAndLanyards()
      } else {
        setError('Failed to delete lanyard')
      }
    } catch (error) {
      setError('Error deleting lanyard')
      console.error('Error:', error)
    }
  }

  const handleCheckOut = (lanyardId: string) => {
    setSelectedLanyardId(lanyardId)
    setShowCheckOutModal(true)
    setSelectedAttendant(null)
    setAttendantSearch('')
  }

  const confirmCheckOut = async () => {
    if (!selectedAttendant || !selectedLanyardId) return

    try {
      const attendantName = `${selectedAttendant.users.firstName} ${selectedAttendant.users.lastName}`
      const response = await fetch(`/api/event-lanyards/${id}/${selectedLanyardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'CHECKED_OUT',
          isCheckedOut: true,
          checkedOutTo: attendantName,
          checkedOutAt: new Date().toISOString(),
          notes: `Role: ${selectedAttendant.role || selectedAttendant.users.role} | Email: ${selectedAttendant.users.email}`
        }),
      })

      if (response.ok) {
        setShowCheckOutModal(false)
        fetchEventAndLanyards()
      } else {
        setError('Failed to check out lanyard')
      }
    } catch (error) {
      setError('Error checking out lanyard')
      console.error('Error:', error)
    }
  }

  const handleCheckIn = async (lanyardId: string) => {
    try {
      const response = await fetch(`/api/event-lanyards/${id}/${lanyardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'AVAILABLE',
          isCheckedOut: false,
          checkedOutTo: null,
          checkedOutAt: null,
          checkedInAt: new Date().toISOString(),
          notes: null
        }),
      })

      if (response.ok) {
        fetchEventAndLanyards()
      } else {
        setError('Failed to check in lanyard')
      }
    } catch (error) {
      setError('Error checking in lanyard')
      console.error('Error:', error)
    }
  }

  const handleBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { startNumber, endNumber, prefix, notes } = bulkData
      const promises: Promise<Response>[] = []
      
      for (let i = startNumber; i <= endNumber; i++) {
        const badgeNumber = prefix ? `${prefix}${i}` : i.toString()
        promises.push(
          fetch(`/api/event-lanyards/${id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              badgeNumber,
              notes
            }),
          })
        )
      }

      const results = await Promise.all(promises)
      const successCount = results.filter(r => r.ok).length
      
      if (successCount > 0) {
        setBulkData({ startNumber: 1, endNumber: 10, prefix: '', notes: '' })
        setShowBulkForm(false)
        fetchEventAndLanyards()
        alert(`Successfully created ${successCount} lanyards`)
      } else {
        setError('Failed to create lanyards')
      }
    } catch (error) {
      setError('Error creating bulk lanyards')
      console.error('Error:', error)
    }
  }

  const resetForm = () => {
    setFormData({ badgeNumber: '', notes: '' })
    setShowCreateForm(false)
    setShowBulkForm(false)
    setEditingLanyard(null)
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      AVAILABLE: 'bg-green-100 text-green-800',
      CHECKED_OUT: 'bg-blue-100 text-blue-800',
      LOST: 'bg-red-100 text-red-800',
      DAMAGED: 'bg-yellow-100 text-yellow-800'
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <EventLayout 
        title="Loading Lanyards..."
        breadcrumbs={[
          { label: 'Events', href: '/events' },
          { label: 'Loading...' }
        ]}
      >
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </EventLayout>
    )
  }

  if (error) {
    return (
      <EventLayout 
        title="Error"
        breadcrumbs={[
          { label: 'Events', href: '/events' },
          { label: 'Error' }
        ]}
      >
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Lanyards</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </EventLayout>
    )
  }

  return (
    <EventLayout 
      title={`Lanyards - ${event?.name || 'Event'}`}
      breadcrumbs={[
        { label: 'Events', href: '/events' },
        { label: event?.name || 'Event', href: `/events/${id}` },
        { label: 'Lanyards' }
      ]}
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Event Lanyards</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage lanyards for {event?.name}
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/events/${id}`}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ← Back to Event
              </Link>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                + Add Lanyard
              </button>
              <button
                onClick={() => setShowBulkForm(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                📦 Bulk Create
              </button>
            </div>
          </div>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingLanyard ? 'Edit Lanyard' : 'Add New Lanyard'}
            </h3>
            <form onSubmit={editingLanyard ? handleUpdateLanyard : handleCreateLanyard} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="badgeNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Badge Number *
                  </label>
                  <input
                    type="text"
                    id="badgeNumber"
                    value={formData.badgeNumber}
                    onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., L001, A-1, etc."
                    required
                  />
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional notes"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  {editingLanyard ? 'Update Lanyard' : 'Create Lanyard'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bulk Create Form */}
        {showBulkForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Create Lanyards</h3>
            <form onSubmit={handleBulkCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="prefix" className="block text-sm font-medium text-gray-700 mb-1">
                    Prefix (Optional)
                  </label>
                  <input
                    type="text"
                    id="prefix"
                    value={bulkData.prefix}
                    onChange={(e) => setBulkData({ ...bulkData, prefix: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., L, A-, etc."
                  />
                </div>
                <div>
                  <label htmlFor="startNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Number *
                  </label>
                  <input
                    type="number"
                    id="startNumber"
                    value={bulkData.startNumber}
                    onChange={(e) => setBulkData({ ...bulkData, startNumber: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="endNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    End Number *
                  </label>
                  <input
                    type="number"
                    id="endNumber"
                    value={bulkData.endNumber}
                    onChange={(e) => setBulkData({ ...bulkData, endNumber: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="bulkNotes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (All)
                  </label>
                  <input
                    type="text"
                    id="bulkNotes"
                    value={bulkData.notes}
                    onChange={(e) => setBulkData({ ...bulkData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional notes for all"
                  />
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>Preview:</strong> Will create {Math.max(0, bulkData.endNumber - bulkData.startNumber + 1)} lanyards: 
                  {bulkData.prefix}{bulkData.startNumber} to {bulkData.prefix}{bulkData.endNumber}
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                  disabled={bulkData.endNumber < bulkData.startNumber}
                >
                  Create {Math.max(0, bulkData.endNumber - bulkData.startNumber + 1)} Lanyards
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Check Out Modal */}
        {showCheckOutModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Check Out Lanyard</h3>
                
                <div className="mb-4">
                  <label htmlFor="attendantSearch" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Attendant
                  </label>
                  <input
                    type="text"
                    id="attendantSearch"
                    value={attendantSearch}
                    onChange={(e) => setAttendantSearch(e.target.value)}
                    placeholder="Search attendants..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {attendantSearch && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                      {attendants
                        .filter(attendant => {
                          const fullName = `${attendant.users.firstName} ${attendant.users.lastName}`.toLowerCase()
                          const role = (attendant.role || attendant.users.role || '').toLowerCase()
                          const email = attendant.users.email.toLowerCase()
                          const search = attendantSearch.toLowerCase()
                          return fullName.includes(search) || role.includes(search) || email.includes(search)
                        })
                        .map(attendant => (
                          <div
                            key={attendant.id}
                            onClick={() => {
                              setSelectedAttendant(attendant)
                              setAttendantSearch(`${attendant.users.firstName} ${attendant.users.lastName}`)
                            }}
                            className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">
                              {attendant.users.firstName} {attendant.users.lastName}
                            </div>
                            <div className="text-sm text-gray-600">
                              {attendant.role || attendant.users.role} • {attendant.users.email}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowCheckOutModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmCheckOut}
                    disabled={!selectedAttendant}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
                  >
                    Check Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lanyards List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Lanyards ({lanyards.length})
            </h3>
          </div>
          
          {lanyards.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No lanyards</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new lanyard.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    + Add Lanyard
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Badge Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Checked Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lanyards.map((lanyard) => (
                    <tr key={lanyard.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {lanyard.badgeNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(lanyard.status)}`}>
                          {lanyard.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lanyard.isCheckedOut ? (
                          <div>
                            <div className="font-medium text-gray-900">
                              {lanyard.checkedOutTo || 'Unknown'}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {lanyard.checkedOutAt ? new Date(lanyard.checkedOutAt).toLocaleDateString() : ''}
                            </div>
                            {lanyard.notes && lanyard.notes.includes('Phone:') && (
                              <div className="text-blue-600 text-xs">
                                {lanyard.notes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Available</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lanyard.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEditLanyard(lanyard)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          {!lanyard.isCheckedOut ? (
                            <button 
                              onClick={() => handleCheckOut(lanyard.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Check Out
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleCheckIn(lanyard.id)}
                              className="text-orange-600 hover:text-orange-900"
                            >
                              Check In
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteLanyard(lanyard.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </EventLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  return {
    props: {},
  }
}
