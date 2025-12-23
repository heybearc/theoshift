import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import EventLayout from '../../components/EventLayout'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

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
  departmentTemplateId: string
  parentEventId: string
}

interface DepartmentTemplate {
  id: string
  name: string
  icon: string | null
  parentId: string | null
}

interface Event {
  id: string
  name: string
  startDate: string
  endDate: string
}

export default function CreateEventPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [departmentTemplates, setDepartmentTemplates] = useState<DepartmentTemplate[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loadingData, setLoadingData] = useState(true)

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
    status: 'UPCOMING',
    departmentTemplateId: '',
    parentEventId: ''
  })

  // Fetch department templates and events
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, eventsRes] = await Promise.all([
          fetch('/api/admin/department-templates'),
          fetch('/api/events?includeChildCount=true')
        ])
        
        const templatesData = await templatesRes.json()
        const eventsData = await eventsRes.json()
        
        if (templatesData.success) {
          setDepartmentTemplates(templatesData.data)
        }
        
        if (eventsData.success && eventsData.data.events) {
          // Filter out events that already have children (to prevent circular references)
          const eligibleParentEvents = eventsData.data.events.filter((event: any) => 
            !event.childEventsCount || event.childEventsCount === 0
          )
          setEvents(eligibleParentEvents)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoadingData(false)
      }
    }
    
    fetchData()
  }, [])

  const [errors, setErrors] = useState<Partial<EventFormData>>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name as keyof EventFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
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

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required'
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required'
    }

    // Validate date range
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      
      if (endDate < startDate) {
        newErrors.endDate = 'End date must be on or after start date'
      }
    }

    // Validate capacity and attendants needed
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

    setLoading(true)
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
        status: formData.status,
        departmentTemplateId: formData.departmentTemplateId && formData.departmentTemplateId !== '' ? formData.departmentTemplateId : undefined,
        parentEventId: formData.parentEventId && formData.parentEventId !== '' ? formData.parentEventId : undefined
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Event created successfully!')
        setTimeout(() => {
          router.push('/events')
        }, 1500)
      } else {
        setError(data.error || 'Failed to create event')
        if (data.details) {
          console.error('Validation errors:', data.details)
        }
      }
    } catch (error) {
      setError('Error creating event')
      console.error('Error:', error)
    } finally {
      setLoading(false)
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

  return (
    <EventLayout 
      title="Create New Event"
      breadcrumbs={[
        { label: 'Events', href: '/events' },
        { label: 'Create Event' }
      ]}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="mt-2 text-sm text-gray-600">
                Set up a new event with attendant scheduling
              </p>
            </div>
            <Link
              href="/events/select"
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              ← Back to Event Selection
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
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
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Circuit Assembly 2024"
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
                    errors.eventType ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  {eventTypes.map(type => (
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
                  {statusOptions.map(status => (
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

          {/* Department Configuration */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Department Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="departmentTemplateId" className="block text-sm font-medium text-gray-700 mb-1">
                  Department Template
                </label>
                <select
                  id="departmentTemplateId"
                  name="departmentTemplateId"
                  value={formData.departmentTemplateId}
                  onChange={handleInputChange}
                  disabled={loadingData}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select a department template (optional)</option>
                  {departmentTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.icon} {template.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Link this event to a department template for consistency
                </p>
              </div>

              <div>
                <label htmlFor="parentEventId" className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Event
                </label>
                <select
                  id="parentEventId"
                  name="parentEventId"
                  value={formData.parentEventId}
                  onChange={handleInputChange}
                  disabled={loadingData}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">No parent event (standalone)</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Create as a child event (e.g., Audio Crew under Audio-Video)
                </p>
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Date and Time</h3>
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
                    errors.startDate ? 'border-red-300' : 'border-gray-300'
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
                    errors.endDate ? 'border-red-300' : 'border-gray-300'
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.startTime ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.startTime && <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>}
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
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Location and Capacity</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    errors.location ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Kingdom Hall - Main Auditorium"
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
                  value={formData.capacity}
                  onChange={handleInputChange}
                  min="1"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.capacity ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., 200"
                />
                {errors.capacity && <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>}
              </div>

              <div className="md:col-span-1">
                <label htmlFor="attendantsNeeded" className="block text-sm font-medium text-gray-700 mb-1">
                  Volunteers Needed
                </label>
                <input
                  type="number"
                  id="attendantsNeeded"
                  name="attendantsNeeded"
                  value={formData.attendantsNeeded}
                  onChange={handleInputChange}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.attendantsNeeded ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., 15"
                />
                {errors.attendantsNeeded && <p className="mt-1 text-sm text-red-600">{errors.attendantsNeeded}</p>}
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Link
              href="/admin/events"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></span>
                  Creating...
                </>
              ) : (
                'Create Event'
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

  // Only ADMIN, OVERSEER, and ASSISTANT_OVERSEER can create events
  if (!['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER'].includes(session.user?.role || '')) {
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
