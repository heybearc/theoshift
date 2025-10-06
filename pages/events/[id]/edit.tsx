import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventLayout from '../../../components/EventLayout'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

// Helper function to format date for input[type="date"] without timezone issues
const formatDateForInput = (dateString: string): string => {
  if (!dateString) return ''
  // Parse ISO date string directly to avoid timezone conversion
  // Input: "2025-10-20T00:00:00.000Z" -> Output: "2025-10-20"
  return dateString.split('T')[0]
}

interface EventFormData {
  name: string
  description: string
  eventType: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  location: string
  capacity: string
  attendantsNeeded: string
  status: string
}

interface Event {
  id: string
  name: string
  description?: string
  eventType: string
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  location?: string
  capacity?: number
  attendantsNeeded?: number
  status: string
  createdAt: string
  updatedAt: string
}

export default function EditEventPage() {
  const router = useRouter()
  const { id: eventId } = router.query
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    description: '',
    eventType: 'CIRCUIT_ASSEMBLY',
    startDate: '',
    endDate: '',
    startTime: '09:30',
    endTime: '16:00',
    location: '',
    capacity: '',
    attendantsNeeded: '',
    status: 'UPCOMING'
  })

  const [errors, setErrors] = useState<Partial<EventFormData>>({})

  useEffect(() => {
    if (eventId) {
      fetchEvent()
    }
  }, [eventId])

  const fetchEvent = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/events/${eventId}`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (data.success) {
        const eventData = data.data
        setEvent(eventData)
        
        // Populate form with existing data
        setFormData({
          name: eventData.name || '',
          description: eventData.description || '',
          eventType: eventData.eventType || 'CIRCUIT_ASSEMBLY',
          startDate: formatDateForInput(eventData.startDate),
          endDate: formatDateForInput(eventData.endDate),
          startTime: eventData.startTime || '09:30',
          endTime: eventData.endTime || '16:00',
          location: eventData.location || '',
          capacity: eventData.capacity ? eventData.capacity.toString() : '',
          attendantsNeeded: eventData.attendantsNeeded ? eventData.attendantsNeeded.toString() : '',
          status: eventData.status || 'UPCOMING'
        })
      } else {
        setError('Event not found')
      }
    } catch (err) {
      setError('Error loading event')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }

    // Clear error for this field
    if (errors[name as keyof EventFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<EventFormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Event name is required'
    }

    if (!formData.eventType) {
      newErrors.eventType = 'Event type is required'
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    }

    if (!formData.location?.trim()) {
      newErrors.location = 'Location is required'
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      
      if (endDate < startDate) {
        newErrors.endDate = 'End date must be on or after start date'
      }
    }

    if (formData.capacity && parseInt(formData.capacity) <= 0) {
      newErrors.capacity = 'Capacity must be a positive number'
    }

    if (formData.attendantsNeeded && parseInt(formData.attendantsNeeded) < 0) {
      newErrors.attendantsNeeded = 'Attendants needed cannot be negative'
    }

    if (formData.capacity && formData.attendantsNeeded) {
      const capacity = parseInt(formData.capacity)
      const attendantsNeeded = parseInt(formData.attendantsNeeded)
      
      if (attendantsNeeded > capacity) {
        newErrors.attendantsNeeded = 'Attendants needed cannot exceed capacity'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const submitData = {
        name: formData.name,
        description: formData.description || undefined,
        eventType: formData.eventType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        startTime: formData.startTime,
        endTime: formData.endTime || undefined,
        location: formData.location,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        attendantsNeeded: formData.attendantsNeeded ? parseInt(formData.attendantsNeeded) : undefined,
        status: formData.status
      }

      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(submitData),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Event updated successfully!')
        setTimeout(() => {
          router.push(`/events/${eventId}`)
        }, 1500)
      } else {
        setError(data.error || 'Failed to update event')
        if (data.details) {
          console.error('Validation errors:', data.details)
        }
      }
    } catch (error) {
      setError('Error updating event')
      console.error('Error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const eventTypes = [
    { value: 'CIRCUIT_ASSEMBLY', label: 'Circuit Assembly' },
    { value: 'REGIONAL_CONVENTION', label: 'Regional Convention' },
    { value: 'SPECIAL_EVENT', label: 'Special Event' },
    { value: 'OTHER', label: 'Other' }
  ]

  const statusOptions = [
    { value: 'UPCOMING', label: 'Upcoming' },
    { value: 'CURRENT', label: 'Current' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'ARCHIVED', label: 'Archived' }
  ]

  if (loading) {
    return (
      <EventLayout 
        title="Edit Event"
        breadcrumbs={[
          { label: 'Events', href: '/events' },
          { label: 'Loading...', href: `/events/${eventId}` },
          { label: 'Edit' }
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Loading event...</p>
        </div>
      </EventLayout>
    )
  }

  if (error && !event) {
    return (
      <EventLayout 
        title="Edit Event"
        breadcrumbs={[
          { label: 'Events', href: '/events' },
          { label: 'Error' }
        ]}
      >
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <p className="text-red-700">{error}</p>
          <Link
            href="/events"
            className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            ← Back to Events
          </Link>
        </div>
      </EventLayout>
    )
  }

  return (
    <EventLayout 
      title="Edit Event"
      breadcrumbs={[
        { label: 'Events', href: '/events' },
        { label: event?.name || '', href: `/events/${eventId}` },
        { label: 'Edit' }
      ]}
      selectedEvent={{
        id: event?.id || '',
        name: event?.name || ''
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
              <p className="mt-2 text-sm text-gray-600">
                Update event information and settings
              </p>
            </div>
            <Link
              href={`/events/${eventId}`}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              ← Back to Event
            </Link>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Event Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter event name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type *
                </label>
                <select
                  id="eventType"
                  name="eventType"
                  value={formData.eventType}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.eventType ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  {eventTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.eventType && <p className="mt-1 text-sm text-red-600">{errors.eventType}</p>}
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description of the event..."
                />
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Date and Time</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.startDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.endDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
              </div>

              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Location and Capacity */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Location and Capacity</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location *
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.location ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter event location"
                />
                {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
              </div>

              <div>
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity
                </label>
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  min="1"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.capacity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Maximum attendees"
                />
                {errors.capacity && <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>}
              </div>

              <div>
                <label htmlFor="attendantsNeeded" className="block text-sm font-medium text-gray-700 mb-1">
                  Attendants Needed
                </label>
                <input
                  type="number"
                  id="attendantsNeeded"
                  name="attendantsNeeded"
                  min="0"
                  value={formData.attendantsNeeded}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.attendantsNeeded ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Number of attendants needed"
                />
                {errors.attendantsNeeded && <p className="mt-1 text-sm text-red-600">{errors.attendantsNeeded}</p>}
              </div>
            </div>
          </div>


          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3">
            <Link
              href={`/events/${eventId}`}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></span>
                  Updating...
                </>
              ) : (
                'Update Event'
              )}
            </button>
          </div>
        </form>
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

  // Only ADMIN and OVERSEER can edit events
  if (!['ADMIN', 'OVERSEER'].includes(session.user?.role || '')) {
    return {
      redirect: {
        destination: '/events',
        permanent: false,
      },
    }
  }

  return {
    props: {},
  }
}
