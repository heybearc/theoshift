import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventPageWrapper from '../../../components/EventPageWrapper'
import FilterPresets from '../../../components/FilterPresets'
import { VolunteerBadges } from '../../../components/VolunteerBadges'
import VolunteerDetailsPopup from '../../../components/VolunteerDetailsPopup'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useScrollRestoration } from '../../../hooks/useScrollRestoration'
import { notifyAlert, toast } from '../../../lib/ui/toast'
import { appConfirm, appConfirmMessage } from '../../../lib/ui/confirm'
import {
  abortEventBulkEmail,
  formatBulkEmailConfirmMessage,
} from '../../../lib/bulkEmailClient'
import PhoneInput from '../../../components/PhoneInput'
import { displayPhone } from '@/lib/formatPhone'
import { volunteerRosterWhere } from '@/lib/volunteerRoster'

interface Event {
  id: string
  name: string
  eventType: string
  startDate: string
  endDate: string
  status: string
}

interface Volunteer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  congregation: string
  notes: string | null
  formsOfService: any // JSON field for forms of service
  isActive: boolean
  createdAt: string | null
  associationId: string
  profileVerificationRequired?: boolean
  profileVerifiedAt?: string | null
  isOverseer?: boolean
  isKeyman?: boolean
  overseerId?: string | null
  keymanId?: string | null
  overseer?: {
    id: string
    firstName: string
    lastName: string
  } | null
  keyman?: {
    id: string
    firstName: string
    lastName: string
  } | null
  availability?: {
    status: 'AVAILABLE' | 'NOT_AVAILABLE' | 'PARTIAL' | 'PENDING'
    notes: string | null
    respondedAt: string | null
  } | null
  assignments?: Array<{
    positionName: string
    role: string
  }>
}

interface VolunteerStats {
  total: number
  active: number
  inactive: number
}

type Attendant = Volunteer

interface EventVolunteersPageProps {
  eventId: string
  event: Event
  attendants: Attendant[]
  canManageContent: boolean
  canEdit: boolean
  canDelete: boolean
  canManagePermissions: boolean
  stats: VolunteerStats
  moduleConfig?: any
  terminology?: any
}

