import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventLayout from '../../../components/EventLayout'
import LocationSelector from '../../../components/LocationSelector'
import UserSearchSelect from '../../../components/UserSearchSelect'
import PhoneInput from '../../../components/PhoneInput'
import EventModulesTab from '../../../components/EventModulesTab'
import CloneEventModal, { CloneOptions } from '../../../components/CloneEventModal'
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
  locationId: string
  capacity: string
  volunteersNeeded: string
  status: string
  // APEX GUARDIAN: Oversight Management Fields
  departmentOverseerName: string
  departmentOverseerPhone: string
  departmentOverseerEmail: string
  departmentOverseerUserId: string
  departmentOverseerAssistants: string // JSON string for form handling
  keyman: string // JSON string for form handling
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
  locationId?: string
  capacity?: number
  volunteersNeeded?: number
  status: string
  settings?: {
    modules?: {
      countTimes: boolean
      lanyards: boolean
      ivsModule: boolean
      positions: boolean
      documents: boolean
      announcements: boolean
    }
    terminology?: {
      volunteer: string
      position: string
      shift: string
      assignment: string
    }
    customFields?: Record<string, any>
    moduleOverrides?: Record<string, boolean>
  }
  createdAt: string
  updatedAt: string
  // APEX GUARDIAN: Oversight Management Fields
  departmentOverseerName?: string
  departmentOverseerPhone?: string
  departmentOverseerEmail?: string
  departmentOverseerUserId?: string
  departmentOverseerAssistants?: any[]
  keyman?: any[]
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
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCloneConfirm, setShowCloneConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'modules' | 'oversight'>('basic')
  const [showTabMoreMenu, setShowTabMoreMenu] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const [tabUsesOverflowMenu, setTabUsesOverflowMenu] = useState(false)
  
  // Module and terminology state (with backward compatibility)
  const [modules, setModules] = useState({
    countTimes: event.settings?.modules?.countTimes ?? true,
    lanyards: event.settings?.modules?.lanyards ?? true,
    ivsModule: event.settings?.modules?.ivsModule ?? false,
    positions: event.settings?.modules?.positions ?? true,
    documents: event.settings?.modules?.documents ?? true,
    announcements: event.settings?.modules?.announcements ?? true
  })
  
  const [terminology, setTerminology] = useState({
    volunteer: event.settings?.terminology?.volunteer ?? 'Volunteer',
    position: event.settings?.terminology?.position ?? 'Position',
    shift: event.settings?.terminology?.shift ?? 'Shift',
    assignment: event.settings?.terminology?.assignment ?? 'Assignment'
  })

  const [formData, setFormData] = useState<EventFormData>({
    name: event.name || '',
    description: event.description || '',
    eventType: event.eventType || 'CIRCUIT_ASSEMBLY',
    startDate: formatDateForInput(event.startDate),
    endDate: formatDateForInput(event.endDate),
    startTime: event.startTime || '09:30',
    endTime: event.endTime || '16:00',
    location: event.location || '',
    locationId: event.locationId || '',
    capacity: event.capacity ? event.capacity.toString() : '',
    volunteersNeeded: event.volunteersNeeded ? event.volunteersNeeded.toString() : '',
    status: event.status || 'UPCOMING',
    // APEX GUARDIAN: Oversight Management Fields
    departmentOverseerName: event.departmentOverseerName || '',
    departmentOverseerPhone: event.departmentOverseerPhone || '',
    departmentOverseerEmail: event.departmentOverseerEmail || '',
    departmentOverseerUserId: event.departmentOverseerUserId || '',
    departmentOverseerAssistants: JSON.stringify(event.departmentOverseerAssistants || []),
    keyman: JSON.stringify(event.keyman || [])
  })

  const settingsTabs = [
    { id: 'basic' as const, label: 'Basic Info' },
    { id: 'modules' as const, label: 'Modules & Features' },
    { id: 'oversight' as const, label: 'Oversight Settings' }
  ]

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 1023px)') // < lg (phones + most tablets)
    const sync = () => setIsSmallScreen(mq.matches)
    sync()
    mq.addEventListener?.('change', sync)
    return () => mq.removeEventListener?.('change', sync)
  }, [])

  useEffect(() => {
    if (!isSmallScreen) {
      setTabUsesOverflowMenu(false)
      setShowTabMoreMenu(false)
      return
    }

    // On small screens, avoid hidden horizontal scrolling by defaulting overflow into "More".
    // With only a few tabs, this still keeps navigation discoverable and one-handed.
    setTabUsesOverflowMenu(true)
    setShowTabMoreMenu(false)
  }, [isSmallScreen])

  const [errors, setErrors] = useState<Partial<EventFormData>>({})
  
  // User search dropdown state
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [searchTarget, setSearchTarget] = useState<'overseer' | 'assistant' | 'keyman' | null>(null)
  const [searchTargetIndex, setSearchTargetIndex] = useState<number | null>(null)
  
  // Parse assistants from JSON string for UI management
  const [assistants, setAssistants] = useState<Array<{name: string, phone: string, email: string}>>(() => {
    try {
      return JSON.parse(formData.departmentOverseerAssistants)
    } catch {
      return []
    }
  })

  // Parse keymen from JSON string for UI management
  const [keymen, setKeymen] = useState<Array<{name: string, phone: string, email: string}>>(() => {
    try {
      return JSON.parse(formData.keyman)
    } catch {
      return []
    }
  })

  // Sync assistants array back to formData when it changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      departmentOverseerAssistants: JSON.stringify(assistants)
    }))
  }, [assistants])

  // Sync keymen array back to formData when it changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      keyman: JSON.stringify(keymen)
    }))
  }, [keymen])

  const addAssistant = () => {
    setAssistants([...assistants, { name: '', phone: '', email: '' }])
  }

  const removeAssistant = (index: number) => {
    setAssistants(assistants.filter((_, i) => i !== index))
  }

  const updateAssistant = (index: number, field: 'name' | 'phone' | 'email', value: string) => {
    setAssistants(assistants.map((assistant, i) => 
      i === index ? { ...assistant, [field]: value } : assistant
    ))
  }

  const addKeyman = () => {
    setKeymen([...keymen, { name: '', phone: '', email: '' }])
  }

  const removeKeyman = (index: number) => {
    setKeymen(keymen.filter((_, i) => i !== index))
  }

  const updateKeyman = (index: number, field: 'name' | 'phone' | 'email', value: string) => {
    setKeymen(keymen.map((keyman, i) => 
      i === index ? { ...keyman, [field]: value } : keyman
    ))
  }

  // User linking handlers
  const handleLinkUser = (target: 'overseer' | 'assistant' | 'keyman', index?: number) => {
    setSearchTarget(target)
    setSearchTargetIndex(index ?? null)
    setShowUserSearch(true)
  }

  const handleUserSelect = (user: any) => {
    if (searchTarget === 'overseer') {
      setFormData(prev => ({
        ...prev,
        departmentOverseerName: `${user.firstName} ${user.lastName}`,
        departmentOverseerPhone: user.phone || '',
        departmentOverseerEmail: user.email,
        departmentOverseerUserId: user.id
      }))
    } else if (searchTarget === 'assistant' && searchTargetIndex !== null) {
      setAssistants(assistants.map((assistant, i) => 
        i === searchTargetIndex ? {
          name: `${user.firstName} ${user.lastName}`,
          phone: user.phone || '',
          email: user.email,
          userId: user.id
        } : assistant
      ))
    } else if (searchTarget === 'keyman' && searchTargetIndex !== null) {
      setKeymen(keymen.map((keyman, i) => 
        i === searchTargetIndex ? {
          name: `${user.firstName} ${user.lastName}`,
          phone: user.phone || '',
          email: user.email,
          userId: user.id
        } : keyman
      ))
    }
    setShowUserSearch(false)
    setSearchTarget(null)
    setSearchTargetIndex(null)
  }

  const handleUnlinkOverseer = () => {
    setFormData(prev => ({
      ...prev,
      departmentOverseerUserId: ''
    }))
  }

  const handleUnlinkAssistant = (index: number) => {
    setAssistants(assistants.map((assistant, i) => 
      i === index ? { ...assistant, userId: undefined } : assistant
    ))
  }

  const handleUnlinkKeyman = (index: number) => {
    setKeymen(keymen.map((keyman, i) => 
      i === index ? { ...keyman, userId: undefined } : keyman
    ))
  }

  const handleLocationChange = (locationId: string | null, locationName: string) => {
    setFormData(prev => ({
      ...prev,
      locationId: locationId || '',
      location: locationName
    }))
    
    if (errors.location) {
      setErrors(prev => ({
        ...prev,
        location: ''
      }))
    }
  }

  const handleLocationCreate = async (newLocation: any) => {
    setFormData(prev => ({
      ...prev,
      locationId: newLocation.id,
      location: newLocation.name
    }))
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

    if (formData.volunteersNeeded && parseInt(formData.volunteersNeeded) < 0) {
      newErrors.volunteersNeeded = 'Volunteers needed cannot be negative'
    }

    if (formData.capacity && formData.volunteersNeeded) {
      const capacity = parseInt(formData.capacity)
      const volunteersNeeded = parseInt(formData.volunteersNeeded)
      
      if (volunteersNeeded > capacity) {
        newErrors.volunteersNeeded = 'Volunteers needed cannot exceed capacity'
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
      const submitData: any = {
        name: formData.name,
        description: formData.description || undefined,
        eventType: formData.eventType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        startTime: formData.startTime,
        endTime: formData.endTime || undefined,
        location: formData.location,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        volunteersNeeded: formData.volunteersNeeded ? parseInt(formData.volunteersNeeded) : undefined,
        status: formData.status,
        // Event settings (modules and terminology)
        settings: {
          modules,
          terminology,
          // Preserve any existing custom fields or module overrides
          ...(event.settings?.customFields && { customFields: event.settings.customFields }),
          ...(event.settings?.moduleOverrides && { moduleOverrides: event.settings.moduleOverrides })
        },
        // Note: locationId sent separately for raw SQL update
        // APEX GUARDIAN: Oversight Management Fields
        departmentOverseerName: formData.departmentOverseerName || undefined,
        departmentOverseerPhone: formData.departmentOverseerPhone || undefined,
        departmentOverseerEmail: formData.departmentOverseerEmail || undefined,
        departmentOverseerAssistants: (() => {
          try {
            return formData.departmentOverseerAssistants ? JSON.parse(formData.departmentOverseerAssistants) : []
          } catch (e) {
            console.error('Invalid JSON in departmentOverseerAssistants:', formData.departmentOverseerAssistants)
            return []
          }
        })(),
        keyman: (() => {
          try {
            return formData.keyman ? JSON.parse(formData.keyman) : []
          } catch (e) {
            console.error('Invalid JSON in keyman:', formData.keyman)
            return []
          }
        })()
      }

      // Send locationId separately so API can use it with Prisma relations (connect/disconnect)
      const requestBody = {
        ...submitData,
        locationId: formData.locationId || null  // Send as separate field for relation handling
      }

      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        setError(`HTTP ${response.status}: ${errorText}`)
        return
      }

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

  const handleCloneEvent = async (options: CloneOptions) => {
    try {
      const response = await fetch(`/api/events/${eventId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      })

      const data = await response.json()

      if (data.success) {
        setShowCloneConfirm(false)
        router.push(`/events/${data.data.id}`)
      } else {
        setError(data.error || 'Failed to clone event')
        setShowCloneConfirm(false)
      }
    } catch (err) {
      setError('Failed to clone event')
      setShowCloneConfirm(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (data.success) {
        router.push('/events')
      } else {
        setError(data.error || 'Failed to delete event')
        setShowDeleteConfirm(false)
      }
    } catch (err) {
      setError('An error occurred while deleting the event')
      setShowDeleteConfirm(false)
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
            href="/events/select"
            className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            ← Back to Event Selection
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

        {/* Tab Navigation */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            {!tabUsesOverflowMenu ? (
              <nav
                className="-mb-px flex gap-6 px-4 sm:px-6 overflow-x-auto min-w-0 theoshift-x-scroll"
                aria-label="Tabs"
              >
                {settingsTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm min-h-[44px] touch-manipulation flex-shrink-0`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            ) : (
              <div className="px-4 sm:px-6 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">Section</div>
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {settingsTabs.find((t) => t.id === activeTab)?.label || 'Settings'}
                  </div>
                </div>

                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowTabMoreMenu((v) => !v)}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors touch-manipulation"
                  >
                    More
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showTabMoreMenu && (
                    <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                      {settingsTabs.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(tab.id)
                            setShowTabMoreMenu(false)
                          }}
                          className={`w-full text-left px-4 py-3 min-h-[44px] text-sm hover:bg-gray-50 flex items-center justify-between touch-manipulation ${
                            activeTab === tab.id ? 'text-blue-700 font-semibold' : 'text-gray-700'
                          }`}
                        >
                          <span className="min-w-0 truncate">{tab.label}</span>
                          {activeTab === tab.id && (
                            <svg className="h-4 w-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Tab */}
          <div className={activeTab === 'basic' ? 'block' : 'hidden'}>
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
                <LocationSelector
                  value={formData.locationId || null}
                  locationName={formData.location}
                  onChange={handleLocationChange}
                  onCreateNew={handleLocationCreate}
                  error={errors.location}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Search saved locations or create a new one
                </p>
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
                <label htmlFor="volunteersNeeded" className="block text-sm font-medium text-gray-700 mb-1">
                  Volunteers Needed
                </label>
                <input
                  type="number"
                  id="volunteersNeeded"
                  name="volunteersNeeded"
                  min="0"
                  value={formData.volunteersNeeded}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.volunteersNeeded ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Number of volunteers needed"
                />
                {errors.volunteersNeeded && <p className="mt-1 text-sm text-red-600">{errors.volunteersNeeded}</p>}
              </div>
            </div>
          </div>
          </div>

          {/* Modules & Features Tab */}
          <div className={activeTab === 'modules' ? 'block' : 'hidden'}>
            <div className="bg-white shadow rounded-lg p-6">
              <EventModulesTab
                modules={modules}
                terminology={terminology}
                onChange={(newModules, newTerminology) => {
                  setModules(newModules)
                  setTerminology(newTerminology)
                }}
              />
            </div>
          </div>

          {/* Oversight Settings Tab */}
          <div className={activeTab === 'oversight' ? 'block' : 'hidden'}>
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Oversight Management</h3>
            
            {/* Department Overseer */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-800 flex items-center">
                  <span className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm">👥</span>
                  </span>
                  Department Overseer
                </h4>
                <div className="relative">
                  {formData.departmentOverseerUserId ? (
                    <button
                      type="button"
                      onClick={handleUnlinkOverseer}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      🔗 Linked • Click to Unlink
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleLinkUser('overseer')}
                      className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                    >
                      🔗 Link to User
                    </button>
                  )}
                  {showUserSearch && searchTarget === 'overseer' && (
                    <UserSearchSelect
                      onSelect={handleUserSelect}
                      onClose={() => setShowUserSearch(false)}
                      placeholder="Search for user..."
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="departmentOverseerName" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="departmentOverseerName"
                    name="departmentOverseerName"
                    value={formData.departmentOverseerName}
                    onChange={handleInputChange}
                    disabled={!!formData.departmentOverseerUserId}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formData.departmentOverseerUserId ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="Department Overseer Name"
                  />
                </div>
                <div>
                  <PhoneInput
                    id="departmentOverseerPhone"
                    label="Phone"
                    value={formData.departmentOverseerPhone}
                    onChange={(value) => setFormData({ ...formData, departmentOverseerPhone: value })}
                    disabled={!!formData.departmentOverseerUserId}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formData.departmentOverseerUserId ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label htmlFor="departmentOverseerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="departmentOverseerEmail"
                    name="departmentOverseerEmail"
                    value={formData.departmentOverseerEmail}
                    onChange={handleInputChange}
                    disabled={!!formData.departmentOverseerUserId}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formData.departmentOverseerUserId ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="Email Address"
                  />
                </div>
              </div>
            </div>

            {/* Department Overseer Assistants */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-800 mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-sm">🤝</span>
                </span>
                Department Overseer Assistants
              </h4>
              
              <div className="space-y-4">
                {assistants.map((assistant, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-gray-700">Assistant {index + 1}</span>
                      <div className="flex gap-2">
                        <div className="relative">
                          {(assistant as any).userId ? (
                            <button
                              type="button"
                              onClick={() => handleUnlinkAssistant(index)}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                            >
                              🔗 Linked
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleLinkUser('assistant', index)}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                            >
                              🔗 Link
                            </button>
                          )}
                          {showUserSearch && searchTarget === 'assistant' && searchTargetIndex === index && (
                            <UserSearchSelect
                              onSelect={handleUserSelect}
                              onClose={() => setShowUserSearch(false)}
                              placeholder="Search for user..."
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAssistant(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                        <input
                          type="text"
                          value={assistant.name}
                          onChange={(e) => updateAssistant(index, 'name', e.target.value)}
                          disabled={!!(assistant as any).userId}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${(assistant as any).userId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          placeholder="Full Name"
                        />
                      </div>
                      <div>
                        <PhoneInput
                          label="Phone"
                          value={assistant.phone}
                          onChange={(value) => updateAssistant(index, 'phone', value)}
                          disabled={!!(assistant as any).userId}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${(assistant as any).userId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                        <input
                          type="email"
                          value={assistant.email}
                          onChange={(e) => updateAssistant(index, 'email', e.target.value)}
                          disabled={!!(assistant as any).userId}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${(assistant as any).userId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addAssistant}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Assistant
                </button>
                
                {assistants.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No assistants added yet. Click "Add Assistant" to add one.
                  </p>
                )}
              </div>
            </div>

            {/* Keymen */}
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-sm">🔑</span>
                </span>
                Keymen
              </h4>
              
              <div className="space-y-4">
                {keymen.map((keyman, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-gray-700">Keyman {index + 1}</span>
                      <div className="flex gap-2">
                        <div className="relative">
                          {(keyman as any).userId ? (
                            <button
                              type="button"
                              onClick={() => handleUnlinkKeyman(index)}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                            >
                              🔗 Linked
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleLinkUser('keyman', index)}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                            >
                              🔗 Link
                            </button>
                          )}
                          {showUserSearch && searchTarget === 'keyman' && searchTargetIndex === index && (
                            <UserSearchSelect
                              onSelect={handleUserSelect}
                              onClose={() => setShowUserSearch(false)}
                              placeholder="Search for user..."
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeKeyman(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                        <input
                          type="text"
                          value={keyman.name}
                          onChange={(e) => updateKeyman(index, 'name', e.target.value)}
                          disabled={!!(keyman as any).userId}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${(keyman as any).userId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          placeholder="Full Name"
                        />
                      </div>
                      <div>
                        <PhoneInput
                          label="Phone"
                          value={keyman.phone}
                          onChange={(value) => updateKeyman(index, 'phone', value)}
                          disabled={!!(keyman as any).userId}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${(keyman as any).userId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                        <input
                          type="email"
                          value={keyman.email}
                          onChange={(e) => updateKeyman(index, 'email', e.target.value)}
                          disabled={!!(keyman as any).userId}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${(keyman as any).userId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addKeyman}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Keyman
                </button>
                
                {keymen.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No keymen added yet. Click "Add Keyman" to add one.
                  </p>
                )}
              </div>
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

        {/* Danger Zone */}
        <div className="bg-white shadow rounded-lg p-6 border-2 border-red-200 mt-8">
          <h3 className="text-lg font-medium text-red-900 mb-4">Danger Zone</h3>
          <div className="space-y-4">
            {/* Clone Event */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Clone This Event</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Create a duplicate with granular control over what to clone
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCloneConfirm(true)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                📋 Clone Event
              </button>
            </div>

            {/* Delete Event */}
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-red-900">Delete This Event</h4>
                <p className="text-sm text-red-700 mt-1">
                  Permanently delete this event and all associated data. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    showDeleteConfirm
                      ? 'bg-red-700 text-white hover:bg-red-800'
                      : 'bg-white border border-red-300 text-red-700 hover:bg-red-50'
                  }`}
                >
                  {showDeleteConfirm ? 'Confirm Delete' : '🗑️ Delete Event'}
                </button>
                {showDeleteConfirm && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clone Event Modal */}
      <CloneEventModal
        isOpen={showCloneConfirm}
        onClose={() => setShowCloneConfirm(false)}
        onConfirm={handleCloneEvent}
        eventName={event.name}
      />
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

  // Only ADMIN, OVERSEER, ASSISTANT_OVERSEER, and KEYMAN can edit events
  if (!['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'SUPPORT'].includes(session.user?.role || '')) {
    return {
      redirect: {
        destination: '/events',
        permanent: false,
      },
    }
  }

  // APEX GUARDIAN: Check event-specific permissions for editing
  const { id } = context.params!
  
  // Import event access utilities
  const { canManageEvent } = await import('../../../src/lib/eventAccess')
  
  // Check if user can manage (edit) this event - requires MANAGER or OWNER role
  const canEdit = await canManageEvent(session.user?.id || '', id as string)
  
  if (!canEdit) {
    // User doesn't have permission to edit this event
    return {
      redirect: {
        destination: `/events/${id}`,
        permanent: false,
      },
    }
  }

  // APEX GUARDIAN: Fetch event data server-side to eliminate client-side API issues
  
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
      startDate: event.startDate ? event.startDate.toISOString().split('T')[0] : null,
      endDate: event.endDate ? event.endDate.toISOString().split('T')[0] : null,
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      location: event.location || '',
      capacity: event.capacity,
      volunteersNeeded: event.volunteersNeeded,
      status: event.status,
      // APEX GUARDIAN: Oversight Management Fields
      locationId: event.locationId || '',
      settings: event.settings as any, // Pass settings field for modules and terminology
      departmentOverseerName: (event as any).departmentOverseerName,
      departmentOverseerPhone: (event as any).departmentOverseerPhone,
      departmentOverseerEmail: (event as any).departmentOverseerEmail,
      departmentOverseerUserId: (event as any).departmentOverseerUserId,
      departmentOverseerAssistants: (event as any).departmentOverseerAssistants,
      keyman: (event as any).keyman,
      createdAt: event.createdAt?.toISOString() || null,
      updatedAt: event.updatedAt?.toISOString() || null
    }

    return {
      props: {
        event: transformedEvent
      }
    }
  } catch (error) {
    console.error('Error fetching event for edit:', error)
    return { notFound: true }
  }
}
