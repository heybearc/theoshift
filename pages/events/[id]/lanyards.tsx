import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventLayout from '../../../components/EventLayout'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Head from 'next/head'

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
    phone?: string
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
  
  // PDF Export Header Fields
  const [exportInfo, setExportInfo] = useState({
    circuitConvention: '',
    assemblyOverseerName: '',
    attendantOverseerName: '',
    phone: '',
    lanyardsReceivedBy: '',
    lanyardsReturnedTo: '',
    lanyardsToRecover: ''
  })
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
      setError('')
      
      // Fetch event details
      const eventResponse = await fetch(`/api/events/${id}`)
      
      // Handle non-OK responses
      if (!eventResponse.ok) {
        if (eventResponse.status === 401) {
          setError('Please sign in to view lanyards')
        } else if (eventResponse.status === 403) {
          setError('You do not have permission to view this event')
        } else if (eventResponse.status === 404) {
          setError('Event not found. Please check the event ID or select a different event.')
        } else {
          const errorData = await eventResponse.json().catch(() => ({ error: 'Unknown error' }))
          setError(`Failed to load event: ${errorData.error || 'Unknown error'}`)
        }
        setLoading(false)
        return
      }
      
      // Parse successful response
      const eventData = await eventResponse.json()
      setEvent(eventData.data)
      
      // Fetch lanyards for this event
      const lanyardsResponse = await fetch(`/api/event-lanyards/${id}`)
      if (lanyardsResponse.ok) {
        const lanyardsData = await lanyardsResponse.json()
        // Sort lanyards numerically by badge number
        const sortedLanyards = (lanyardsData.data || []).sort((a: any, b: any) => {
          const numA = parseInt(a.badgeNumber) || 0
          const numB = parseInt(b.badgeNumber) || 0
          return numA - numB
        })
        setLanyards(sortedLanyards)
      } else {
        console.warn('Failed to load lanyards:', lanyardsResponse.status)
        setLanyards([])
      }
      
      // Fetch attendants for this event
      const attendantsResponse = await fetch(`/api/event-attendants/${id}?limit=100`)
      if (attendantsResponse.ok) {
        const attendantsData = await attendantsResponse.json()
        setAttendants(attendantsData.data?.associations || [])
      } else {
        console.warn('Failed to load attendants:', attendantsResponse.status)
        setAttendants([])
      }
      
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
          notes: selectedAttendant.users.phone || ''
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
        title="Lanyards - Error"
        breadcrumbs={[
          { label: 'Events', href: '/events' },
          { label: 'Lanyards' }
        ]}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Unable to Load Lanyards
                </h3>
                <div className="text-sm text-red-700 mb-4">
                  <p>{error}</p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href="/events"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Events
                  </Link>
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </EventLayout>
    )
  }

  return (
    <>
      <Head>
        <style>{`
          @media print {
            @page { margin: 0.5in; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .print\\:hidden { display: none !important; }
            button, .no-print { display: none !important; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
          }
        `}</style>
      </Head>
      <EventLayout 
        title={`Lanyards - ${event?.name || 'Event'}`}
        breadcrumbs={[
          { label: 'Events', href: '/events' },
          { label: event?.name || 'Event', href: `/events/${id}` },
          { label: 'Lanyards' }
        ]}
      >
        {/* Export Information Form - Visible on screen and in print */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white shadow rounded-lg p-6 print:shadow-none print:border-0 print:p-8">
          <h2 className="text-xl font-bold text-center mb-8 print:text-3xl print:underline print:mb-12">Attendant Lanyard Tracking</h2>
          
          {/* Print layout matches image exactly */}
          <div className="space-y-3 print:space-y-4 print:ml-8">
            <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-2 items-center">
              <label className="font-semibold text-gray-700">Date:</label>
              <div className="print:border-b print:border-black print:min-h-[28px] print:pl-2">
                {event?.startDate ? new Date(event.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-2 items-center">
              <label className="font-semibold text-gray-700">Circuit/Convention:</label>
              <input
                type="text"
                value={exportInfo.circuitConvention}
                onChange={(e) => setExportInfo({...exportInfo, circuitConvention: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md print:border-0 print:border-b print:border-black print:p-0 print:pl-2"
                placeholder="e.g., OH 19B"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-2 items-center">
              <label className="font-semibold text-gray-700">Assembly Overseer/ CC Name:</label>
              <input
                type="text"
                value={exportInfo.assemblyOverseerName}
                onChange={(e) => setExportInfo({...exportInfo, assemblyOverseerName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md print:border-0 print:border-b print:border-black print:p-0 print:pl-2"
                placeholder="Enter name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-2 items-center">
              <label className="font-semibold text-gray-700">Attendant Overseer Name:</label>
              <input
                type="text"
                value={exportInfo.attendantOverseerName}
                onChange={(e) => setExportInfo({...exportInfo, attendantOverseerName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md print:border-0 print:border-b print:border-black print:p-0 print:pl-2"
                placeholder="Enter name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-2 items-center">
              <label className="font-semibold text-gray-700">Phone:</label>
              <input
                type="tel"
                value={exportInfo.phone}
                onChange={(e) => setExportInfo({...exportInfo, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md print:border-0 print:border-b print:border-black print:p-0 print:pl-2"
                placeholder="216-469-8897"
              />
            </div>
          </div>

          <div className="mt-8 space-y-3 print:mt-12 print:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-2 items-center">
              <label className="font-semibold text-gray-700">Number of Lanyards received by AH:</label>
              <input
                type="text"
                value={exportInfo.lanyardsReceivedBy}
                onChange={(e) => setExportInfo({...exportInfo, lanyardsReceivedBy: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md print:border-0 print:border-b print:border-black print:p-0 print:pl-2"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-2 items-center">
              <label className="font-semibold text-gray-700">Lanyards returned to AH:</label>
              <input
                type="text"
                value={exportInfo.lanyardsReturnedTo}
                onChange={(e) => setExportInfo({...exportInfo, lanyardsReturnedTo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md print:border-0 print:border-b print:border-black print:p-0 print:pl-2"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-2 items-center">
              <label className="font-semibold text-gray-700">Lanyards to recover and return:</label>
              <input
                type="text"
                value={exportInfo.lanyardsToRecover}
                onChange={(e) => setExportInfo({...exportInfo, lanyardsToRecover: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md print:border-0 print:border-b print:border-black print:p-0 print:pl-2"
              />
            </div>
          </div>

          <div className="mt-8 pt-4 border-t print:mt-12 print:pt-6 print:border-t-2 print:border-black">
            <p className="text-sm italic text-gray-600 print:text-base">
              Prior to your assembly, list trained attendants alphabetically for quick check-out/check-in.
            </p>
          </div>
        </div>
      </div>

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
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                + Add Lanyard
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('Bulk Create clicked')
                  setShowBulkForm(true)
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                📦 Bulk Create
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
              >
                📄 Export to PDF
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
                              {attendant.users.phone && (
                                <span className="ml-2">📞 {attendant.users.phone}</span>
                              )}
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
                      Phone Number
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
                            {lanyard.notes && (
                              <div className="text-blue-600 text-xs">
                                📞 {lanyard.notes}
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
    </>
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
