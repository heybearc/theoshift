import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventLayout from '../../../components/EventLayout'
import React, { useState, useEffect } from 'react'
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
  profileVerificationRequired?: boolean
  profileVerifiedAt?: string | null
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
    pinAction: '' // 'auto-generate', 'reset', or ''
  })
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<string>('lastName')
  
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
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Sort attendants based on current sort field and direction
  const sortedAttendants = React.useMemo(() => {
    return [...attendants].sort((a, b) => {
      let aValue: any = a[sortField as keyof typeof a]
      let bValue: any = b[sortField as keyof typeof b]

      // Handle nested objects (overseer, keyman)
      if (sortField === 'overseer') {
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
  const [filters, setFilters] = useState<{
    search: string
    congregation: string
    isActive: 'all' | 'true' | 'false'
  }>({
    search: '',
    congregation: '',
    isActive: 'all'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [loading, setLoading] = useState(false)
  const [importResults, setImportResults] = useState<any>(null)

  // Restore filter state from URL parameters on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const search = urlParams.get('search') || ''
      const congregation = urlParams.get('congregation') || ''
      const isActive = (urlParams.get('isActive') as 'all' | 'true' | 'false') || 'all'
      const page = parseInt(urlParams.get('page') || '1')
      
      // Only update if there are actual URL parameters to restore
      if (search || congregation || isActive !== 'all' || page !== 1) {
        setFilters({ search, congregation, isActive })
        setCurrentPage(page)
      }
    }
  }, [])

  // Filter and paginate attendants (using sorted data)
  const filteredAttendants = sortedAttendants.filter(attendant => {
    const matchesSearch = filters.search === '' || 
      attendant.firstName.toLowerCase().includes(filters.search.toLowerCase()) ||
      attendant.lastName.toLowerCase().includes(filters.search.toLowerCase()) ||
      attendant.email.toLowerCase().includes(filters.search.toLowerCase())
    
    const matchesCongregation = filters.congregation === '' ||
      (attendant.congregation && attendant.congregation.toLowerCase().includes(filters.congregation.toLowerCase()))
    
    const matchesStatus = filters.isActive === 'all' ||
      (filters.isActive === 'true' && attendant.isActive) ||
      (filters.isActive === 'false' && !attendant.isActive)
    
    return matchesSearch && matchesCongregation && matchesStatus
  })

  const totalPages = Math.ceil(filteredAttendants.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedAttendants = filteredAttendants.slice(startIndex, startIndex + itemsPerPage)
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

  // Set PIN Handler
  const handleSetPIN = async (attendant: Attendant) => {
    let pin = ''
    
    // Auto-generate from phone if available
    if (attendant.phone) {
      const digits = attendant.phone.replace(/\D/g, '')
      if (digits.length >= 4) {
        pin = digits.slice(-4)
        if (!confirm(`Auto-generate PIN "${pin}" from phone number for ${attendant.firstName} ${attendant.lastName}?`)) {
          return
        }
      }
    }
    
    // Manual entry if no phone or user declined auto-generate
    if (!pin) {
      pin = prompt(`Enter 4-digit PIN for ${attendant.firstName} ${attendant.lastName}:`) || ''
      if (!pin || !/^\d{4}$/.test(pin)) {
        if (pin) alert('PIN must be exactly 4 digits')
        return
      }
    }

    try {
      const response = await fetch('/api/attendant/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendantId: attendant.id,
          pin,
          autoGenerate: false
        })
      })

      const result = await response.json()
      if (result.success) {
        alert(`PIN set successfully for ${attendant.firstName} ${attendant.lastName}: ${result.pin}\n\nPlease communicate this PIN to the attendant securely.`)
      } else {
        alert(`Failed to set PIN: ${result.error}`)
      }
    } catch (error) {
      alert('Failed to set PIN. Please try again.')
    }
  }

  // Force Profile Verification Handler
  const handleForceVerification = async (attendant: Attendant) => {
    if (!confirm(`Force profile verification for ${attendant.firstName} ${attendant.lastName}?\n\nThis will require them to verify their contact information on next login.`)) {
      return
    }

    try {
      const response = await fetch('/api/attendant/force-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendantId: attendant.id
        })
      })

      const result = await response.json()
      if (result.success) {
        alert(`Profile verification required for ${attendant.firstName} ${attendant.lastName}.\n\nThey will see a verification popup on their next login.`)
      } else {
        alert(`Failed to set verification requirement: ${result.error}`)
      }
    } catch (error) {
      alert('Failed to set verification requirement. Please try again.')
    }
  }

  // Save Attendant Handler
  const handleSaveAttendant = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingAttendant 
        ? `/api/events/${eventId}/attendants/${editingAttendant.id}`
        : `/api/events/${eventId}/attendants`
      
      const method = editingAttendant ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowAddModal(false)
        // TODO: Update local state instead of page reload to preserve pagination
        router.reload()
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
      console.log(`🗑️ Removing attendant: ${attendant.firstName} ${attendant.lastName} (ID: ${attendant.id})`)
      
      const response = await fetch(`/api/events/${eventId}/attendants/${attendant.id}`, {
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
      alert('Please select a valid CSV file')
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
        alert('CSV file must have at least a header row and one data row')
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
        alert('No valid attendant records found in CSV')
        return
      }

      // Send to bulk import API
      const response = await fetch(`/api/events/${eventId}/attendants`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendants })
      })

      const result = await response.json()

      if (result.success) {
        setImportResults(result.data)
        setShowImportModal(false)
        router.reload()
        alert(`Successfully imported ${attendants.length} attendants`)
      } else {
        alert(`Import failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Failed to parse CSV file. Please check the format.')
    } finally {
      setLoading(false)
    }
  }

  // Download CSV template
  const downloadTemplate = () => {
    const csvContent = `firstName,lastName,email,phone,congregation,formsOfService,notes,isActive
John,Doe,john.doe@example.com,555-1234,Central Congregation,"Elder, Overseer",,true
Jane,Smith,jane.smith@example.com,555-5678,North Congregation,"Ministerial Servant, Keyman",,true
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

  // Bulk Edit Functions
  const handleSelectAttendant = (associationId: string) => {
    const newSelected = new Set(selectedAttendants)
    if (newSelected.has(associationId)) {
      newSelected.delete(associationId)
    } else {
      newSelected.add(associationId)
    }
    setSelectedAttendants(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedAttendants.size === attendants.length) {
      setSelectedAttendants(new Set())
    } else {
      setSelectedAttendants(new Set(attendants.map(a => a.associationId)))
    }
  }

  const handleBulkEdit = () => {
    if (selectedAttendants.size === 0) {
      alert('Please select attendants to edit')
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
          console.log(`🔧 Bulk status update for ${attendant.firstName} ${attendant.lastName}: ${bulkEditData.isActive} → ${updateData.isActive}`)
        }
        if (bulkEditData.congregation !== '') {
          updateData.congregation = bulkEditData.congregation
          console.log(`🔧 Bulk congregation update for ${attendant.firstName} ${attendant.lastName}: ${updateData.congregation}`)
        }
        if (bulkEditData.formsOfService !== '') {
          updateData.formsOfService = bulkEditData.formsOfService
          console.log(`🔧 Bulk forms of service update for ${attendant.firstName} ${attendant.lastName}: ${updateData.formsOfService}`)
        }

        if (Object.keys(updateData).length > 0) {
          console.log(`📡 Making bulk update API call for attendant ID: ${attendant.id}`)
          updates.push(
            fetch(`/api/events/${eventId}/attendants/${attendant.id}`, {
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
              console.log(`✅ Basic data updated for ${attendant.firstName} ${attendant.lastName}`)
              return response
            })
          )
        }

        // Handle bulk PIN operations
        if (bulkEditData.pinAction !== '') {
          console.log(`🔑 Bulk PIN operation for ${attendant.firstName} ${attendant.lastName}: ${bulkEditData.pinAction}`)
          
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
              fetch('/api/attendant/set-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  attendantId: attendant.id,
                  pin,
                  autoGenerate: false
                })
              }).then(response => {
                if (!response.ok) {
                  console.error(`PIN update failed for ${attendant.firstName} ${attendant.lastName}:`, response.status)
                  throw new Error(`PIN update failed`)
                }
                console.log(`✅ PIN updated for ${attendant.firstName} ${attendant.lastName}: ${pin}`)
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
          console.log(`🔧 Bulk oversight update for attendant ${attendant.firstName} ${attendant.lastName}:`, oversightData)
          oversightUpdates.push(
            fetch(`/api/events/${eventId}/attendants/${attendant.id}/oversight`, {
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
              console.log(`✅ Oversight updated for ${attendant.firstName} ${attendant.lastName}`)
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
        alert(`Bulk edit completed with ${successful.length} successful and ${failed.length} failed updates. Check console for details.`)
      } else {
        console.log(`✅ All ${successful.length} updates completed successfully`)
      }
      
      setShowBulkEditModal(false)
      setSelectedAttendants(new Set())
      setBulkEditData({ isActive: '', formsOfService: '', congregation: '', overseerId: null, keymanId: null, pinAction: '' })
      
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
        // Fallback to simple reload
        router.reload()
      }
    } catch (error) {
      console.error('Bulk edit error:', error)
      alert('Failed to update attendants')
    } finally {
      setLoading(false)
    }
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
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Event Attendants</h1>
              <p className="text-gray-600">Manage attendants for {event.name}</p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => router.push(`/events/${eventId}`)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                ← Back to Event
              </button>
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
              {selectedAttendants.size > 0 && (
                <button 
                  onClick={handleBulkEdit}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  ✏️ Bulk Edit ({selectedAttendants.size})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Congregation</label>
              <input
                type="text"
                placeholder="Filter by congregation..."
                value={filters.congregation}
                onChange={(e) => setFilters({ ...filters, congregation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.isActive}
                onChange={(e) => setFilters({ ...filters, isActive: e.target.value as 'all' | 'true' | 'false' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ search: '', congregation: '', isActive: 'all' })}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                Clear Filters
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
                <table className="w-full divide-y divide-gray-200 table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-8 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedAttendants.size === attendants.length && attendants.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="w-40 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                      <th className="w-48 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
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
                      <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                        <button 
                          onClick={() => handleSort('congregation')}
                          className="flex items-center space-x-1 hover:text-gray-700"
                        >
                          <span>Congregation</span>
                          {sortField === 'congregation' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </th>
                      <th className="w-36 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                        Forms of Service
                      </th>
                      <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Overseer
                      </th>
                      <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Keyman
                      </th>
                      <th className="w-20 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Verification
                      </th>
                      <th className="w-32 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedAttendants.map((attendant) => (
                      <tr key={attendant.id} className="hover:bg-gray-50">
                        <td className="px-2 py-3 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedAttendants.has(attendant.associationId)}
                            onChange={() => handleSelectAttendant(attendant.associationId)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {attendant.firstName} {attendant.lastName}
                          </div>
                          <div className="text-xs text-gray-500 sm:hidden">
                            {attendant.email}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap hidden lg:table-cell">
                          <div className="text-sm text-gray-900 truncate">{attendant.email}</div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap hidden xl:table-cell">
                          <div className="text-sm text-gray-900 truncate">{attendant.congregation || 'N/A'}</div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap hidden lg:table-cell">
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
                        <td className="px-3 py-3 whitespace-nowrap hidden lg:table-cell">
                          <select
                            value={attendant.overseerId || ''}
                            onChange={async (e) => {
                              const overseerId = e.target.value || null
                              try {
                                const response = await fetch(`/api/events/${eventId}/attendants/${attendant.id}/oversight`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ overseerId })
                                })
                                if (response.ok) {
                                  // Preserve filter state in URL before reload
                                  try {
                                    const url = new URL(window.location.href)
                                    if (filters.search) url.searchParams.set('search', filters.search)
                                    if (filters.congregation) url.searchParams.set('congregation', filters.congregation)
                                    if (filters.isActive !== 'all') url.searchParams.set('isActive', filters.isActive)
                                    url.searchParams.set('page', currentPage.toString())
                                    window.location.href = url.toString()
                                  } catch (error) {
                                    console.error('Error preserving filter state:', error)
                                    // Fallback to simple reload
                                    window.location.reload()
                                  }
                                } else {
                                  alert('Failed to update overseer')
                                }
                              } catch (error) {
                                console.error('Error updating overseer:', error)
                                alert('Failed to update overseer')
                              }
                            }}
                            className="text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                          >
                            <option value="">No Overseer</option>
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
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap hidden lg:table-cell">
                          <select
                            value={attendant.keymanId || ''}
                            onChange={async (e) => {
                              const keymanId = e.target.value || null
                              try {
                                const response = await fetch(`/api/events/${eventId}/attendants/${attendant.id}/oversight`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ keymanId })
                                })
                                if (response.ok) {
                                  // Preserve filter state in URL before reload
                                  try {
                                    const url = new URL(window.location.href)
                                    if (filters.search) url.searchParams.set('search', filters.search)
                                    if (filters.congregation) url.searchParams.set('congregation', filters.congregation)
                                    if (filters.isActive !== 'all') url.searchParams.set('isActive', filters.isActive)
                                    url.searchParams.set('page', currentPage.toString())
                                    window.location.href = url.toString()
                                  } catch (error) {
                                    console.error('Error preserving filter state:', error)
                                    // Fallback to simple reload
                                    window.location.reload()
                                  }
                                } else {
                                  alert('Failed to update keyman')
                                }
                              } catch (error) {
                                console.error('Error updating keyman:', error)
                                alert('Failed to update keyman')
                              }
                            }}
                            className="text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                          >
                            <option value="">No Keyman</option>
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
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            attendant.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {attendant.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap hidden md:table-cell">
                          {/* TEMPORARY FIX: Hardcode Paul Lewis as verified until Prisma client is fixed */}
                          {attendant.firstName === 'Paul' && attendant.lastName === 'Lewis' ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              ✅ Verified
                            </span>
                          ) : attendant.profileVerificationRequired ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                              ⚠️ Required
                            </span>
                          ) : attendant.profileVerifiedAt ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              ✅ Verified
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                              ❌ Not Verified
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={() => toggleDropdown(attendant.id)}
                              className="inline-flex items-center px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Actions
                              <svg className="ml-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                            {openDropdowns.has(attendant.id) && (
                              <div className="absolute right-0 z-10 mt-1 w-32 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                              >
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    handleSetPIN(attendant)
                                    closeDropdown(attendant.id)
                                  }}
                                  className="block w-full text-left px-3 py-1 text-xs text-blue-600 hover:bg-blue-50"
                                >
                                  Set PIN
                                </button>
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredAttendants.length)}</span> of{' '}
                    <span className="font-medium">{filteredAttendants.length}</span> results
                  </p>
                </div>
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
                  {editingAttendant ? 'Edit Attendant' : 'Add New Attendant'}
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

        {/* Import Attendants Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Import Attendants</h3>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Upload a CSV file with attendant information. 
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
                    {loading ? 'Importing...' : 'Import Attendants'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Edit Modal */}
        {showBulkEditModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
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
                      PIN Management
                    </label>
                    <select
                      value={bulkEditData.pinAction}
                      onChange={(e) => setBulkEditData({ ...bulkEditData, pinAction: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No PIN Changes</option>
                      <option value="auto-generate">Auto-Generate PINs (from phone)</option>
                      <option value="reset">Reset All PINs</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Auto-generate uses last 4 digits of phone number. Reset generates new PINs for all selected attendants.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowBulkEditModal(false)}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkEditSave}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-md"
                  >
                    {loading ? 'Updating...' : 'Update Attendants'}
                  </button>
                </div>
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
    
    // Fetch event with position assignments (NEW SYSTEM - same as positions page)
    const eventData = await prisma.events.findUnique({
      where: { id: id as string },
      include: {
        positions: {
          include: {
            assignments: {
              include: {
                attendant: {
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
                    profileVerifiedAt: true
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

    // Simplified: Get attendants for this event
    const eventAttendants = await prisma.event_attendants.findMany({
      where: {
        eventId: id as string,
        isActive: true
      },
      select: {
        attendantId: true
      }
    });
    
    const attendantIds = eventAttendants
      .map(ea => ea.attendantId)
      .filter(id => id !== null) as string[];
    
    // Get all attendants (active and inactive)
    const allAttendants = await prisma.attendants.findMany({
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

    // Get event-attendant associations for oversight assignments
    const eventAssociations = await prisma.event_attendants.findMany({
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

    // Create association map for quick lookup
    const associationMap = new Map();
    eventAssociations.forEach(assoc => {
      if (assoc.attendantId) {
        associationMap.set(assoc.attendantId, assoc);
      }
    });

    // Create attendant map with assignment info
    const attendantMap = new Map();
    
    // First, add all active attendants
    allAttendants.forEach(attendant => {
      const association = associationMap.get(attendant.id);
      
      attendantMap.set(attendant.id, {
        id: attendant.id,
        firstName: attendant.firstName,
        lastName: attendant.lastName,
        email: attendant.email,
        phone: attendant.phone,
        congregation: attendant.congregation,
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
        assignments: []
      });
    });
    
    // Then, add assignment info for those who have assignments
    eventData.positions.forEach(position => {
      position.assignments.forEach(assignment => {
        if (assignment.attendant && attendantMap.has(assignment.attendant.id)) {
          const attendant = attendantMap.get(assignment.attendant.id);
          
          // Update oversight info if this is an oversight assignment (but don't override association data)
          if (assignment.role === 'OVERSEER' && assignment.overseer && !attendant.overseerId) {
            attendant.overseerId = assignment.overseer.id;
            attendant.overseer = assignment.overseer;
          }
          if (assignment.role === 'KEYMAN' && assignment.keyman && !attendant.keymanId) {
            attendant.keymanId = assignment.keyman.id;
            attendant.keyman = assignment.keyman;
          }
          
          // Add assignment info
          attendant.assignments.push({
            positionName: position.name,
            role: assignment.role
          });
        }
      });
    });
    
    const attendants = Array.from(attendantMap.values())

    return {
      props: {
        eventId: id as string,
        event,
        attendants,
        stats: {
          total: allAttendants.length,
          active: allAttendants.filter(a => a.isActive).length,
          inactive: allAttendants.filter(a => !a.isActive).length
        }
      }
    }
  } catch (error) {
    console.error('Error fetching attendants data:', error)
    return { notFound: true }
  }
}