export default function EventAttendantsPage({ eventId, event, attendants, canManageContent, canEdit, canDelete, canManagePermissions, stats, moduleConfig, terminology }: EventVolunteersPageProps) {
  const router = useRouter()
  const selectionAnchorIndexRef = useRef<number | null>(null)

  useScrollRestoration(router.asPath, true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingAttendant, setEditingAttendant] = useState<Attendant | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [selectedAttendants, setSelectedAttendants] = useState<Set<string>>(new Set())
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [bulkEditData, setBulkEditData] = useState({
    isActive: '',
    congregation: '',
    formsOfService: '',
    overseerId: null as string | null,
    keymanId: null as string | null,
    pinAction: '', // 'auto-generate', 'reset', or ''
    profileVerificationRequired: '' // 'true', 'false', or ''
  })
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<string>('lastName')
  const [availabilityModalAttendant, setAvailabilityModalAttendant] = useState<string | null>(null)
  const [availabilityStatus, setAvailabilityStatus] = useState<string>('')
  const [availabilityNotes, setAvailabilityNotes] = useState<string>('')
  
  // Bulk availability request state
  const [showBulkRequestModal, setShowBulkRequestModal] = useState(false)
  const [bulkRequestDeadline, setBulkRequestDeadline] = useState('')
  const [bulkRequestMessage, setBulkRequestMessage] = useState('')
  const [sendingBulkRequest, setSendingBulkRequest] = useState(false)
  
  // View details modal state (FB-007)
  const [viewingAttendant, setViewingAttendant] = useState<Attendant | null>(null)
  
  // Helper functions for dropdown management
  const toggleDropdown = (attendantId: string) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(attendantId)) {
        newSet.delete(attendantId)
      } else {
        newSet.clear() // Close all other dropdowns
        newSet.add(attendantId)
      }
      return newSet
    })
  }
  
  const closeDropdown = (attendantId: string) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev)
      newSet.delete(attendantId)
      return newSet
    })
  }
  
  const closeAllDropdowns = () => {
    setOpenDropdowns(new Set())
  }
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Check if click is outside dropdown and button
      if (!target.closest('[id^="dropdown-"]') && !target.closest('[id^="actions-btn-"]')) {
        closeAllDropdowns()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Close dropdowns on scroll (better UX than repositioning)
  useEffect(() => {
    const handleScroll = () => {
      if (openDropdowns.size > 0) {
        closeAllDropdowns()
      }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true } as any)
    }
  }, [openDropdowns])
  
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Sort attendants based on current sort field and direction
  const sortedAttendants = React.useMemo(() => {
    return [...attendants].sort((a, b) => {
      let aValue: any = a[sortField as keyof typeof a]
      let bValue: any = b[sortField as keyof typeof b]

      // Handle special sorting cases
      if (sortField === 'lastName') {
        // Sort by full name (firstName + lastName) for better alphabetical sorting
        aValue = `${a.firstName} ${a.lastName}`
        bValue = `${b.firstName} ${b.lastName}`
      } else if (sortField === 'overseer') {
        aValue = a.overseer ? `${a.overseer.firstName} ${a.overseer.lastName}` : ''
        bValue = b.overseer ? `${b.overseer.firstName} ${b.overseer.lastName}` : ''
      } else if (sortField === 'keyman') {
        aValue = a.keyman ? `${a.keyman.firstName} ${a.keyman.lastName}` : ''
        bValue = b.keyman ? `${b.keyman.firstName} ${b.keyman.lastName}` : ''
      } else if (sortField === 'formsOfService') {
        aValue = Array.isArray(a.formsOfService) ? a.formsOfService.join(', ') : ''
        bValue = Array.isArray(b.formsOfService) ? b.formsOfService.join(', ') : ''
      }

      // Convert to strings for comparison
      aValue = String(aValue || '').toLowerCase()
      bValue = String(bValue || '').toLowerCase()

      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue)
      } else {
        return bValue.localeCompare(aValue)
      }
    })
  }, [attendants, sortField, sortDirection])

  // Handle column header clicks for sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)
  const [showBroadcastEmailModal, setShowBroadcastEmailModal] = useState(false)
  const [broadcastEmailScope, setBroadcastEmailScope] = useState<'selected' | 'all_active'>(
    'all_active'
  )
  const [broadcastSubject, setBroadcastSubject] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [bulkEmailJobKind, setBulkEmailJobKind] = useState<'broadcast' | 'availability' | null>(
    null
  )
  /** Snapshot of association IDs when emailing “selected” so sends aren’t affected if selection changes while the modal is open. */
  const [broadcastPinnedSelection, setBroadcastPinnedSelection] = useState<string[]>([])
  const [filters, setFilters] = useState<{
    search: string
    congregation: string
    isActive: 'all' | 'true' | 'false'
    overseerId: string
    keymanId: string
    formsOfService: string[]
    availability: 'all' | 'AVAILABLE' | 'NOT_AVAILABLE' | 'PARTIAL' | 'PENDING' | 'none'
  }>({
    search: '',
    congregation: '',
    isActive: 'true', // Default to Active only
    overseerId: '',
    keymanId: '',
    formsOfService: [],
    availability: 'all',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [loading, setLoading] = useState(false)
  const [importResults, setImportResults] = useState<any>(null)

  // Restore filter state from URL parameters on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const search = urlParams.get('search') || ''
      const congregation = urlParams.get('congregation') || ''
      const isActive = (urlParams.get('isActive') as 'all' | 'true' | 'false') || 'true'
      const overseerId = urlParams.get('overseerId') || ''
      const keymanId = urlParams.get('keymanId') || ''
      const formsOfService = urlParams.get('formsOfService')?.split(',').filter(Boolean) || []
      const availabilityRaw = urlParams.get('availability') || 'all'
      const availability = (
        ['all', 'AVAILABLE', 'NOT_AVAILABLE', 'PARTIAL', 'PENDING', 'none'].includes(availabilityRaw)
          ? availabilityRaw
          : 'all'
      ) as 'all' | 'AVAILABLE' | 'NOT_AVAILABLE' | 'PARTIAL' | 'PENDING' | 'none'
      const page = parseInt(urlParams.get('page') || '1')
      const perPage = parseInt(urlParams.get('perPage') || '20')
      
      // Only update if there are actual URL parameters to restore
      if (search || congregation || isActive !== 'true' || overseerId || keymanId || formsOfService.length > 0 || availability !== 'all' || page !== 1 || perPage !== 20) {
        setFilters({ search, congregation, isActive, overseerId, keymanId, formsOfService, availability })
        setCurrentPage(page)
        setItemsPerPage(perPage)
      }
    }
  }, [])

  // Helper function to preserve state and reload
  const preserveStateAndReload = () => {
    try {
      const url = new URL(window.location.href)
      if (filters.search) url.searchParams.set('search', filters.search)
      if (filters.congregation) url.searchParams.set('congregation', filters.congregation)
      if (filters.isActive !== 'true') url.searchParams.set('isActive', filters.isActive)
      if (filters.overseerId) url.searchParams.set('overseerId', filters.overseerId)
      if (filters.keymanId) url.searchParams.set('keymanId', filters.keymanId)
      if (filters.formsOfService.length > 0) url.searchParams.set('formsOfService', filters.formsOfService.join(','))
      if (filters.availability !== 'all') url.searchParams.set('availability', filters.availability)
      url.searchParams.set('page', currentPage.toString())
      url.searchParams.set('perPage', itemsPerPage.toString())
      sessionStorage.setItem(
        `theoshift:scrollY:${url.pathname}${url.search}`,
        window.scrollY.toString()
      )
      window.location.href = url.toString()
    } catch (error) {
      console.error('Error preserving state:', error)
      router.reload()
    }
  }

  // Filter and paginate attendants (using sorted data)
  const filteredAttendants = sortedAttendants.filter(attendant => {
    // Enhanced search: includes name, email, phone, congregation, and forms of service
    const searchLower = filters.search.toLowerCase()
    const matchesSearch = filters.search === '' || 
      attendant.firstName.toLowerCase().includes(searchLower) ||
      attendant.lastName.toLowerCase().includes(searchLower) ||
      attendant.email.toLowerCase().includes(searchLower) ||
      (attendant.phone && attendant.phone.toLowerCase().includes(searchLower)) ||
      (attendant.congregation && attendant.congregation.toLowerCase().includes(searchLower)) ||
      (Array.isArray(attendant.formsOfService) && 
        attendant.formsOfService.some(form => form.toLowerCase().includes(searchLower))) ||
      (attendant.isOverseer && 'overseer'.includes(searchLower)) ||
      (attendant.isKeyman && 'keyman'.includes(searchLower))
    
    const matchesCongregation = filters.congregation === '' ||
      (attendant.congregation && attendant.congregation.toLowerCase().includes(filters.congregation.toLowerCase()))
    
    const matchesStatus = filters.isActive === 'all' ||
      (filters.isActive === 'true' && attendant.isActive) ||
      (filters.isActive === 'false' && !attendant.isActive)
    
    const matchesOverseer = filters.overseerId === '' ||
      (filters.overseerId === 'none' && !attendant.overseerId) ||
      (filters.overseerId !== '' && filters.overseerId !== 'none' && attendant.overseerId === filters.overseerId)
    
    const matchesKeyman = filters.keymanId === '' ||
      (filters.keymanId === 'none' && !attendant.keymanId) ||
      (filters.keymanId !== '' && filters.keymanId !== 'none' && attendant.keymanId === filters.keymanId)
    
    const matchesFormsOfService = filters.formsOfService.length === 0 ||
      (Array.isArray(attendant.formsOfService) && 
        filters.formsOfService.some(filterForm => 
          attendant.formsOfService.some(attForm => 
            attForm.toLowerCase().includes(filterForm.toLowerCase())
          )
        ))

    const status = attendant.availability?.status
    const matchesAvailability =
      filters.availability === 'all' ||
      (filters.availability === 'none' && !status) ||
      (filters.availability !== 'none' && status === filters.availability)
    
    return matchesSearch && matchesCongregation && matchesStatus && matchesOverseer && matchesKeyman && matchesFormsOfService && matchesAvailability
  })

  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(filteredAttendants.length / itemsPerPage)
  const startIndex = itemsPerPage === -1 ? 0 : (currentPage - 1) * itemsPerPage
  const paginatedAttendants = itemsPerPage === -1 ? filteredAttendants : filteredAttendants.slice(startIndex, startIndex + itemsPerPage)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    congregation: '',
    formsOfService: '',
    notes: '',
    isActive: true,
    isOverseer: false,
    isKeyman: false
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
      isOverseer: false,
      isKeyman: false, 
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
      notes: attendant.notes || '',
      isActive: attendant.isActive,
      isOverseer: attendant.isOverseer ?? false,
      isKeyman: attendant.isKeyman ?? false
    })
    setEditingAttendant(attendant)
    setShowAddModal(true)
  }

  // Force Profile Verification Handler
  const handleForceVerification = async (attendant: Attendant) => {
    if (!(await appConfirmMessage(`Force profile verification for ${attendant.firstName} ${attendant.lastName}?\n\nThis will require them to verify their contact information on next login.`))) {
      return
    }

    try {
      const response = await fetch('/api/volunteer/force-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volunteerId: attendant.id
        })
      })

      const result = await response.json()
      if (result.success) {
        notifyAlert(`Profile verification required for ${attendant.firstName} ${attendant.lastName}.\n\nThey will see a verification popup on their next login.`)
      } else {
        notifyAlert(`Failed to set verification requirement: ${result.error}`)
      }
    } catch (error) {
      notifyAlert('Failed to set verification requirement. Please try again.')
    }
  }

  // Availability Click Handler
  const handleAvailabilityClick = (attendantId: string) => {
    const attendant = attendants.find(a => a.id === attendantId)
    if (!attendant) return
    
    setAvailabilityModalAttendant(attendantId)
    setAvailabilityStatus(attendant.availability?.status || 'PENDING')
    setAvailabilityNotes(attendant.availability?.notes || '')
  }

  // Save Availability Handler
  const handleSaveAvailability = async () => {
    if (!availabilityModalAttendant) return

    if (availabilityStatus === 'PARTIAL' && !availabilityNotes.trim()) {
      notifyAlert('Please provide notes for partial availability')
      return
    }

    try {
      const response = await fetch(`/api/events/${eventId}/volunteers/${availabilityModalAttendant}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: availabilityStatus,
          notes: availabilityNotes.trim() || null
        })
      })

      if (response.ok) {
        setAvailabilityModalAttendant(null)
        setAvailabilityStatus('')
        setAvailabilityNotes('')
        preserveStateAndReload()
      } else {
        const error = await response.json()
        notifyAlert(error.error || 'Failed to update availability')
      }
    } catch (error) {
      console.error('Error updating availability:', error)
      notifyAlert('Failed to update availability')
    }
  }

  // Bulk Availability Request Handler
  const handleBulkAvailabilityRequest = () => {
    if (selectedAttendants.size === 0) {
      notifyAlert('Please select volunteers to request availability from')
      return
    }
    setShowBulkRequestModal(true)
  }

  const handleSendBulkRequest = async () => {
    if (selectedAttendants.size === 0) return

    const count = selectedAttendants.size
    const confirmed = await appConfirm({
      title: 'Send availability requests',
      message: formatBulkEmailConfirmMessage({
        recipientCount: count,
        estimatedSeconds: Math.ceil(count * 1.2),
        scopeNote: 'Selected Volunteers roster people only (not IVS-only).',
      }),
      confirmLabel: 'Queue emails',
      cancelLabel: 'Cancel',
    })
    if (!confirmed) return

    setSendingBulkRequest(true)
    setBulkEmailJobKind('availability')
    try {
      const attendantIds = Array.from(selectedAttendants).map(associationId => {
        const attendant = attendants.find(a => a.associationId === associationId)
        return attendant?.id
      }).filter(Boolean)

      const response = await fetch(`/api/events/${eventId}/availability-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volunteerIds: attendantIds,
          deadline: bulkRequestDeadline || null,
          customMessage: bulkRequestMessage.trim() || null
        })
      })

      const result = await response.json()

      if (response.ok) {
        notifyAlert(
          result.async
            ? result.message ||
                `✅ Queued availability requests for ${result.recipientCount ?? result.sent} volunteers`
            : `✅ Availability requests sent to ${result.sent} attendants${result.failed > 0 ? `\n⚠️ ${result.failed} failed` : ''}`
        )
        setShowBulkRequestModal(false)
        setSelectedAttendants(new Set())
        setBulkRequestDeadline('')
        setBulkRequestMessage('')
        preserveStateAndReload()
      } else {
        setBulkEmailJobKind(null)
        notifyAlert(result.error || 'Failed to send availability requests')
      }
    } catch (error) {
      console.error('Error sending bulk availability request:', error)
      setBulkEmailJobKind(null)
      notifyAlert('Failed to send availability requests')
    } finally {
      setSendingBulkRequest(false)
    }
  }

  // Save Attendant Handler
  const handleSaveAttendant = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingAttendant 
        ? `/api/events/${eventId}/volunteers/${editingAttendant.id}`
        : `/api/events/${eventId}/volunteers`
      
      const method = editingAttendant ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const raw = await response.text()
      let payload: {
        error?: string
        success?: boolean
        data?: { message?: string; alreadyOnEvent?: boolean; promotedFromIvs?: boolean }
      } = {}
      try {
        if (raw) payload = JSON.parse(raw)
      } catch {
        notifyAlert(
          response.ok
            ? 'Changes may have saved, but the server returned an unexpected response. Refresh the page to confirm.'
            : 'Failed to save attendant (invalid server response).'
        )
        return
      }

      if (response.ok && payload.success !== false) {
        setShowAddModal(false)
        if (payload.data?.alreadyOnEvent) {
          toast.info(payload.data.message || 'This volunteer is already on this event')
        } else if (payload.data?.promotedFromIvs) {
          toast.success(payload.data.message || 'Added to volunteer roster (already on IVS)')
        }
        preserveStateAndReload()
      } else {
        notifyAlert(payload.error || 'Failed to save attendant')
      }
    } catch (error) {
      console.error('Error saving attendant:', error)
      notifyAlert('Failed to save attendant')
    } finally {
      setLoading(false)
    }
  }

  // Remove Attendant Handler
  const handleRemoveAttendant = async (attendant: Attendant) => {
    if (!(await appConfirmMessage(`Are you sure you want to remove ${attendant.firstName} ${attendant.lastName}?`))) {
      return
    }

    setLoading(true)
    try {
      
      const response = await fetch(`/api/events/${eventId}/volunteers/${attendant.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        preserveStateAndReload()
      } else {
        const error = await response.json()
        notifyAlert(error.error || 'Failed to remove attendant')
      }
    } catch (error) {
      console.error('Error removing attendant:', error)
      notifyAlert('Failed to remove attendant')
    } finally {
      setLoading(false)
    }
  }

  // Import Attendants Handler
  const handleImportAttendants = () => {
    setShowImportModal(true)
    setImportFile(null)
    setImportResults(null)
  }

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setImportFile(file)
    } else {
      notifyAlert('Please select a valid CSV file')
    }
  }

  // Process CSV import
  const handleProcessImport = async () => {
    if (!importFile) return

    setLoading(true)

    try {
      // Read and parse CSV file
      const text = await importFile.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        notifyAlert('CSV file must have at least a header row and one data row')
        return
      }

      // Parse CSV header
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      
      // Parse CSV data
      const attendants: any[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
        const attendant: any = {}
        
        headers.forEach((header, index) => {
          const value = values[index] || ''
          switch (header.toLowerCase()) {
            case 'firstname':
              attendant.firstName = value
              break
            case 'lastname':
              attendant.lastName = value
              break
            case 'email':
              attendant.email = value
              break
            case 'phone':
              attendant.phone = value
              break
            case 'congregation':
              attendant.congregation = value
              break
            case 'formsofservice':
              attendant.formsOfService = value
              break
            case 'notes':
              attendant.notes = value
              break
            case 'isactive':
              attendant.isActive = value.toLowerCase() === 'true'
              break
          }
        })
        
        if (attendant.firstName && attendant.lastName && attendant.email) {
          attendants.push(attendant)
        }
      }

      if (attendants.length === 0) {
        notifyAlert('No valid attendant records found in CSV')
        return
      }

      // Send to bulk import API
      const response = await fetch(`/api/events/${eventId}/volunteers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendants })
      })

      const result = await response.json()

      if (result.success) {
        setImportResults(result.data)
        setShowImportModal(false)
        preserveStateAndReload()
        notifyAlert(`Successfully imported ${attendants.length} attendants`)
      } else {
        notifyAlert(`Import failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Import error:', error)
      notifyAlert('Failed to parse CSV file. Please check the format.')
    } finally {
      setLoading(false)
    }
  }

  // Download CSV template
  const downloadTemplate = () => {
    const csvContent = `firstName,lastName,email,phone,congregation,formsOfService,notes,isActive
John,Doe,john.doe@example.com,555-1234,Central Congregation,"Elder",,true
Jane,Smith,jane.smith@example.com,555-5678,North Congregation,"Ministerial Servant",,true
Bob,Johnson,bob.johnson@example.com,,South Congregation,"Regular Pioneer",,true`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'attendants-import-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Bulk Edit Functions — use onChange (not preventDefault onClick) so the checkbox
  // paints immediately; same pattern as IVS Approvals (v4.23.2).
  const handleAttendantCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    associationId: string,
    indexOnPage: number
  ) => {
    selectionAnchorIndexRef.current = indexOnPage
    const checked = e.target.checked
    setSelectedAttendants((prev) => {
      const next = new Set(prev)
      if (checked) next.add(associationId)
      else next.delete(associationId)
      return next
    })
  }

  const activeVolunteersWithEmailCount = attendants.filter(
    (a) => a.isActive && (a.email?.trim() ?? '') !== ''
  ).length

  const openBroadcastEmailModal = (scope: 'selected' | 'all_active') => {
    setBroadcastEmailScope(scope)
    setBroadcastSubject('')
    setBroadcastMessage('')
    if (scope === 'selected') {
      setBroadcastPinnedSelection(Array.from(selectedAttendants))
    } else {
      setBroadcastPinnedSelection([])
    }
    setShowBroadcastEmailModal(true)
  }

  const handleSendBroadcastEmail = async () => {
    const subject = broadcastSubject.trim()
    const message = broadcastMessage.trim()
    if (!subject || !message) {
      notifyAlert('Please enter a subject and message.')
      return
    }
    if (broadcastEmailScope === 'selected' && broadcastPinnedSelection.length === 0) {
      notifyAlert('Select at least one volunteer, or choose “All active volunteers”.')
      return
    }

    const count =
      broadcastEmailScope === 'selected'
        ? broadcastPinnedSelection.length
        : activeVolunteersWithEmailCount
    const confirmed = await appConfirm({
      title: 'Send volunteer email',
      message: formatBulkEmailConfirmMessage({
        recipientCount: count,
        estimatedSeconds: Math.ceil(count * 1.2),
        scopeNote:
          broadcastEmailScope === 'selected'
            ? 'Selected Volunteers roster people only.'
            : 'All active Volunteers roster people with email (excludes IVS-only).',
      }),
      confirmLabel: 'Queue emails',
      cancelLabel: 'Cancel',
    })
    if (!confirmed) return

    setBroadcastSending(true)
    setBulkEmailJobKind('broadcast')
    try {
      const res = await fetch(`/api/events/${eventId}/volunteers/broadcast-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: broadcastEmailScope,
          associationIds:
            broadcastEmailScope === 'selected' ? [...broadcastPinnedSelection] : [],
          subject,
          message,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBulkEmailJobKind(null)
        const detail =
          typeof data.error === 'string'
            ? data.error
            : Array.isArray(data.errors)
              ? data.errors.slice(0, 5).join('\n')
              : ''
        notifyAlert(detail || 'Failed to send email')
        return
      }
      if (data.async) {
        notifyAlert(
          data.message ||
            `Sending to ${data.recipientCount ?? ''} recipient(s) in the background.`
        )
      } else {
        notifyAlert(data.message || 'Email sent.')
        setBulkEmailJobKind(null)
      }
      setShowBroadcastEmailModal(false)
      setBroadcastSubject('')
      setBroadcastMessage('')
    } catch (error) {
      console.error('Broadcast email error:', error)
      setBulkEmailJobKind(null)
      notifyAlert('Failed to send email')
    } finally {
      setBroadcastSending(false)
    }
  }

  const handleAbortBulkEmail = async () => {
    if (!bulkEmailJobKind) return
    const result = await abortEventBulkEmail(eventId, bulkEmailJobKind)
    notifyAlert(result.message)
    if (result.ok) setBulkEmailJobKind(null)
  }

  const handleSelectAll = () => {
    selectionAnchorIndexRef.current = null
    // With exactly one visible row, the header checkbox matches the row checkbox. A second
    // header click would otherwise clear the only selection — surprising when emailing one volunteer.
    if (filteredAttendants.length === 1) {
      const onlyId = filteredAttendants[0].associationId
      setSelectedAttendants((prev) => {
        if (prev.has(onlyId) && prev.size === 1) {
          return prev
        }
        return new Set([onlyId])
      })
      return
    }
    if (selectedAttendants.size === filteredAttendants.length) {
      setSelectedAttendants(new Set())
    } else {
      setSelectedAttendants(new Set(filteredAttendants.map(a => a.associationId)))
    }
  }

  const handleAttendantCheckboxShiftClick = (
    e: React.MouseEvent<HTMLInputElement>,
    indexOnPage: number
  ) => {
    if (!e.shiftKey || selectionAnchorIndexRef.current === null) return
    e.preventDefault()
    const lo = Math.min(selectionAnchorIndexRef.current, indexOnPage)
    const hi = Math.max(selectionAnchorIndexRef.current, indexOnPage)
    const ids = paginatedAttendants.slice(lo, hi + 1).map((a) => a.associationId)
    setSelectedAttendants((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
    selectionAnchorIndexRef.current = indexOnPage
  }

  const handleBulkEdit = () => {
    if (selectedAttendants.size === 0) {
      notifyAlert('Please select volunteers to edit')
      return
    }
    setShowBulkEditModal(true)
  }

  const handleBulkEditSave = async () => {
    if (selectedAttendants.size === 0) return

    setLoading(true)
    try {
      const updates: Promise<Response>[] = []
      const oversightUpdates: Promise<Response>[] = []
      
      for (const associationId of selectedAttendants) {
        // Find the attendant by association ID first
        const attendant = attendants.find(att => att.associationId === associationId)
        if (!attendant) {
          console.error(`❌ Could not find attendant for association ID: ${associationId}`)
          continue
        }

        // Handle basic attendant data updates
        const updateData: any = {}
        
        if (bulkEditData.isActive !== '') {
          updateData.isActive = bulkEditData.isActive === 'true'
        }
        if (bulkEditData.congregation !== '') {
          updateData.congregation = bulkEditData.congregation
        }
        if (bulkEditData.formsOfService !== '') {
          updateData.formsOfService = bulkEditData.formsOfService
        }
        if (bulkEditData.profileVerificationRequired !== '') {
          updateData.profileVerificationRequired = bulkEditData.profileVerificationRequired === 'true'
        }

        if (Object.keys(updateData).length > 0) {
          updates.push(
            fetch(`/api/events/${eventId}/volunteers/${attendant.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateData)
            }).then(response => {
              if (!response.ok) {
                console.error(`Basic update failed for ${attendant.firstName} ${attendant.lastName}:`, response.status)
                return response.json().then(err => {
                  console.error('Error details:', err)
                  throw new Error(`Basic update failed: ${err.error}`)
                })
              }
              return response
            })
          )
        }

        // Handle bulk PIN operations
        if (bulkEditData.pinAction !== '') {
          
          let pin = ''
          if (bulkEditData.pinAction === 'auto-generate' && attendant.phone) {
            const digits = attendant.phone.replace(/\D/g, '')
            if (digits.length >= 4) {
              pin = digits.slice(-4)
            }
          } else if (bulkEditData.pinAction === 'reset') {
            // Generate a random 4-digit PIN for reset
            pin = Math.floor(1000 + Math.random() * 9000).toString()
          }

          if (pin) {
            updates.push(
              fetch('/api/volunteer/set-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  volunteerId: attendant.id,
                  eventId: eventId,
                  pin,
                  autoGenerate: false
                })
              }).then(response => {
                if (!response.ok) {
                  console.error(`PIN update failed for ${attendant.firstName} ${attendant.lastName}:`, response.status)
                  throw new Error(`PIN update failed`)
                }
                return response
              })
            )
          }
        }

        // Handle oversight assignments separately
        const oversightData: any = {}
        if (bulkEditData.overseerId !== null) {
          oversightData.overseerId = bulkEditData.overseerId === 'REMOVE' ? null : bulkEditData.overseerId
        }
        if (bulkEditData.keymanId !== null) {
          oversightData.keymanId = bulkEditData.keymanId === 'REMOVE' ? null : bulkEditData.keymanId
        }

        if (Object.keys(oversightData).length > 0) {
          oversightUpdates.push(
            fetch(`/api/events/${eventId}/volunteers/${attendant.id}/oversight`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(oversightData)
            }).then(response => {
              if (!response.ok) {
                console.error(`Oversight update failed for ${attendant.firstName} ${attendant.lastName}:`, response.status)
                return response.json().then(err => {
                  console.error('Error details:', err)
                  throw new Error(`Oversight update failed: ${err.error}`)
                })
              }
              return response
            })
          )
        }
      }

      // Execute all updates in parallel
      const results = await Promise.allSettled([...updates, ...oversightUpdates])
      
      const failed = results.filter(result => result.status === 'rejected')
      const successful = results.filter(result => result.status === 'fulfilled')
      
      if (failed.length > 0) {
        console.error('Some updates failed:', failed)
        notifyAlert(`Bulk edit completed with ${successful.length} successful and ${failed.length} failed updates. Check console for details.`)
      } else {
      }
      
      setShowBulkEditModal(false)
      setSelectedAttendants(new Set())
      setBulkEditData({ isActive: '', formsOfService: '', congregation: '', overseerId: null, keymanId: null, pinAction: '', profileVerificationRequired: '' })
      
      // Preserve filter state and pagination in URL before reload
      try {
        const url = new URL(window.location.href)
        if (filters.search) url.searchParams.set('search', filters.search)
        if (filters.congregation) url.searchParams.set('congregation', filters.congregation)
        if (filters.isActive !== 'all') url.searchParams.set('isActive', filters.isActive)
        url.searchParams.set('page', currentPage.toString())
        window.location.href = url.toString()
      } catch (error) {
        console.error('Error preserving filter state:', error)
        preserveStateAndReload()
      }
    } catch (error) {
      console.error('Bulk edit error:', error)
      notifyAlert('Failed to update attendants')
    } finally {
      setLoading(false)
    }
  }

  return (
    <EventPageWrapper
      event={{
        id: eventId,
        name: event.name,
        status: event.status,
        eventType: event.eventType,
        startDate: event.startDate
      }}
      currentPage="volunteers"
      canEdit={canEdit}
      canDelete={canDelete}
      canManagePermissions={canManagePermissions}
      moduleConfig={moduleConfig}
      terminology={terminology}
    >
      <div className="max-w-7xl mx-auto">
        {/* Volunteer Login Information Banner */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded-lg p-4 shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                📧 Volunteer Login Now Uses Magic Links
              </h3>
              <p className="text-sm text-gray-700 mb-2">
                Volunteers now receive a secure email link to sign in. No PIN required!
              </p>
              <a
                href="/help/volunteer-portal"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Learn More
              </a>
            </div>
          </div>
        </div>

        {/* Compact Header with Inline Stats */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Volunteers</h2>
              {/* Inline Stats Pills */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilters({ ...filters, isActive: 'all' })}
                  className={`px-3 py-2 min-h-[44px] rounded-full text-sm font-medium transition-colors touch-manipulation ${
                    filters.isActive === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All {stats.total}
                </button>
                <button
                  onClick={() => setFilters({ ...filters, isActive: 'true' })}
                  className={`px-3 py-2 min-h-[44px] rounded-full text-sm font-medium transition-colors touch-manipulation ${
                    filters.isActive === 'true'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Active {stats.active}
                </button>
                <button
                  onClick={() => setFilters({ ...filters, isActive: 'false' })}
                  className={`px-3 py-2 min-h-[44px] rounded-full text-sm font-medium transition-colors touch-manipulation ${
                    filters.isActive === 'false'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Inactive {stats.inactive}
                </button>
              </div>
            </div>
            
            {/* Action Buttons */}
            {canManageContent && (
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={handleAddAttendant}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-md transition-colors"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
                <button 
                  onClick={handleImportAttendants}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-md transition-colors"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Import
                </button>
                <button
                  type="button"
                  onClick={() => openBroadcastEmailModal('all_active')}
                  disabled={loading || activeVolunteersWithEmailCount === 0}
                  title={
                    activeVolunteersWithEmailCount === 0
                      ? 'No active volunteers with an email address'
                      : undefined
                  }
                  className="inline-flex items-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium rounded-md transition-colors"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email volunteers
                </button>
                {bulkEmailJobKind && (
                  <button
                    type="button"
                    onClick={handleAbortBulkEmail}
                    className="inline-flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
                  >
                    Abort {bulkEmailJobKind === 'availability' ? 'availability' : 'email'} send
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Bulk Actions Toolbar */}
          {selectedAttendants.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedAttendants.size} volunteer{selectedAttendants.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={handleBulkEdit}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-gray-50 text-blue-700 text-sm font-medium rounded-md border border-blue-300 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Bulk Edit
                  </button>
                  <button 
                    onClick={handleBulkAvailabilityRequest}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-gray-50 text-blue-700 text-sm font-medium rounded-md border border-blue-300 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Request Availability
                  </button>
                  <button
                    type="button"
                    onClick={() => openBroadcastEmailModal('selected')}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-gray-50 text-blue-700 text-sm font-medium rounded-md border border-blue-300 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email selected
                  </button>
                  <button 
                    onClick={() => setSelectedAttendants(new Set())}
                    className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md border border-gray-300 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Compact Filter Bar */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 mb-4">
          <div className="px-4 py-3">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              {/* Search */}
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name, email, phone, congregation..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="block w-full pl-10 pr-3 py-2 min-h-[44px] text-base sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              {/* Quick Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-auto">
                  <select
                    value={filters.overseerId}
                    onChange={(e) => setFilters({ ...filters, overseerId: e.target.value })}
                    className="w-full px-3 py-2 pr-10 min-h-[44px] border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                  >
                    <option value="">All Overseers</option>
                    <option value="none">No Overseer</option>
                    {attendants.filter(att => att.isActive && att.isOverseer).map(overseer => (
                      <option key={overseer.id} value={overseer.id}>
                        {overseer.firstName} {overseer.lastName}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                <div className="relative w-full sm:w-auto">
                  <select
                    value={filters.keymanId}
                    onChange={(e) => setFilters({ ...filters, keymanId: e.target.value })}
                    className="w-full px-3 py-2 pr-10 min-h-[44px] border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                  >
                    <option value="">All Keymen</option>
                    <option value="none">No Keyman</option>
                    {attendants.filter(att => att.isActive && att.isKeyman).map(keyman => (
                      <option key={keyman.id} value={keyman.id}>
                        {keyman.firstName} {keyman.lastName}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <div className="relative w-full sm:w-auto">
                  <select
                    value={filters.availability}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        availability: e.target.value as typeof filters.availability,
                      })
                    }
                    className="w-full px-3 py-2 pr-10 min-h-[44px] border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                  >
                    <option value="all">All availability</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="NOT_AVAILABLE">Not available</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="PENDING">Pending</option>
                    <option value="none">No request yet</option>
                  </select>
                  <svg
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {/* Filter Presets Button */}
                <FilterPresets
                  currentFilters={filters}
                  onApplyPreset={(newFilters) =>
                    setFilters({
                      ...newFilters,
                      availability: newFilters.availability || 'all',
                    })
                  }
                  eventId={eventId}
                />
                
                {(filters.search || filters.congregation || filters.overseerId || filters.keymanId || filters.formsOfService.length > 0 || filters.availability !== 'all') && (
                  <button
                    onClick={() => setFilters({ search: '', congregation: '', isActive: filters.isActive, overseerId: '', keymanId: '', formsOfService: [], availability: 'all' })}
                    className="inline-flex items-center px-3 py-2 min-h-[44px] text-sm text-gray-700 hover:text-gray-900 font-medium touch-manipulation"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards - Remove this section */}
        <div className="hidden">
          {/* Active Filter Chips */}
          {(filters.search || filters.congregation || filters.isActive !== 'true' || filters.overseerId || filters.keymanId || filters.formsOfService.length > 0) && (
            <div className="mb-4 flex flex-wrap gap-2">
              {filters.search && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  Search: {filters.search}
                  <button onClick={() => setFilters({ ...filters, search: '' })} className="ml-2 hover:text-blue-900">×</button>
                </span>
              )}
              {filters.congregation && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  Congregation: {filters.congregation}
                  <button onClick={() => setFilters({ ...filters, congregation: '' })} className="ml-2 hover:text-blue-900">×</button>
                </span>
              )}
              {filters.isActive === 'all' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  Status: All
                  <button onClick={() => setFilters({ ...filters, isActive: 'true' })} className="ml-2 hover:text-blue-900">×</button>
                </span>
              )}
              {filters.isActive === 'false' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  Status: Inactive
                  <button onClick={() => setFilters({ ...filters, isActive: 'true' })} className="ml-2 hover:text-blue-900">×</button>
                </span>
              )}
              {filters.overseerId && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                  Overseer: {filters.overseerId === 'none' ? 'None' : attendants.find(a => a.id === filters.overseerId)?.firstName + ' ' + attendants.find(a => a.id === filters.overseerId)?.lastName}
                  <button onClick={() => setFilters({ ...filters, overseerId: '' })} className="ml-2 hover:text-purple-900">×</button>
                </span>
              )}
              {filters.keymanId && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  Keyman: {filters.keymanId === 'none' ? 'None' : attendants.find(a => a.id === filters.keymanId)?.firstName + ' ' + attendants.find(a => a.id === filters.keymanId)?.lastName}
                  <button onClick={() => setFilters({ ...filters, keymanId: '' })} className="ml-2 hover:text-green-900">×</button>
                </span>
              )}
              {filters.formsOfService.map(form => (
                <span key={form} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                  {form}
                  <button onClick={() => setFilters({ ...filters, formsOfService: filters.formsOfService.filter(f => f !== form) })} className="ml-2 hover:text-yellow-900">×</button>
                </span>
              ))}
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Name, email, phone..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Congregation</label>
              <input
                type="text"
                placeholder="Filter by congregation..."
                value={filters.congregation}
                onChange={(e) => setFilters({ ...filters, congregation: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.isActive}
                onChange={(e) => setFilters({ ...filters, isActive: e.target.value as 'all' | 'true' | 'false' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
              >
                <option value="true">Active Only</option>
                <option value="all">All</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Overseer</label>
              <select
                value={filters.overseerId}
                onChange={(e) => setFilters({ ...filters, overseerId: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
              >
                <option value="">All Overseers</option>
                <option value="none">No Overseer</option>
                {attendants.filter(att => 
                  att.isActive && 
                  Array.isArray(att.formsOfService) && 
                  att.formsOfService.some(form => form.toLowerCase().includes('overseer'))
                ).map(overseer => (
                  <option key={overseer.id} value={overseer.id}>
                    {overseer.firstName} {overseer.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Keyman</label>
              <select
                value={filters.keymanId}
                onChange={(e) => setFilters({ ...filters, keymanId: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
              >
                <option value="">All Keymen</option>
                <option value="none">No Keyman</option>
                {attendants.filter(att => 
                  att.isActive && 
                  Array.isArray(att.formsOfService) && 
                  att.formsOfService.some(form => form.toLowerCase().includes('keyman'))
                ).map(keyman => (
                  <option key={keyman.id} value={keyman.id}>
                    {keyman.firstName} {keyman.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Forms of Service</label>
              <select
                multiple
                value={filters.formsOfService}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  setFilters({ ...filters, formsOfService: selected })
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                size={4}
              >
                <option value="Elder">Elder</option>
                <option value="Ministerial Servant">Ministerial Servant</option>
                <option value="Exemplary">Exemplary</option>
                <option value="Regular Pioneer">Regular Pioneer</option>
                <option value="Other Dept.">Other Dept.</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ search: '', congregation: '', isActive: 'true', overseerId: '', keymanId: '', formsOfService: [], availability: 'all' })}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-md transition-colors min-h-[44px] touch-manipulation"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards - Quick Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <button
            onClick={() => setFilters({ ...filters, isActive: 'all' })}
            className={`bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow text-left ${filters.isActive === 'all' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{stats.total}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Volunteers</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setFilters({ ...filters, isActive: 'true' })}
            className={`bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow text-left ${filters.isActive === 'true' ? 'ring-2 ring-green-500' : ''}`}
          >
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
          </button>

          <button
            onClick={() => setFilters({ ...filters, isActive: 'false' })}
            className={`bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow text-left ${filters.isActive === 'false' ? 'ring-2 ring-red-500' : ''}`}
          >
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
          </button>
        </div>

        {/* Volunteers List (Cards on mobile, table on desktop) */}
        <div className="bg-white shadow rounded-lg overflow-visible">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Volunteers List</h3>
            
            {attendants.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No attendants found for this event</p>
                <button 
                  onClick={handleAddAttendant}
                  disabled={loading}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Add First Volunteer
                </button>
              </div>
            ) : (
              <>
                {/* Mobile-first card list (no horizontal scroll) */}
                <div className="lg:hidden space-y-3">
                  {paginatedAttendants.map((attendant, index) => (
                    <div
                      key={attendant.id}
                      className="border border-gray-200 rounded-lg p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={selectedAttendants.has(attendant.associationId)}
                            onChange={(e) =>
                              handleAttendantCheckboxChange(e, attendant.associationId, index)
                            }
                            onClick={(e) => handleAttendantCheckboxShiftClick(e, index)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <VolunteerDetailsPopup
                            volunteer={attendant}
                            onEdit={() => handleEditAttendant(attendant)}
                          >
                            <div className="min-w-0">
                              <div className="text-base font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate">
                                {attendant.firstName} {attendant.lastName}
                              </div>
                              <div className="text-sm text-gray-600 truncate">
                                {attendant.email}
                              </div>
                            </div>
                          </VolunteerDetailsPopup>

                          <div className="mt-2">
                            <VolunteerBadges
                              isActive={attendant.isActive}
                              profileVerificationRequired={attendant.profileVerificationRequired}
                              profileVerifiedAt={attendant.profileVerifiedAt}
                              availabilityStatus={attendant.availability?.status as any}
                              availabilityNotes={attendant.availability?.notes}
                              formsOfService={attendant.formsOfService}
                              isOverseer={attendant.isOverseer}
                              isKeyman={attendant.isKeyman}
                              onAvailabilityClick={() => handleAvailabilityClick(attendant.id)}
                            />
                          </div>

                          {canManageContent && (
                            <div className="mt-3 grid grid-cols-1 gap-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Overseer
                                  </label>
                                  <select
                                    value={attendant.overseerId || ''}
                                    onChange={async (e) => {
                                      const overseerId = e.target.value || null
                                      try {
                                        const response = await fetch(`/api/events/${eventId}/volunteers/${attendant.id}/oversight`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ overseerId })
                                        })
                                        if (response.ok) {
                                          preserveStateAndReload()
                                        } else {
                                          const error = await response.json().catch(() => null)
                                          notifyAlert(error?.error || 'Failed to update overseer')
                                        }
                                      } catch (error) {
                                        console.error('Error updating overseer:', error)
                                        notifyAlert('Failed to update overseer')
                                      }
                                    }}
                                    className="w-full text-sm border border-gray-300 rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
                                  >
                                    <option value="">No Overseer</option>
                                    {attendants.filter(att => att.isActive && att.isOverseer).map(overseer => (
                                      <option key={overseer.id} value={overseer.id}>
                                        {overseer.firstName} {overseer.lastName}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Keyman
                                  </label>
                                  <select
                                    value={attendant.keymanId || ''}
                                    onChange={async (e) => {
                                      const keymanId = e.target.value || null
                                      try {
                                        const response = await fetch(`/api/events/${eventId}/volunteers/${attendant.id}/oversight`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ keymanId })
                                        })
                                        if (response.ok) {
                                          preserveStateAndReload()
                                        } else {
                                          const error = await response.json().catch(() => null)
                                          notifyAlert(error?.error || 'Failed to update keyman')
                                        }
                                      } catch (error) {
                                        console.error('Error updating keyman:', error)
                                        notifyAlert('Failed to update keyman')
                                      }
                                    }}
                                    className="w-full text-sm border border-gray-300 rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
                                  >
                                    <option value="">No Keyman</option>
                                    {attendants.filter(att => att.isActive && att.isKeyman).map(keyman => (
                                      <option key={keyman.id} value={keyman.id}>
                                        {keyman.firstName} {keyman.lastName}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}

                          {attendant.assignments && attendant.assignments.length > 0 && (
                            <div className="mt-3 text-sm text-gray-700">
                              <span className="font-medium">Assignments:</span>{' '}
                              <span>{attendant.assignments.length}</span>
                            </div>
                          )}
                        </div>

                        {canManageContent && (
                          <div className="flex flex-col items-end gap-2">
                            <div className="relative inline-block text-left">
                              <button
                                id={`actions-btn-${attendant.id}`}
                                onClick={() => toggleDropdown(attendant.id)}
                                className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px] touch-manipulation"
                              >
                                Actions
                                <svg className="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>

                              {openDropdowns.has(attendant.id) && (
                                <div
                                  id={`dropdown-${attendant.id}`}
                                  className="absolute right-0 mt-1 z-50 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                                  style={{
                                    maxHeight: '300px',
                                    overflowY: 'auto'
                                  }}
                                >
                                  <div className="py-1">
                                    <button
                                      onClick={() => {
                                        handleForceVerification(attendant)
                                        closeDropdown(attendant.id)
                                      }}
                                      className="block w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 min-h-[44px] touch-manipulation"
                                    >
                                      Force Verify
                                    </button>
                                    <button
                                      onClick={() => {
                                        setViewingAttendant(attendant)
                                        closeDropdown(attendant.id)
                                      }}
                                      className="block w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 min-h-[44px] touch-manipulation"
                                    >
                                      View Details
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleEditAttendant(attendant)
                                        closeDropdown(attendant.id)
                                      }}
                                      className="block w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 min-h-[44px] touch-manipulation"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleRemoveAttendant(attendant)
                                        closeDropdown(attendant.id)
                                      }}
                                      className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 min-h-[44px] touch-manipulation"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto overflow-y-visible">
                  <table className="w-full divide-y divide-gray-200 table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-12 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedAttendants.size === filteredAttendants.length && filteredAttendants.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="w-40 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button 
                          onClick={() => handleSort('lastName')}
                          className="flex items-center space-x-1 hover:text-gray-700"
                        >
                          <span>Name</span>
                          {sortField === 'lastName' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </th>
                      <th className="w-48 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        <button 
                          onClick={() => handleSort('email')}
                          className="flex items-center space-x-1 hover:text-gray-700"
                        >
                          <span>Email</span>
                          {sortField === 'email' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </th>
                      <th className="w-28 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        <button 
                          onClick={() => handleSort('overseer')}
                          className="flex items-center space-x-1 hover:text-gray-700"
                        >
                          <span>Overseer</span>
                          {sortField === 'overseer' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </th>
                      <th className="w-28 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        <button 
                          onClick={() => handleSort('keyman')}
                          className="flex items-center space-x-1 hover:text-gray-700"
                        >
                          <span>Keyman</span>
                          {sortField === 'keyman' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                        Assignments
                      </th>
                      <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200" style={{ position: 'relative' }}>
                    {paginatedAttendants.map((attendant, index) => (
                      <tr key={attendant.id} className="hover:bg-gray-50" style={{ position: 'relative' }}>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedAttendants.has(attendant.associationId)}
                            onChange={(e) =>
                              handleAttendantCheckboxChange(e, attendant.associationId, index)
                            }
                            onClick={(e) => handleAttendantCheckboxShiftClick(e, index)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <VolunteerDetailsPopup
                            volunteer={attendant}
                            onEdit={() => handleEditAttendant(attendant)}
                          >
                            <div>
                              <div className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                                {attendant.firstName} {attendant.lastName}
                              </div>
                              <div className="text-xs text-gray-500 sm:hidden">
                                {attendant.email}
                              </div>
                              <VolunteerBadges
                                isActive={attendant.isActive}
                                profileVerificationRequired={attendant.profileVerificationRequired}
                                profileVerifiedAt={attendant.profileVerifiedAt}
                                availabilityStatus={attendant.availability?.status as any}
                                availabilityNotes={attendant.availability?.notes}
                                formsOfService={attendant.formsOfService}
                                isOverseer={attendant.isOverseer}
                                isKeyman={attendant.isKeyman}
                                onAvailabilityClick={() => handleAvailabilityClick(attendant.id)}
                              />
                            </div>
                          </VolunteerDetailsPopup>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap hidden lg:table-cell">
                          <div className="text-sm text-gray-900 truncate">{attendant.email}</div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap hidden lg:table-cell">
                          <select
                            value={attendant.overseerId || ''}
                            onChange={async (e) => {
                              const overseerId = e.target.value || null
                              try {
                                const response = await fetch(`/api/events/${eventId}/volunteers/${attendant.id}/oversight`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ overseerId })
                                })
                                if (response.ok) {
                                  preserveStateAndReload()
                                } else {
                                  const error = await response.json().catch(() => null)
                                  notifyAlert(error?.error || 'Failed to update overseer')
                                }
                              } catch (error) {
                                console.error('Error updating overseer:', error)
                                notifyAlert('Failed to update overseer')
                              }
                            }}
                            className="text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                          >
                            <option value="">No Overseer</option>
                            {attendants.filter(att => att.isActive && att.isOverseer).map(overseer => (
                              <option key={overseer.id} value={overseer.id}>
                                {overseer.firstName} {overseer.lastName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap hidden lg:table-cell">
                          <select
                            value={attendant.keymanId || ''}
                            onChange={async (e) => {
                              const keymanId = e.target.value || null
                              try {
                                const response = await fetch(`/api/events/${eventId}/volunteers/${attendant.id}/oversight`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ keymanId })
                                })
                                if (response.ok) {
                                  preserveStateAndReload()
                                } else {
                                  const error = await response.json().catch(() => null)
                                  notifyAlert(error?.error || 'Failed to update keyman')
                                }
                              } catch (error) {
                                console.error('Error updating keyman:', error)
                                notifyAlert('Failed to update keyman')
                              }
                            }}
                            className="text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                          >
                            <option value="">No Keyman</option>
                            {attendants.filter(att => att.isActive && att.isKeyman).map(keyman => (
                              <option key={keyman.id} value={keyman.id}>
                                {keyman.firstName} {keyman.lastName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3 hidden xl:table-cell">
                          {attendant.assignments && attendant.assignments.length > 0 ? (
                            <div className="text-xs space-y-1">
                              {attendant.assignments.map((assignment: any, idx: number) => (
                                <div key={idx} className="text-gray-700">
                                  <span className="font-medium">{assignment.positionName}</span>
                                  {assignment.role !== 'VOLUNTEER' && (
                                    <span className="ml-1 text-gray-500">({assignment.role})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No assignments</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
                          {canManageContent && (
                            <div className="relative inline-block text-left">
                              <button
                                id={`actions-btn-${attendant.id}`}
                                onClick={() => toggleDropdown(attendant.id)}
                                className="inline-flex items-center px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                Actions
                                <svg className="ml-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            {openDropdowns.has(attendant.id) && (
                              <div 
                                id={`dropdown-${attendant.id}`}
                                className="absolute right-0 mt-1 z-50 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                                style={{ 
                                  maxHeight: '300px',
                                  overflowY: 'auto'
                                }}
                              >
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    handleForceVerification(attendant)
                                    closeDropdown(attendant.id)
                                  }}
                                  className="block w-full text-left px-3 py-1 text-xs text-orange-600 hover:bg-orange-50"
                                >
                                  Force Verify
                                </button>
                                <button
                                  onClick={() => {
                                    setViewingAttendant(attendant)
                                    closeDropdown(attendant.id)
                                  }}
                                  className="block w-full text-left px-3 py-1 text-xs text-blue-600 hover:bg-blue-50"
                                >
                                  View Details
                                </button>
                                <button
                                  onClick={() => {
                                    handleEditAttendant(attendant)
                                    closeDropdown(attendant.id)
                                  }}
                                  className="block w-full text-left px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    handleRemoveAttendant(attendant)
                                    closeDropdown(attendant.id)
                                  }}
                                  className="block w-full text-left px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                                >
                                  Remove
                                </button>
                              </div>
                              </div>
                            )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Add space for dropdown at bottom */}
                <div className="h-48"></div>
                </div>
              </>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center space-x-4">
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{itemsPerPage === -1 ? filteredAttendants.length : startIndex + 1}</span> to{' '}
                    <span className="font-medium">{itemsPerPage === -1 ? filteredAttendants.length : Math.min(startIndex + itemsPerPage, filteredAttendants.length)}</span> of{' '}
                    <span className="font-medium">{filteredAttendants.length}</span> results
                  </p>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700">Per page:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        const newPerPage = parseInt(e.target.value)
                        setItemsPerPage(newPerPage)
                        setCurrentPage(1) // Reset to page 1 when changing items per page
                      }}
                      className="border border-gray-300 rounded-md text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                      <option value="-1">All</option>
                    </select>
                  </div>
                </div>
                {itemsPerPage !== -1 && (
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add/Edit Attendant Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-6 border max-w-2xl w-full mx-4 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingAttendant ? 'Edit Volunteer' : 'Add New Volunteer'}
                </h3>
                <form onSubmit={handleSaveAttendant}>
                  <div className="space-y-4">
                    {/* Name Fields - Side by Side */}
                    <div className="grid grid-cols-2 gap-4">
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
                      <PhoneInput
                        label="Phone"
                        value={formData.phone}
                        onChange={(value) => setFormData({ ...formData, phone: value })}
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
                        {['Elder', 'Ministerial Servant', 'Exemplary', 'Regular Pioneer', 'Other Dept.'].map((service) => (
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
                        Select all applicable forms of service (Elder, Ministerial Servant, etc.). These are global qualifications.
                      </p>
                    </div>
                    
                    {/* Event-Specific Roles Section */}
                    <div className="border-t pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Event-Specific Roles for This Event
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.isOverseer}
                            onChange={(e) => setFormData({ ...formData, isOverseer: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Overseer</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.isKeyman}
                            onChange={(e) => setFormData({ ...formData, isKeyman: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Keyman</span>
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        These roles are specific to THIS event only. A volunteer can be an overseer in one event but not in another.
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
                        <span className="ml-2 text-sm font-medium text-gray-700">Active Volunteer</span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500">
                        Inactive volunteers will not be available for new assignments
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
                      {loading ? 'Saving...' : (editingAttendant ? 'Update' : 'Add')} Volunteer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Import Volunteers Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Import Volunteers</h3>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Upload a CSV file with volunteer information. 
                  </p>
                  <button
                    onClick={downloadTemplate}
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    📥 Download CSV Template
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                {importFile && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-800">
                      ✅ File selected: {importFile.name}
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessImport}
                    disabled={loading || !importFile}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md"
                  >
                    {loading ? 'Importing...' : 'Import Volunteers'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Edit Modal */}
        {showBulkEditModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
            <div className="relative top-4 sm:top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Bulk Edit {selectedAttendants.size} Attendants
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={bulkEditData.isActive}
                      onChange={(e) => setBulkEditData({ ...bulkEditData, isActive: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No Change</option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Congregation
                    </label>
                    <input
                      type="text"
                      value={bulkEditData.congregation}
                      onChange={(e) => setBulkEditData({ ...bulkEditData, congregation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Leave empty for no change"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Forms of Service (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={bulkEditData.formsOfService}
                      onChange={(e) => setBulkEditData({ ...bulkEditData, formsOfService: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Elder, Overseer (leave empty for no change)"
                    />
                  </div>

                  {/* Leadership Assignment Section */}
                  <div className="border-t pt-4">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Leadership Assignment</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assign Overseer
                        </label>
                        <select
                          value={bulkEditData.overseerId || ''}
                          onChange={(e) => setBulkEditData({ ...bulkEditData, overseerId: e.target.value || null })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">No change</option>
                          <option value="REMOVE">Remove overseer</option>
                          {attendants.filter(att => 
                            att.isActive && 
                            Array.isArray(att.formsOfService) && 
                            att.formsOfService.some(form => form.toLowerCase().includes('overseer'))
                          ).map(overseer => (
                            <option key={overseer.id} value={overseer.id}>
                              {overseer.firstName} {overseer.lastName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assign Keyman
                        </label>
                        <select
                          value={bulkEditData.keymanId || ''}
                          onChange={(e) => setBulkEditData({ ...bulkEditData, keymanId: e.target.value || null })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">No change</option>
                          <option value="REMOVE">Remove keyman</option>
                          {attendants.filter(att => 
                            att.isActive && 
                            Array.isArray(att.formsOfService) && 
                            att.formsOfService.some(form => form.toLowerCase().includes('keyman'))
                          ).map(keyman => (
                            <option key={keyman.id} value={keyman.id}>
                              {keyman.firstName} {keyman.lastName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Verification
                    </label>
                    <select
                      value={bulkEditData.profileVerificationRequired}
                      onChange={(e) => setBulkEditData({ ...bulkEditData, profileVerificationRequired: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No Change</option>
                      <option value="true">Require Verification</option>
                      <option value="false">Clear Verification Requirement</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Force selected attendants to verify their profile information on next login.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowBulkEditModal(false)}
                    disabled={loading}
                    className="px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 min-h-[44px] touch-manipulation order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkEditSave}
                    disabled={loading}
                    className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-md min-h-[44px] touch-manipulation order-1 sm:order-2"
                  >
                    {loading ? 'Updating...' : 'Update Attendants'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Availability Request Modal */}
        {showBulkRequestModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  📧 Request Availability from {selectedAttendants.size} Attendants
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Response Deadline (Optional)
                    </label>
                    <input
                      type="date"
                      value={bulkRequestDeadline}
                      onChange={(e) => setBulkRequestDeadline(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      When do you need responses by?
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Message (Optional)
                    </label>
                    <textarea
                      value={bulkRequestMessage}
                      onChange={(e) => setBulkRequestMessage(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add any additional information or instructions for volunteers..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This message will be included in the email to volunteers
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">📋 What happens next?</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Emails will be sent to all selected attendants</li>
                      <li>• Each attendant can respond with: Available, Not Available, or Partial</li>
                      <li>• Their responses will update the availability badges on this page</li>
                      <li>• You can send reminders to non-responders later</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkRequestModal(false)
                      setBulkRequestDeadline('')
                      setBulkRequestMessage('')
                    }}
                    disabled={sendingBulkRequest}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendBulkRequest}
                    disabled={sendingBulkRequest}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {sendingBulkRequest ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Sending...
                      </>
                    ) : (
                      <>
                        📧 Send Requests
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Email volunteers (broadcast) */}
        {showBroadcastEmailModal && (
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Email volunteers</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Uses your TheoShift email configuration (same as other notifications). Volunteers
                  without an email on file are skipped. “All active” matches this page: roster active
                  and volunteer profile not deactivated. Sending runs in the background; some
                  addresses may still bounce afterward if the recipient mailbox is disabled or full.
                </p>

                <div className="space-y-3 mb-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="broadcast-scope"
                      className="mt-1"
                      checked={broadcastEmailScope === 'selected'}
                      onChange={() => {
                        setBroadcastEmailScope('selected')
                        setBroadcastPinnedSelection(Array.from(selectedAttendants))
                      }}
                      disabled={selectedAttendants.size === 0}
                    />
                    <span className={selectedAttendants.size === 0 ? 'text-gray-400' : ''}>
                      Selected volunteers ({selectedAttendants.size} row
                      {selectedAttendants.size !== 1 ? 's' : ''})
                      {selectedAttendants.size === 0 && ' — select rows in the table first'}
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="broadcast-scope"
                      className="mt-1"
                      checked={broadcastEmailScope === 'all_active'}
                      onChange={() => setBroadcastEmailScope('all_active')}
                      disabled={activeVolunteersWithEmailCount === 0}
                    />
                    <span className={activeVolunteersWithEmailCount === 0 ? 'text-gray-400' : ''}>
                      All active volunteers with an email ({activeVolunteersWithEmailCount})
                    </span>
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={broadcastSubject}
                      onChange={(e) => setBroadcastSubject(e.target.value)}
                      maxLength={200}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. Update about convention assignments"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      rows={6}
                      maxLength={15000}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Plain text — line breaks are preserved."
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBroadcastEmailModal(false)
                      setBroadcastSubject('')
                      setBroadcastMessage('')
                      setBroadcastPinnedSelection([])
                    }}
                    disabled={broadcastSending}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendBroadcastEmail}
                    disabled={
                      broadcastSending ||
                      (broadcastEmailScope === 'selected' && broadcastPinnedSelection.length === 0) ||
                      (broadcastEmailScope === 'all_active' && activeVolunteersWithEmailCount === 0)
                    }
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 min-h-[44px]"
                  >
                    {broadcastSending ? 'Sending…' : 'Send email'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Availability Status Modal */}
        {availabilityModalAttendant && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Update Availability Status
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Availability Status
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="availability"
                          value="AVAILABLE"
                          checked={availabilityStatus === 'AVAILABLE'}
                          onChange={(e) => setAvailabilityStatus(e.target.value)}
                          className="h-4 w-4 text-green-600 focus:ring-green-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-900">✅ Available</span>
                      </label>
                      
                      <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="availability"
                          value="NOT_AVAILABLE"
                          checked={availabilityStatus === 'NOT_AVAILABLE'}
                          onChange={(e) => setAvailabilityStatus(e.target.value)}
                          className="h-4 w-4 text-red-600 focus:ring-red-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-900">❌ Not Available</span>
                      </label>
                      
                      <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="availability"
                          value="PARTIAL"
                          checked={availabilityStatus === 'PARTIAL'}
                          onChange={(e) => setAvailabilityStatus(e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-900">💬 Partial Availability</span>
                      </label>
                      
                      <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="availability"
                          value="PENDING"
                          checked={availabilityStatus === 'PENDING'}
                          onChange={(e) => setAvailabilityStatus(e.target.value)}
                          className="h-4 w-4 text-gray-600 focus:ring-gray-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-900">⏳ Pending Response</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes {availabilityStatus === 'PARTIAL' && <span className="text-red-600">*</span>}
                    </label>
                    <textarea
                      value={availabilityNotes}
                      onChange={(e) => setAvailabilityNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={availabilityStatus === 'PARTIAL' ? 'Please explain your partial availability (required)' : 'Optional notes or comments'}
                    />
                    {availabilityStatus === 'PARTIAL' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Example: "Available Friday only" or "Can help morning shift but not evening"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setAvailabilityModalAttendant(null)
                      setAvailabilityStatus('')
                      setAvailabilityNotes('')
                    }}
                    className="px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 min-h-[44px] touch-manipulation order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAvailability}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md min-h-[44px] touch-manipulation order-1 sm:order-2"
                  >
                    Save Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Details Modal (FB-007) */}
        {viewingAttendant && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-6 border max-w-3xl w-full mx-4 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Volunteer Details
                </h3>
                <button
                  onClick={() => setViewingAttendant(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500">Name</label>
                      <p className="text-sm font-medium text-gray-900">
                        {viewingAttendant.firstName} {viewingAttendant.lastName}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Email</label>
                      <p className="text-sm text-gray-900">{viewingAttendant.email}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Phone</label>
                      <p className="text-sm text-gray-900">{displayPhone(viewingAttendant.phone) || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Congregation</label>
                      <p className="text-sm text-gray-900">{viewingAttendant.congregation}</p>
                    </div>
                    {viewingAttendant.notes && (
                      <div className="md:col-span-2">
                        <label className="text-xs text-gray-500">Notes</label>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{viewingAttendant.notes}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-gray-500">Status</label>
                      <p className="text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          viewingAttendant.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {viewingAttendant.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Verification Status</label>
                      <p className="text-sm">
                        {viewingAttendant.profileVerifiedAt ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Verified
                          </span>
                        ) : viewingAttendant.profileVerificationRequired ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Verification Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Not Required
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Forms of Service */}
                {viewingAttendant.formsOfService && Array.isArray(viewingAttendant.formsOfService) && viewingAttendant.formsOfService.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Forms of Service</h4>
                    <div className="flex flex-wrap gap-2">
                      {viewingAttendant.formsOfService.map((service: string, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Oversight Information */}
                {(viewingAttendant.overseer || viewingAttendant.keyman) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Oversight</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {viewingAttendant.overseer && (
                        <div>
                          <label className="text-xs text-gray-500">Overseer</label>
                          <p className="text-sm text-gray-900">
                            {viewingAttendant.overseer.firstName} {viewingAttendant.overseer.lastName}
                          </p>
                        </div>
                      )}
                      {viewingAttendant.keyman && (
                        <div>
                          <label className="text-xs text-gray-500">Keyman</label>
                          <p className="text-sm text-gray-900">
                            {viewingAttendant.keyman.firstName} {viewingAttendant.keyman.lastName}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Availability Status */}
                {viewingAttendant.availability && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Availability</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-500">Status</label>
                        <p className="text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            viewingAttendant.availability.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                            viewingAttendant.availability.status === 'NOT_AVAILABLE' ? 'bg-red-100 text-red-800' :
                            viewingAttendant.availability.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {viewingAttendant.availability.status.replace('_', ' ')}
                          </span>
                        </p>
                      </div>
                      {viewingAttendant.availability.notes && (
                        <div>
                          <label className="text-xs text-gray-500">Notes</label>
                          <p className="text-sm text-gray-900">{viewingAttendant.availability.notes}</p>
                        </div>
                      )}
                      {viewingAttendant.availability.respondedAt && (
                        <div>
                          <label className="text-xs text-gray-500">Responded</label>
                          <p className="text-sm text-gray-900">
                            {new Date(viewingAttendant.availability.respondedAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setViewingAttendant(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleEditAttendant(viewingAttendant)
                      setViewingAttendant(null)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Edit Volunteer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </EventPageWrapper>
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

  // CRITICAL: Block attendants from accessing admin pages
  if (session.user?.role === 'VOLUNTEER') {
    return {
      redirect: {
        destination: '/volunteer/dashboard',
        permanent: false,
      },
    }
  }

  // Only ADMIN, OVERSEER, ASSISTANT_OVERSEER, KEYMAN can access
  if (!['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN'].includes(session.user?.role || '')) {
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
    const fs = require('fs')
    fs.appendFileSync('/tmp/attendants-debug.log', `\n🔍 ATTENDANTS: Fetching for event ${id} at ${new Date().toISOString()}\n`)
    const { prisma } = await import('../../../src/lib/prisma')

    // Fetch event settings for moduleConfig
    const eventSettings = await prisma.events.findUnique({
      where: { id: id as string },
      select: { settings: true }
    })
    
    // Fetch event with position assignments (NEW SYSTEM - same as positions page)
    const eventData = await prisma.events.findUnique({
      where: { id: id as string },
      include: {
        positions: {
          include: {
            assignments: {
              include: {
                volunteer: {
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
                },
                overseer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                },
                keyman: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
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

    // Roster only — IVS-only imports stay off this page until promoted
    const eventAttendants = await prisma.event_volunteers.findMany({
      where: {
        eventId: id as string,
        ...volunteerRosterWhere,
      },
      select: {
        volunteerId: true
      }
    });
    
    const attendantIds = eventAttendants
      .map(ea => ea.volunteerId)
      .filter(id => id !== null) as string[];
    
    // Get all attendants (active and inactive)
    const allAttendants = await prisma.volunteers.findMany({
      where: {
        id: { in: attendantIds }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        congregation: true,
        formsOfService: true,
        isActive: true,
        createdAt: true,
        profileVerificationRequired: true,
        profileVerifiedAt: true,
        userId: true,
        availabilityStatus: true,
        notes: true,
        servingAs: true,
        skills: true,
        preferredDepartments: true,
        unavailableDates: true,
        totalAssignments: true,
        totalHours: true,
        updatedAt: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    // Get volunteer availability for this event
    const availabilityRecords = await prisma.volunteer_availability.findMany({
      where: {
        eventId: id as string,
        volunteerId: { in: attendantIds }
      },
      select: {
        volunteerId: true,
        status: true,
        notes: true,
        respondedAt: true
      }
    });

    // Create availability map for quick lookup
    const availabilityMap = new Map();
    availabilityRecords.forEach(record => {
      availabilityMap.set(record.volunteerId, {
        status: record.status,
        notes: record.notes,
        respondedAt: record.respondedAt?.toISOString() || null
      });
    });

    // Get event-attendant associations for oversight assignments
    const eventAssociations = await prisma.event_volunteers.findMany({
      where: {
        eventId: id as string
      },
      include: {
        overseer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        keyman: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Create oversight map for quick lookup
    const oversightMap = new Map();
    eventAssociations.forEach(assoc => {
      if (assoc.volunteerId) {
        oversightMap.set(assoc.volunteerId, assoc);
      }
    });

    // Create attendant map with assignment info
    const attendantMap = new Map();
    
    // First, add all active attendants
    allAttendants.forEach(attendant => {
      const association = oversightMap.get(attendant.id);
      
      const availability = availabilityMap.get(attendant.id);
      
      attendantMap.set(attendant.id, {
        id: attendant.id,
        firstName: attendant.firstName,
        lastName: attendant.lastName,
        email: attendant.email,
        phone: attendant.phone,
        congregation: attendant.congregation,
        notes: attendant.notes || null,
        formsOfService: attendant.formsOfService,
        isActive: attendant.isActive,
        createdAt: attendant.createdAt?.toISOString() || null,
        associationId: association?.id || attendant.id, // Use association ID if exists
        overseerId: association?.overseerId || null,
        keymanId: association?.keymanId || null,
        overseer: association?.overseer || null,
        keyman: association?.keyman || null,
        profileVerificationRequired: attendant.profileVerificationRequired || false,
        profileVerifiedAt: attendant.profileVerifiedAt?.toISOString() || null,
        isOverseer: association?.isOverseer ?? false,
        isKeyman: association?.isKeyman ?? false,
        availability: availability || null,
        assignments: []
      });
    });
    
    // Then, add assignment info for those who have assignments
    eventData.positions?.forEach(position => {
      position.assignments?.forEach(assignment => {
        const attendantData = assignment.volunteer
        if (attendantData && attendantMap.has(attendantData.id)) {
          const attendant = attendantMap.get(attendantData.id);
          
          // Update oversight info if this is an oversight assignment (but don't override association data)
          const overseerData = assignment.overseer
          const keymanData = assignment.keyman
          
          if (assignment.role === 'OVERSEER' && overseerData && !attendant.overseerId) {
            attendant.overseerId = overseerData.id;
            attendant.overseer = overseerData;
          }
          if (assignment.role === 'KEYMAN' && keymanData && !attendant.keymanId) {
            attendant.keymanId = keymanData.id;
            attendant.keyman = keymanData;
          }
          
          // Add assignment info
          attendant.assignments.push({
            positionName: position.name,
            role: assignment.role
          });
        }
      });
    });
    
    const attendants = Array.from(attendantMap.values());

    const { canManageAttendants, canManageEvent, canDeleteEvent, canManagePermissions } = await import('../../../src/lib/eventAccess');
    const userId = session.user?.id || '';
    const canManageContent = await canManageAttendants(userId, id as string);
    const canEdit = await canManageEvent(userId, id as string);
    const canDelete = await canDeleteEvent(userId, id as string);
    const canManagePerms = await canManagePermissions(userId, id as string);

    return {
      props: {
        eventId: id as string,
        event: {
          id: eventData.id,
          name: eventData.name,
          eventType: eventData.eventType,
          startDate: eventData.startDate?.toISOString() || '',
          endDate: eventData.endDate?.toISOString() || '',
          status: eventData.status
        },
        attendants: attendants,
        canManageContent,
        canEdit,
        canDelete,
        canManagePermissions: canManagePerms,
        stats: {
          total: attendants.length,
          active: attendants.filter(a => a.isActive).length,
          inactive: attendants.filter(a => !a.isActive).length
        },
        moduleConfig: (eventSettings?.settings as any)?.modules
          ? {
              countTimes: (eventSettings!.settings as any).modules.countTimes ?? true,
              lanyards: (eventSettings!.settings as any).modules.lanyards ?? true,
              ivsModule: (eventSettings!.settings as any).modules.ivsModule ?? false,
              positions: (eventSettings!.settings as any).modules.positions ?? true,
              documents: (eventSettings!.settings as any).modules.documents ?? true,
              announcements: (eventSettings!.settings as any).modules.announcements ?? true,
            }
          : null,
        terminology: (eventSettings?.settings as any)?.terminology || null
      }
    };
  } catch (error) {
    const fs = require('fs');
    const errorMsg = error instanceof Error ? error.message : 'Unknown';
    const errorStack = error instanceof Error ? error.stack : 'No stack';
    fs.appendFileSync('/tmp/attendants-debug.log', `\n🔍 ATTENDANTS ERROR: ${errorMsg}\nStack: ${errorStack}\n`);
    return { notFound: true };
  }
}
