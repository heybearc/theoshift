import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Link from 'next/link'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
// Using basic alerts for notifications

interface Assignment {
  id: string
  userId: string
  positionId: string
  shiftStart: string
  shiftEnd: string
  status: 'ASSIGNED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  notes?: string
  users: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  event_positions: {
    id: string
    positionName: string
    department: string
    positionNumber: number
  }
}

interface Attendant {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface Position {
  id: string
  positionName: string
  department: string
  positionNumber: number
}

interface Event {
  id: string
  name: string
  eventType: string
  startDate: string
  endDate: string
  status: string
}

interface AssignmentStats {
  total: number
  assigned: number
  confirmed: number
  completed: number
}

interface EventAssignmentsProps {
  eventId: string
  event: Event
  assignments: Assignment[]
  attendants: Attendant[]
  positions: Position[]
  stats: AssignmentStats
}

export default function EventAssignments({ eventId, event, assignments, attendants, positions, stats }: EventAssignmentsProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [formData, setFormData] = useState({
    userId: '',
    positionId: '',
    shiftStart: '',
    shiftEnd: '',
    notes: ''
  })

  // APEX GUARDIAN: Client-side fetching removed - data now provided via SSR

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.userId || !formData.positionId || !formData.shiftStart || !formData.shiftEnd) {
      alert('Please fill in all required fields')
      return
    }

    // Validate shift times
    const startTime = new Date(formData.shiftStart)
    const endTime = new Date(formData.shiftEnd)
    
    if (endTime <= startTime) {
      alert('End time must be after start time')
      return
    }

