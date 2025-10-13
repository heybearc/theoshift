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
  // APEX GUARDIAN: Oversight Management Fields
  circuitOverseerName: string
  circuitOverseerPhone: string
  circuitOverseerEmail: string
  assemblyOverseerName: string
  assemblyOverseerPhone: string
  assemblyOverseerEmail: string
  attendantOverseerName: string
  attendantOverseerPhone: string
  attendantOverseerEmail: string
  attendantOverseerAssistants: string // JSON string for form handling
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
  // APEX GUARDIAN: Oversight Management Fields
  circuitOverseerName?: string
  circuitOverseerPhone?: string
  circuitOverseerEmail?: string
  assemblyOverseerName?: string
  assemblyOverseerPhone?: string
  assemblyOverseerEmail?: string
  attendantOverseerName?: string
  attendantOverseerPhone?: string
  attendantOverseerEmail?: string
  attendantOverseerAssistants?: any[] // JSONB array
}

interface EditEventPageProps {
  event: Event
}

export default function EditEventPage({ event }: EditEventPageProps) {
  const router = useRouter()
  const eventId = event.id
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState<EventFormData>({
    name: event.name || '',
    description: event.description || '',
    eventType: event.eventType || 'CIRCUIT_ASSEMBLY',
    startDate: formatDateForInput(event.startDate),
    endDate: formatDateForInput(event.endDate),
    startTime: event.startTime || '09:30',
    endTime: event.endTime || '16:00',
    location: event.location || '',
    capacity: event.capacity ? event.capacity.toString() : '',
    attendantsNeeded: event.attendantsNeeded ? event.attendantsNeeded.toString() : '',
    status: event.status || 'UPCOMING',
    // APEX GUARDIAN: Oversight Management Fields
    circuitOverseerName: event.circuitOverseerName || '',
    circuitOverseerPhone: event.circuitOverseerPhone || '',
    circuitOverseerEmail: event.circuitOverseerEmail || '',
    assemblyOverseerName: event.assemblyOverseerName || '',
    assemblyOverseerPhone: event.assemblyOverseerPhone || '',
    assemblyOverseerEmail: event.assemblyOverseerEmail || '',
    attendantOverseerName: event.attendantOverseerName || '',
    attendantOverseerPhone: event.attendantOverseerPhone || '',
    attendantOverseerEmail: event.attendantOverseerEmail || '',
    attendantOverseerAssistants: JSON.stringify(event.attendantOverseerAssistants || [])
  })

  const [errors, setErrors] = useState<Partial<EventFormData>>({})
  const [submitting, setSubmitting] = useState(false)

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
        status: formData.status,
        // APEX GUARDIAN: Oversight Management Fields
        circuitOverseerName: formData.circuitOverseerName || undefined,
        circuitOverseerPhone: formData.circuitOverseerPhone || undefined,
        circuitOverseerEmail: formData.circuitOverseerEmail || undefined,
        assemblyOverseerName: formData.assemblyOverseerName || undefined,
        assemblyOverseerPhone: formData.assemblyOverseerPhone || undefined,
        assemblyOverseerEmail: formData.assemblyOverseerEmail || undefined,
        attendantOverseerName: formData.attendantOverseerName || undefined,
        attendantOverseerPhone: formData.attendantOverseerPhone || undefined,
        attendantOverseerEmail: formData.attendantOverseerEmail || undefined,
        attendantOverseerAssistants: formData.attendantOverseerAssistants ? JSON.parse(formData.attendantOverseerAssistants) : []
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

          {/* APEX GUARDIAN: Oversight Management Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Oversight Management</h3>
            
            {/* Circuit Overseer */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-800 mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-sm">🏛️</span>
                </span>
                Circuit Overseer
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="circuitOverseerName" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="circuitOverseerName"
                    name="circuitOverseerName"
                    value={formData.circuitOverseerName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Circuit Overseer Name"
                  />
                </div>
                <div>
                  <label htmlFor="circuitOverseerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="circuitOverseerPhone"
                    name="circuitOverseerPhone"
                    value={formData.circuitOverseerPhone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Phone Number"
                  />
                </div>
                <div>
                  <label htmlFor="circuitOverseerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="circuitOverseerEmail"
                    name="circuitOverseerEmail"
                    value={formData.circuitOverseerEmail}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email Address"
                  />
                </div>
              </div>
            </div>

            {/* Assembly Overseer */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-800 mb-4 flex items-center">
                <span className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-sm">🏢</span>
                </span>
                Assembly Overseer
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="assemblyOverseerName" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="assemblyOverseerName"
                    name="assemblyOverseerName"
                    value={formData.assemblyOverseerName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Assembly Overseer Name"
                  />
                </div>
                <div>
                  <label htmlFor="assemblyOverseerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="assemblyOverseerPhone"
                    name="assemblyOverseerPhone"
                    value={formData.assemblyOverseerPhone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Phone Number"
                  />
                </div>
                <div>
                  <label htmlFor="assemblyOverseerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="assemblyOverseerEmail"
                    name="assemblyOverseerEmail"
                    value={formData.assemblyOverseerEmail}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email Address"
                  />
                </div>
              </div>
            </div>

            {/* Attendant Overseer */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-800 mb-4 flex items-center">
                <span className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-sm">👥</span>
                </span>
                Attendant Overseer
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="attendantOverseerName" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="attendantOverseerName"
                    name="attendantOverseerName"
                    value={formData.attendantOverseerName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Attendant Overseer Name"
                  />
                </div>
                <div>
                  <label htmlFor="attendantOverseerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="attendantOverseerPhone"
                    name="attendantOverseerPhone"
                    value={formData.attendantOverseerPhone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Phone Number"
                  />
                </div>
                <div>
                  <label htmlFor="attendantOverseerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="attendantOverseerEmail"
                    name="attendantOverseerEmail"
                    value={formData.attendantOverseerEmail}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email Address"
                  />
                </div>
              </div>
            </div>

            {/* Attendant Overseer Assistants */}
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-sm">🤝</span>
                </span>
                Attendant Overseer Assistants
              </h4>
              <div>
                <label htmlFor="attendantOverseerAssistants" className="block text-sm font-medium text-gray-700 mb-1">
                  Assistants (JSON Format)
                </label>
                <textarea
                  id="attendantOverseerAssistants"
                  name="attendantOverseerAssistants"
                  rows={3}
                  value={formData.attendantOverseerAssistants}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder='[{&quot;name&quot;: &quot;Assistant Name&quot;, &quot;phone&quot;: &quot;555-0123&quot;, &quot;email&quot;: &quot;assistant@example.com&quot;}]'
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter assistants as JSON array. Example: [{'{'}"name": "John Doe", "phone": "555-0123", "email": "john@example.com"{'}'}]
                </p>
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

  // APEX GUARDIAN: Fetch event data server-side to eliminate client-side API issues
  const { id } = context.params!
  
  try {
    const { prisma } = await import('../../../src/lib/prisma')
    
    const event = await prisma.events.findUnique({
      where: { id: id as string }
    })

    if (!event) {
      return { notFound: true }
    }

    // Transform event data for frontend compatibility
    const eventWithOversight = event as any // Type assertion for new oversight fields
    const transformedEvent = {
      id: event.id,
      name: event.name,
      description: event.description || '',
      eventType: event.eventType,
      startDate: event.startDate?.toISOString() || null,
      endDate: event.endDate?.toISOString() || null,
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      location: event.location || '',
      capacity: event.capacity,
      attendantsNeeded: event.attendantsNeeded,
      status: event.status,
      // APEX GUARDIAN: Oversight Management Fields
      circuitOverseerName: eventWithOversight.circuitOverseerName,
      circuitOverseerPhone: eventWithOversight.circuitOverseerPhone,
      circuitOverseerEmail: eventWithOversight.circuitOverseerEmail,
      assemblyOverseerName: eventWithOversight.assemblyOverseerName,
      assemblyOverseerPhone: eventWithOversight.assemblyOverseerPhone,
      assemblyOverseerEmail: eventWithOversight.assemblyOverseerEmail,
      attendantOverseerName: eventWithOversight.attendantOverseerName,
      attendantOverseerPhone: eventWithOversight.attendantOverseerPhone,
      attendantOverseerEmail: eventWithOversight.attendantOverseerEmail,
      attendantOverseerAssistants: eventWithOversight.attendantOverseerAssistants,
      createdAt: event.createdAt?.toISOString() || null,
      updatedAt: event.updatedAt?.toISOString() || null
    }

    return {
      props: {
        event: transformedEvent,
      },
    }
  } catch (error) {
    console.error('Error fetching event for edit:', error)
    return { notFound: true }
  }
}
