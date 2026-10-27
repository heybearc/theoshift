import { useState, useEffect } from 'react'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import AdminLayout from '../../components/AdminLayout'
import MapPreview from '../../components/MapPreview'
import { notifyAlert, toast } from '../../lib/ui/toast'
import { appConfirm, appConfirmMessage } from '../../lib/ui/confirm'

interface Location {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  notes: string | null
  isActive: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
  _count?: {
    events: number
  }
}

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    fetchLocations()
  }, [searchTerm, showInactive])

  const fetchLocations = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (showInactive) params.append('includeInactive', 'true')

      const response = await fetch(`/api/locations?${params}`)
      const data = await response.json()

      if (data.success) {
        setLocations(data.data)
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (locationId: string) => {
    if (!(await appConfirmMessage('Are you sure you want to deactivate this location?'))) return

    try {
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        fetchLocations()
      } else {
        notifyAlert('Failed to delete location: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting location:', error)
      notifyAlert('Error deleting location')
    }
  }

  const handleReactivate = async (locationId: string) => {
    try {
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true })
      })

      const data = await response.json()

      if (data.success) {
        fetchLocations()
      } else {
        notifyAlert('Failed to reactivate location: ' + data.error)
      }
    } catch (error) {
      console.error('Error reactivating location:', error)
      notifyAlert('Error reactivating location')
    }
  }

  const handleViewDetails = async (locationId: string) => {
    try {
      const response = await fetch(`/api/locations/${locationId}`)
      const data = await response.json()

      if (data.success) {
        setSelectedLocation(data.data)
        setShowEditModal(true)
      }
    } catch (error) {
      console.error('Error fetching location details:', error)
    }
  }

  return (
    <AdminLayout title="Location Library">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Location Library</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage saved locations for events
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search locations by name or address..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show inactive</span>
              </label>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Locations</div>
            <div className="text-2xl font-bold text-gray-900">
              {locations.filter(l => l.isActive).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">With Coordinates</div>
            <div className="text-2xl font-bold text-gray-900">
              {locations.filter(l => l.isActive && l.latitude && l.longitude).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Usage</div>
            <div className="text-2xl font-bold text-gray-900">
              {locations.reduce((sum, l) => sum + (l._count?.events || 0), 0)}
            </div>
          </div>
        </div>

        {/* Locations Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading locations...</div>
          ) : locations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No locations found. Create one when adding an event!
            </div>
          ) : (
            <>
            <div className="md:hidden divide-y divide-gray-200">
              {locations.map((location) => (
                <div key={location.id} className={`p-4 space-y-3 ${!location.isActive ? 'bg-gray-50' : ''}`}>
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-gray-900 break-words">{location.name}</div>
                    <div className="text-sm text-gray-600 break-words">
                      {location.address || 'No address'}
                    </div>
                    {location.latitude && location.longitude && (
                      <div className="text-xs text-gray-500 mt-1">
                        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                    <span>
                      {location._count?.events || 0} event{location._count?.events !== 1 ? 's' : ''}
                    </span>
                    {location.isActive ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewDetails(location.id)}
                      className="px-3 py-3 rounded-md border border-gray-300 text-sm font-medium text-gray-800 min-h-[44px] touch-manipulation"
                    >
                      View
                    </button>
                    {location.latitude && location.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-center px-3 py-3 rounded-md border border-gray-300 text-sm font-medium text-blue-800 min-h-[44px] touch-manipulation"
                      >
                        Map
                      </a>
                    )}
                    {location.isActive ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(location.id)}
                        className="px-3 py-3 rounded-md text-sm font-medium text-red-800 bg-red-50 min-h-[44px] touch-manipulation"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReactivate(location.id)}
                        className="px-3 py-3 rounded-md text-sm font-medium text-green-800 bg-green-50 min-h-[44px] touch-manipulation"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Events
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {locations.map((location) => (
                    <tr key={location.id} className={!location.isActive ? 'bg-gray-50' : ''}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">📍</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {location.name}
                            </div>
                            {location.latitude && location.longitude && (
                              <div className="text-xs text-gray-500">
                                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {location.address || (
                            <span className="text-gray-400 italic">No address</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {location._count?.events || 0} event{location._count?.events !== 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {location.isActive ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleViewDetails(location.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        {location.latitude && location.longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Map
                          </a>
                        )}
                        {location.isActive ? (
                          <button
                            onClick={() => handleDelete(location.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(location.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </div>

      {/* Location Details Modal */}
      {showEditModal && selectedLocation && (
        <LocationDetailsModal
          location={selectedLocation}
          onClose={() => {
            setShowEditModal(false)
            setSelectedLocation(null)
          }}
          onUpdate={() => {
            fetchLocations()
            setShowEditModal(false)
            setSelectedLocation(null)
          }}
        />
      )}
    </AdminLayout>
  )
}

interface LocationDetailsModalProps {
  location: Location & { events?: any[] }
  onClose: () => void
  onUpdate: () => void
}

function LocationDetailsModal({ location, onClose, onUpdate }: LocationDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{location.name}</h3>
            <p className="text-sm text-gray-500 mt-1">Location Details</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <p className="text-sm text-gray-900">
              {location.address || <span className="text-gray-400 italic">No address provided</span>}
            </p>
          </div>

          {/* Coordinates */}
          {location.latitude && location.longitude && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coordinates</label>
              <p className="text-sm text-gray-900">
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </p>
            </div>
          )}

          {/* Map */}
          {location.latitude && location.longitude && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Map</label>
              <MapPreview
                latitude={location.latitude}
                longitude={location.longitude}
                name={location.name}
              />
            </div>
          )}

          {/* Notes */}
          {location.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{location.notes}</p>
            </div>
          )}

          {/* Usage Stats */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usage</label>
            <p className="text-sm text-gray-900">
              Used in {location._count?.events || 0} event{location._count?.events !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Recent Events */}
          {location.events && location.events.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recent Events</label>
              <div className="space-y-2">
                {location.events.map((event: any) => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{event.name}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      event.status === 'UPCOMING' ? 'bg-blue-100 text-blue-800' :
                      event.status === 'CURRENT' ? 'bg-green-100 text-green-800' :
                      event.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-gray-500 space-y-1">
            <div>Created: {new Date(location.createdAt).toLocaleString()}</div>
            <div>Updated: {new Date(location.updatedAt).toLocaleString()}</div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
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

  if (session.user.role !== 'ADMIN') {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    }
  }

  return {
    props: {},
  }
}