    try {
      const url = editingAssignment 
        ? `/api/events/${eventId}/assignments/${editingAssignment.id}`
        : `/api/events/${eventId}/assignments`
      
      const method = editingAssignment ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: formData.userId,
          positionId: formData.positionId,
          shiftStart: new Date(formData.shiftStart).toISOString(),
          shiftEnd: new Date(formData.shiftEnd).toISOString(),
          notes: formData.notes || '',
          eventId
        }),
      })

      if (response.ok) {
        alert(editingAssignment ? 'Assignment updated successfully' : 'Assignment created successfully')
        closeModal()
        router.reload() // Refresh page to show updated data
      } else {
        const error = await response.json()
        console.error('Assignment creation error:', error)
        alert(`Failed to save assignment: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error saving assignment:', error)
      alert('Failed to save assignment')
    }
  }

  const handleEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment)
    setFormData({
      userId: assignment.userId,
      positionId: assignment.positionId,
      shiftStart: assignment.shiftStart.slice(0, 16), // Format for datetime-local input
      shiftEnd: assignment.shiftEnd.slice(0, 16),
      notes: assignment.notes || ''
    })
    setShowCreateModal(true)
  }

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) {
      return
    }

    try {
      const response = await fetch(`/api/event-assignments/${eventId}/${assignmentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Assignment deleted successfully')
        router.reload() // Refresh page to show updated data
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete assignment')
      }
    } catch (error) {
      console.error('Error deleting assignment:', error)
      alert('Failed to delete assignment')
    }
  }

  const updateAssignmentStatus = async (assignmentId: string, newStatus: Assignment['status']) => {
    try {
      const response = await fetch(`/api/event-assignments/${eventId}/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        alert('Assignment status updated')
        router.reload() // Refresh page to show updated data
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    }
  }

  const closeModal = () => {
    setShowCreateModal(false)
    setEditingAssignment(null)
    setFormData({ userId: '', positionId: '', shiftStart: '', shiftEnd: '', notes: '' })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusColor = (status: Assignment['status']) => {
    switch (status) {
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800'
      case 'CONFIRMED': return 'bg-green-100 text-green-800'
      case 'COMPLETED': return 'bg-gray-100 text-gray-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assignments...</p>
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
        <title>{event?.name ? `${event.name} - Assignments` : 'Event Assignments'} | JW Attendant Scheduler</title>
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
              <span className="text-gray-900">Assignments</span>
            </nav>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Event Assignments</h1>
                <p className="text-gray-600 mt-2">
                  Manage assignments for {event?.name}
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
                  + Create Assignment
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
                  <p className="text-sm font-medium text-gray-500">Total Assignments</p>
                  <p className="text-2xl font-semibold text-gray-900">{assignments.length}</p>
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
                  <p className="text-sm font-medium text-gray-500">Confirmed</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {assignments.filter(a => a.status === 'CONFIRMED').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <span className="text-yellow-600 font-semibold">⏳</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {assignments.filter(a => a.status === 'ASSIGNED').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-semibold">✅</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {assignments.filter(a => a.status === 'COMPLETED').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Assignments List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Assignments List</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shift Time
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
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <span className="text-4xl mb-2">📋</span>
                          <p className="text-lg font-medium">No assignments created</p>
                          <p className="text-sm">Click "Create Assignment" to get started</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    assignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-medium">
                                  {assignment.users.firstName[0]}{assignment.users.lastName[0]}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {assignment.users.firstName} {assignment.users.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{assignment.users.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {assignment.event_positions.positionName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {assignment.event_positions.department} • #{assignment.event_positions.positionNumber}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>{formatDateTime(assignment.shiftStart)}</div>
                          <div>to {formatDateTime(assignment.shiftEnd)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={assignment.status}
                            onChange={(e) => updateAssignmentStatus(assignment.id, e.target.value as Assignment['status'])}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border-0 ${getStatusColor(assignment.status)}`}
                          >
                            <option value="ASSIGNED">Assigned</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEdit(assignment)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (!assignment?.id) {
                                alert('Cannot delete: Assignment ID not found')
                                console.error('Assignment missing ID:', assignment)
                                return
                              }
                              handleDelete(assignment.id)
                            }}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            Delete
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

        {/* Create/Edit Assignment Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <form onSubmit={handleSubmit}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
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
                    <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
                      Attendant *
                    </label>
                    <select
                      id="userId"
                      value={formData.userId}
                      onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select an attendant</option>
                      {attendants && attendants.length > 0 ? (
                        attendants.map((attendant) => (
                          <option key={attendant.id} value={attendant.id}>
                            {attendant.firstName} {attendant.lastName}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No attendants available</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="positionId" className="block text-sm font-medium text-gray-700 mb-1">
                      Position *
                    </label>
                    <select
                      id="positionId"
                      value={formData.positionId}
                      onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a position</option>
                      {positions && positions.length > 0 ? (
                        positions.map((position) => (
                          <option key={position.id} value={position.id}>
                            {position.positionName} ({position.department || 'No Area'})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No positions available</option>
                      )}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="shiftStart" className="block text-sm font-medium text-gray-700 mb-1">
                        Shift Start *
                      </label>
                      <input
                        type="datetime-local"
                        id="shiftStart"
                        value={formData.shiftStart}
                        onChange={(e) => setFormData({ ...formData, shiftStart: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="shiftEnd" className="block text-sm font-medium text-gray-700 mb-1">
                        Shift End *
                      </label>
                      <input
                        type="datetime-local"
                        id="shiftEnd"
                        value={formData.shiftEnd}
                        onChange={(e) => setFormData({ ...formData, shiftEnd: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any additional notes or instructions..."
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
                    {editingAssignment ? 'Update Assignment' : 'Create Assignment'}
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

  // APEX GUARDIAN: Full SSR data fetching for assignments tab
  const { id } = context.params!
  
  try {
    const { prisma } = await import('../../../src/lib/prisma')
    
    // Fetch event with assignments, attendants, and positions data
    const eventData = await prisma.events.findUnique({
      where: { id: id as string },
      include: {
        assignments: {
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: [
            { shiftStart: 'asc' }
          ]
        },
        event_attendant_associations: {
          include: {
            attendants: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        positions: {
          select: {
            id: true,
            name: true,
            area: true,
            positionNumber: true
          },
          orderBy: [
            { positionNumber: 'asc' }
          ]
        }
      }
    })
    
    if (!eventData) {
      return { notFound: true }
    }

    // Transform event data
    const event = {
      id: eventData.id,
      name: eventData.name,
      eventType: eventData.eventType,
      startDate: eventData.startDate?.toISOString() || null,
      endDate: eventData.endDate?.toISOString() || null,
      status: eventData.status
    }

    // Transform assignments data - assignments table references positions by positionId
    const assignments = eventData.assignments.map(assignment => {
      // Find the position for this assignment
      const position = eventData.positions.find(p => p.id === assignment.positionId)
      
      return {
        id: assignment.id,
        userId: assignment.userId,
        positionId: assignment.positionId,
        shiftStart: assignment.shiftStart?.toISOString() || null,
        shiftEnd: assignment.shiftEnd?.toISOString() || null,
        status: assignment.status,
        notes: assignment.notes,
        users: assignment.users ? {
          id: assignment.users.id,
          firstName: assignment.users.firstName,
          lastName: assignment.users.lastName,
          email: assignment.users.email
        } : null,
        event_positions: position ? {
          id: position.id,
          positionName: position.name,
          department: position.area || '',
          positionNumber: position.positionNumber
        } : null
      }
    }).filter(assignment => assignment.users && assignment.event_positions)

    // Transform attendants data from event_attendant_associations
    const attendants = eventData.event_attendant_associations
      .filter(association => association.attendants)
      .map(association => ({
        id: association.attendants!.id,
        firstName: association.attendants!.firstName,
        lastName: association.attendants!.lastName,
        email: association.attendants!.email
      }))

    // Transform positions data
    const positions = eventData.positions.map(position => ({
      id: position.id,
      positionName: position.name,
      department: position.area || '',
      positionNumber: position.positionNumber
    }))

    return {
      props: {
        eventId: id as string,
        event,
        assignments,
        attendants,
        positions,
        stats: {
          total: assignments.length,
          assigned: assignments.filter(a => a.status === 'ASSIGNED').length,
          confirmed: assignments.filter(a => a.status === 'CONFIRMED').length,
          completed: assignments.filter(a => a.status === 'COMPLETED').length
        }
      }
    }
  } catch (error) {
    console.error('Error fetching assignments data:', error)
    return { notFound: true }
  }
}
