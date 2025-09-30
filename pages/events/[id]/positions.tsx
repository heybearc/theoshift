import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Link from 'next/link'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
// Using basic alerts for notifications

interface Position {
  id: string
  positionNumber: number
  positionName: string
  department: string
  description?: string
  requirements?: string
  isActive: boolean
  _count?: {
    assignments: number
  }
}

interface Event {
  id: string
  name: string
  eventType: string
  startDate: string
  endDate: string
  status: string
}

interface EventPositionsProps {
  eventId: string
}

export default function EventPositions({ eventId }: EventPositionsProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [event, setEvent] = useState<Event | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPosition, setEditingPosition] = useState<Position | null>(null)
  const [formData, setFormData] = useState({
    positionName: '',
    department: '',
    description: '',
    requirements: ''
  })

  const departments = [
    'Audio/Video',
    'Attendant',
    'Cleaning',
    'First Aid',
    'Information',
    'Literature',
    'Parking',
    'Platform',
    'Security',
    'Stage',
    'Volunteer Services'
  ]

  useEffect(() => {
    if (eventId && session) {
      fetchEventData()
      fetchPositions()
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
      alert('Failed to load event data')
    }
  }

  const fetchPositions = async () => {
    try {
      const response = await fetch(`/api/event-positions/${eventId}`)
      if (response.ok) {
        const data = await response.json()
        setPositions(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching positions:', error)
      alert('Failed to load positions')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.positionName.trim() || !formData.department) {
      alert('Position name and department are required')
      return
    }

    try {
      const url = editingPosition 
        ? `/api/event-positions/${eventId}/${editingPosition.id}`
        : `/api/event-positions/${eventId}`
      
      const method = editingPosition ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert(editingPosition ? 'Position updated successfully' : 'Position created successfully')
        setShowCreateModal(false)
        setEditingPosition(null)
        setFormData({ positionName: '', department: '', description: '', requirements: '' })
        fetchPositions()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save position')
      }
    } catch (error) {
      console.error('Error saving position:', error)
      alert('Failed to save position')
    }
  }

  const handleEdit = (position: Position) => {
    setEditingPosition(position)
    setFormData({
      positionName: position.positionName,
      department: position.department,
      description: position.description || '',
      requirements: position.requirements || ''
    })
    setShowCreateModal(true)
  }

  const handleDelete = async (positionId: string) => {
    if (!confirm('Are you sure you want to delete this position? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/event-positions/${eventId}/${positionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Position deleted successfully')
        fetchPositions()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete position')
      }
    } catch (error) {
      console.error('Error deleting position:', error)
      alert('Failed to delete position')
    }
  }

  const closeModal = () => {
    setShowCreateModal(false)
    setEditingPosition(null)
    setFormData({ positionName: '', department: '', description: '', requirements: '' })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading positions...</p>
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
        <title>{event?.name ? `${event.name} - Positions` : 'Event Positions'} | JW Attendant Scheduler</title>
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
              <span className="text-gray-900">Positions</span>
            </nav>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Event Positions</h1>
                <p className="text-gray-600 mt-2">
                  Manage positions and roles for {event?.name}
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
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  + Create Position
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">📋</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Positions</p>
                  <p className="text-2xl font-semibold text-gray-900">{positions.length}</p>
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
                  <p className="text-sm font-medium text-gray-500">Active Positions</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {positions.filter(p => p.isActive).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-semibold">🏢</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Departments</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {new Set(positions.map(p => p.department)).size}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600 font-semibold">👥</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Assignments</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {positions.reduce((sum, p) => sum + (p._count?.assignments || 0), 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Positions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {positions.length === 0 ? (
              <div className="col-span-full bg-white rounded-lg shadow p-12 text-center">
                <span className="text-6xl mb-4 block">📋</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No positions created</h3>
                <p className="text-gray-500 mb-4">Create your first position to get started</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Create Position
                </button>
              </div>
            ) : (
              positions.map((position) => (
                <div key={position.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {position.positionName}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {position.department}
                        </span>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        position.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {position.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {position.description && (
                      <p className="text-sm text-gray-600 mb-3">{position.description}</p>
                    )}

                    {position.requirements && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 mb-1">Requirements:</p>
                        <p className="text-sm text-gray-600">{position.requirements}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>Position #{position.positionNumber}</span>
                      <span>{position._count?.assignments || 0} assignments</span>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(position)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(position.id)}
                        className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded text-sm font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Create/Edit Position Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <form onSubmit={handleSubmit}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingPosition ? 'Edit Position' : 'Create New Position'}
                  </h3>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="positionName" className="block text-sm font-medium text-gray-700 mb-1">
                      Position Name *
                    </label>
                    <input
                      type="text"
                      id="positionName"
                      value={formData.positionName}
                      onChange={(e) => setFormData({ ...formData, positionName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Sound Operator, Parking Attendant"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                      Department *
                    </label>
                    <select
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a department</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief description of the position..."
                    />
                  </div>

                  <div>
                    <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-1">
                      Requirements
                    </label>
                    <textarea
                      id="requirements"
                      value={formData.requirements}
                      onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any special requirements or qualifications..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {editingPosition ? 'Update Position' : 'Create Position'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
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

  const { id } = context.params!
  
  return {
    props: {
      eventId: id as string
    }
  }
}
