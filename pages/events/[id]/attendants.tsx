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
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)
  const [editingAttendant, setEditingAttendant] = useState<Attendant | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [selectedAttendants, setSelectedAttendants] = useState<Set<string>>(new Set())
  const [bulkEditData, setBulkEditData] = useState({
    isActive: '',
    congregation: '',
    formsOfService: ''
  })
  const [filters, setFilters] = useState({
    search: '',
    congregation: '',
    isActive: 'all'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [loading, setLoading] = useState(false)
  const [importResults, setImportResults] = useState<any>(null)
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
      for (const associationId of selectedAttendants) {
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

        if (Object.keys(updateData).length > 0) {
          updates.push(
            fetch(`/api/events/${eventId}/attendants/${associationId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateData)
            })
          )
        }
      }

      await Promise.all(updates)
      setShowBulkEditModal(false)
      setSelectedAttendants(new Set())
      setBulkEditData({ isActive: '', formsOfService: '', congregation: '' })
      router.reload()
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Event Attendants</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage attendants for {event.name}
              </p>
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
                        <input
                          type="checkbox"
                          checked={selectedAttendants.size === attendants.length && attendants.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
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
                          <input
                            type="checkbox"
                            checked={selectedAttendants.has(attendant.associationId)}
                            onChange={() => handleSelectAttendant(attendant.associationId)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
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
