import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventLayout from '../../../components/EventLayout'
import { useState } from 'react'
import { useRouter } from 'next/router'

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
  firstName: string
  lastName: string
  email: string
  phone: string | null
  congregation: string
  formsOfService: any // JSON field for forms of service
  isActive: boolean
  createdAt: string | null
  associationId: string
}

interface AttendantStats {
  total: number
  active: number
  inactive: number
}

interface EventAttendantsPageProps {
  eventId: string
  event: Event
  attendants: Attendant[]
  stats: AttendantStats
}

export default function EventAttendantsPage({ eventId, event, attendants, stats }: EventAttendantsPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAttendant, setEditingAttendant] = useState<Attendant | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    congregation: '',
    formsOfService: '',
    notes: '',
    isActive: true
  })

  // Add Attendant Handler
  const handleAddAttendant = () => {
    setFormData({ 
      firstName: '', 
      lastName: '', 
      email: '', 
      phone: '', 
      congregation: '', 
      formsOfService: '', 
      notes: '',
      isActive: true
    })
    setEditingAttendant(null)
    setShowAddModal(true)
  }

  // Edit Attendant Handler
  const handleEditAttendant = (attendant: Attendant) => {
    setFormData({
      firstName: attendant.firstName,
      lastName: attendant.lastName,
      email: attendant.email,
      phone: attendant.phone || '',
      congregation: attendant.congregation || '',
      formsOfService: Array.isArray(attendant.formsOfService) 
        ? attendant.formsOfService.join(', ') 
        : attendant.formsOfService || '',
      notes: '',
      isActive: attendant.isActive
    })
    setEditingAttendant(attendant)
    setShowAddModal(true)
  }

  // Save Attendant Handler
  const handleSaveAttendant = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingAttendant 
        ? `/api/events/${eventId}/attendants/${editingAttendant.associationId}`
        : `/api/events/${eventId}/attendants`
      
      const method = editingAttendant ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowAddModal(false)
        router.reload() // Refresh page to show updated data
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save attendant')
      }
    } catch (error) {
      console.error('Error saving attendant:', error)
      alert('Failed to save attendant')
    } finally {
      setLoading(false)
    }
  }

  // Remove Attendant Handler
  const handleRemoveAttendant = async (attendant: Attendant) => {
    if (!confirm(`Are you sure you want to remove ${attendant.firstName} ${attendant.lastName}?`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/events/${eventId}/attendants/${attendant.associationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.reload() // Refresh page to show updated data
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to remove attendant')
      }
    } catch (error) {
      console.error('Error removing attendant:', error)
      alert('Failed to remove attendant')
    } finally {
      setLoading(false)
    }
  }

  // Import Attendants Handler (placeholder)
  const handleImportAttendants = () => {
    alert('Import functionality coming soon!')
  }

  return (
    <EventLayout 
      title={`${event.name} - Attendants | JW Attendant Scheduler`}
      breadcrumbs={[
        { label: 'Events', href: '/events' },
        { label: event.name, href: `/events/${eventId}` },
        { label: 'Attendants' }
      ]}
      selectedEvent={{
        id: eventId,
        name: event.name,
        status: event.status
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Event Attendants</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage attendants for {event.name}
              </p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={handleAddAttendant}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                ➕ Add Attendant
              </button>
              <button 
                onClick={handleImportAttendants}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                📥 Import Attendants
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{stats.total}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Attendants</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{stats.active}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.active}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{stats.inactive}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Inactive</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.inactive}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendants Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Attendants List</h3>
            
            {attendants.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No attendants found for this event</p>
                <button 
                  onClick={handleAddAttendant}
                  disabled={loading}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Add First Attendant
                </button>
              </div>
            ) : (
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
                        Congregation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Forms of Service
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
                    {attendants.map((attendant) => (
                      <tr key={attendant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {attendant.firstName} {attendant.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{attendant.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{attendant.congregation || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {(Array.isArray(attendant.formsOfService) 
                              ? attendant.formsOfService 
                              : (attendant.formsOfService || '').toString().split(', ').filter(s => s.trim())
                            ).map((service, index) => (
                              <span 
                                key={index}
                                className={`px-2 py-1 text-xs rounded-full ${
                                  service === 'Overseer' ? 'bg-purple-100 text-purple-800' :
                                  service === 'Keyman' ? 'bg-blue-100 text-blue-800' :
                                  service === 'Elder' ? 'bg-yellow-100 text-yellow-800' :
                                  service === 'Ministerial Servant' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {service}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            attendant.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {attendant.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => handleEditAttendant(attendant)}
                            disabled={loading}
                            className="text-blue-600 hover:text-blue-900 disabled:text-blue-400 mr-3"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleRemoveAttendant(attendant)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-900 disabled:text-red-400"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Attendant Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingAttendant ? 'Edit Attendant' : 'Add New Attendant'}
                </h3>
                <form onSubmit={handleSaveAttendant}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Congregation
                      </label>
                      <input
                        type="text"
                        value={formData.congregation}
                        onChange={(e) => setFormData({ ...formData, congregation: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter congregation name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Forms of Service *
                      </label>
                      <div className="mt-2 space-y-2">
                        {['Elder', 'Ministerial Servant', 'Regular Pioneer', 'Overseer', 'Keyman', 'Other Dept.'].map((service) => (
                          <label key={service} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.formsOfService.split(', ').filter(s => s.trim()).includes(service)}
                              onChange={(e) => {
                                const currentServices = formData.formsOfService.split(', ').filter(s => s.trim())
                                if (e.target.checked) {
                                  setFormData({ 
                                    ...formData, 
                                    formsOfService: [...currentServices, service].join(', ')
                                  })
                                } else {
                                  setFormData({ 
                                    ...formData, 
                                    formsOfService: currentServices.filter(s => s !== service).join(', ')
                                  })
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">{service}</span>
                          </label>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Select all applicable forms of service. Overseers manage Keymen and Attendants. Keymen manage groups of Attendants.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Notes
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Additional notes or comments"
                      />
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isActive !== false}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">Active Attendant</span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500">
                        Inactive attendants will not be available for new assignments
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      disabled={loading}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md"
                    >
                      {loading ? 'Saving...' : (editingAttendant ? 'Update' : 'Add')} Attendant
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
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

  const { id } = context.params!
  
  // APEX GUARDIAN: Full SSR data fetching for attendants tab
  try {
    const { prisma } = await import('../../../src/lib/prisma')
    
    // Fetch event with attendant associations
    const eventData = await prisma.events.findUnique({
      where: { id: id as string },
      include: {
        event_attendant_associations: {
          include: {
            attendants: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                congregation: true,
                formsOfService: true,
                isActive: true,
                createdAt: true
              }
            }
          }
        }
      }
    })
    
    if (!eventData) {
      return { notFound: true }
    }

    // Transform data for client
    const event = {
      id: eventData.id,
      name: eventData.name,
      eventType: eventData.eventType,
      startDate: eventData.startDate?.toISOString() || null,
      endDate: eventData.endDate?.toISOString() || null,
      status: eventData.status
    }

    const attendants = eventData.event_attendant_associations
      .filter(association => association.attendants) // Filter out null attendants
      .map(association => ({
        id: association.attendants!.id,
        firstName: association.attendants!.firstName,
        lastName: association.attendants!.lastName,
        email: association.attendants!.email,
        phone: association.attendants!.phone,
        congregation: association.attendants!.congregation,
        formsOfService: association.attendants!.formsOfService,
        isActive: association.attendants!.isActive,
        createdAt: association.attendants!.createdAt?.toISOString() || null,
        associationId: association.id
      }))

    return {
      props: {
        eventId: id as string,
        event,
        attendants,
        stats: {
          total: attendants.length,
          active: attendants.filter(a => a.isActive).length,
          inactive: attendants.filter(a => !a.isActive).length
        }
      }
    }
  } catch (error) {
    console.error('Error fetching attendants data:', error)
    return { notFound: true }
  }
}
