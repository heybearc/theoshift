import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useScrollRestoration } from '../../hooks/useScrollRestoration'
import EditVolunteerModal from '../EditVolunteerModal'
import BulkActionModal from '../BulkActionModal'
import ImportModal from '../ImportModal'
import ExportModal from '../ExportModal'
import AddIvsVolunteerModal from '../AddIvsVolunteerModal'
import { ConventionDay } from '@prisma/client'
import { IVS_APPROVAL_STATUSES } from '@/lib/ivs'
import {
  CONVENTION_DAYS,
  EarlyEntrySchedule,
  formatEarlyEntrySummary,
  hasAnyEarlyEligibility,
  isCheckedInForDay,
} from '@/lib/ivsEarlyCheckin'
import { EarlyEntryDayControls } from './EarlyEntryDayControls'
import IvsDepartmentContactsPanel from './IvsDepartmentContactsPanel'
import { notifyAlert, toast } from '../../lib/ui/toast'
import { appConfirm, appConfirmMessage } from '../../lib/ui/confirm'

interface IVSVolunteer {
  id: string
  firstName: string
  lastName: string
  congregation: string
  email?: string
  phone?: string
  approvalStatus: string
  submittedBy: string
  requestRound: number
  approvedAt?: string
  approvedBy?: string
  notes?: string
  earlyEntry: EarlyEntrySchedule
  checkIns: Partial<Record<ConventionDay, { checkedInAt: string; checkedInBy: string | null }>>
  earlyCheckinEligible?: boolean
}

interface IVSApprovalsContentProps {
  event: any
  canEdit: boolean
}

export default function IVSApprovalsContent({ event, canEdit }: IVSApprovalsContentProps) {
  const router = useRouter()
  const selectionAnchorIndexRef = useRef<number | null>(null)
  const shiftClickRef = useRef(false)
  const eventId = event.id
  const [volunteers, setVolunteers] = useState<IVSVolunteer[]>([])
  const [loading, setLoading] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterRound, setFilterRound] = useState('')
  const [filterCongregation, setFilterCongregation] = useState('')
  const [filterEarlyEntry, setFilterEarlyEntry] = useState<'all' | 'eligible' | 'none'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [departments, setDepartments] = useState<string[]>([])
  const [rounds, setRounds] = useState<number[]>([])
  const [congregations, setCongregations] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [sortField, setSortField] = useState<keyof IVSVolunteer | 'earlyEntry'>('lastName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingVolunteer, setEditingVolunteer] = useState<IVSVolunteer | null>(null)
  const [selectedVolunteers, setSelectedVolunteers] = useState<Set<string>>(new Set())
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkAction, setBulkAction] = useState('')
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [updatingEarlyEntryId, setUpdatingEarlyEntryId] = useState<string | null>(null)

  useEffect(() => {
    fetchVolunteers()
  }, [])

  useScrollRestoration(`${router.asPath}:ivs-approvals`, !loading)

  const fetchVolunteers = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const response = await fetch(`/api/events/${eventId}/ivs/volunteers`)
      if (response.ok) {
        const data = await response.json()
        setVolunteers(data.volunteers || [])
        
        const depts = [...new Set(data.volunteers.map((v: IVSVolunteer) => v.submittedBy).filter(Boolean))]
        const rnds = [...new Set(data.volunteers.map((v: IVSVolunteer) => v.requestRound).filter(Boolean))]
        const congs = [...new Set(data.volunteers.map((v: IVSVolunteer) => v.congregation).filter(Boolean))]
        setDepartments(depts as string[])
        setRounds(rnds.sort() as number[])
        setCongregations(congs.sort() as string[])
      }
    } catch (error) {
      console.error('Error fetching volunteers:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const handleAddVolunteer = async (payload: {
    firstName: string
    lastName: string
    congregation: string
    email: string
    phone: string
    requestRound: number
    departmentName?: string
  }) => {
    try {
      const response = await fetch(`/api/events/${eventId}/ivs/volunteers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))
      if (response.ok) {
        setShowAddModal(false)
        fetchVolunteers(true)
      } else if (response.status === 409) {
        notifyAlert(result.message || 'This volunteer is already on the event roster.')
      } else {
        notifyAlert(result.message || 'Failed to add volunteer')
      }
    } catch (error) {
      console.error('Error adding volunteer:', error)
      notifyAlert('Error adding volunteer')
    }
  }

  const handleImport = async (file: File, requestRound: number, departmentName?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('requestRound', requestRound.toString())
    if (departmentName) {
      formData.append('departmentName', departmentName)
    }

    try {
      const response = await fetch(`/api/events/${eventId}/ivs/import`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        const parts = [`imported ${result.imported || 0}`]
        if (result.updated) parts.push(`updated ${result.updated}`)
        if (result.errors?.length) parts.push(`${result.errors.length} error(s)`)
        notifyAlert(`Import complete: ${parts.join(', ')}`)
        setShowImportModal(false)
        fetchVolunteers(true)
      } else {
        const error = await response.json()
        notifyAlert(`Import failed: ${error.message}`)
      }
    } catch (error) {
      console.error('Error importing:', error)
      notifyAlert('Error importing volunteers')
    }
  }

  const handleExport = async (departmentName?: string, requestRound?: number) => {
    try {
      const response = await fetch(`/api/events/${eventId}/ivs/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentName: departmentName || undefined,
          requestRound: requestRound != null ? String(requestRound) : undefined,
          format: 'xlsx',
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ivs-volunteers-${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setShowExportModal(false)
      } else {
        let msg = 'Export failed'
        try {
          const err = await response.json()
          if (err?.message) msg = err.message
        } catch {
          /* ignore */
        }
        notifyAlert(msg)
      }
    } catch (error) {
      console.error('Error exporting:', error)
      notifyAlert('Error exporting volunteers')
    }
  }

  const handleClearAll = async () => {
    if (!(await appConfirmMessage('Are you sure you want to clear all IVS volunteers? This cannot be undone.'))) return

    try {
      const response = await fetch(`/api/events/${eventId}/ivs/volunteers`, {
        method: 'DELETE',
      })

      if (response.ok) {
        notifyAlert('All volunteers cleared successfully')
        fetchVolunteers(true)
      } else {
        notifyAlert('Failed to clear volunteers')
      }
    } catch (error) {
      console.error('Error clearing volunteers:', error)
      notifyAlert('Error clearing volunteers')
    }
  }

  const handleUpdateEarlyEntry = async (
    volunteerId: string,
    schedule: EarlyEntrySchedule,
    previous: EarlyEntrySchedule,
    checkIns: IVSVolunteer['checkIns'],
  ) => {
    const removedWithCheckIn = CONVENTION_DAYS.filter((day) => {
      const key = day === ConventionDay.FRIDAY ? 'friday' : day === ConventionDay.SATURDAY ? 'saturday' : 'sunday'
      return previous[key] && !schedule[key] && isCheckedInForDay(checkIns, day)
    })

    if (removedWithCheckIn.length > 0) {
      const ok = await appConfirmMessage(
        `Removing early entry for ${removedWithCheckIn.join(', ')} will also clear check-in record(s) for those day(s). Continue?`,
      )
      if (!ok) return
    }

    try {
      setUpdatingEarlyEntryId(volunteerId)
      const response = await fetch(`/api/events/${eventId}/ivs/volunteers/${volunteerId}/early-entry`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          earlyEntry: schedule,
          clearCheckInsWhenRemovingEligibility: true,
        }),
      })

      if (response.ok) {
        setVolunteers((prev) =>
          prev.map((v) =>
            v.id === volunteerId
              ? {
                  ...v,
                  earlyEntry: schedule,
                  earlyCheckinEligible: schedule.friday || schedule.saturday || schedule.sunday,
                }
              : v,
          ),
        )
        fetchVolunteers(true)
      } else {
        const data = await response.json()
        notifyAlert(data.message || 'Failed to update early entry')
      }
    } catch (error) {
      console.error('Error updating early entry:', error)
      notifyAlert('Error updating early entry')
    } finally {
      setUpdatingEarlyEntryId(null)
    }
  }

  const handleQuickStatusUpdate = async (volunteerId: string, status: string) => {
    try {
      setUpdatingStatusId(volunteerId)
      const response = await fetch(`/api/events/${eventId}/ivs/volunteers/${volunteerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ivsApprovalStatus: status }),
      })

      if (response.ok) {
        setVolunteers((prev) =>
          prev.map((v) => (v.id === volunteerId ? { ...v, approvalStatus: status } : v)),
        )
        fetchVolunteers(true)
      } else {
        const data = await response.json()
        notifyAlert(data.message || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      notifyAlert('Error updating status')
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const handleBulkAction = (action: string) => {
    if (selectedVolunteers.size === 0) {
      notifyAlert('Please select at least one volunteer')
      return
    }
    setBulkAction(action)
    setShowBulkModal(true)
  }

  const handleBulkConfirm = async (data: any) => {
    try {
      const response = await fetch(`/api/events/${eventId}/ivs/volunteers/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volunteerIds: Array.from(selectedVolunteers),
          ...data
        }),
      })

      if (response.ok) {
        const result = await response.json()
        notifyAlert(`Successfully updated ${result.updated} volunteer(s)`)
        setShowBulkModal(false)
        setBulkAction('')
        setSelectedVolunteers(new Set())
        fetchVolunteers(true)
      } else {
        const error = await response.json()
        notifyAlert(`Failed to update volunteers: ${error.message}`)
      }
    } catch (error) {
      console.error('Error with bulk action:', error)
      notifyAlert('Error performing bulk action')
    }
  }

  const handleDeleteVolunteer = async (volunteerId: string, name: string) => {
    if (!(await appConfirmMessage(`Delete ${name} from IVS Approvals? This cannot be undone.`))) return

    try {
      const response = await fetch(`/api/events/${eventId}/ivs/volunteers/${volunteerId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        notifyAlert('Volunteer deleted successfully')
        fetchVolunteers(true)
      } else {
        notifyAlert('Failed to delete volunteer')
      }
    } catch (error) {
      console.error('Error deleting volunteer:', error)
      notifyAlert('Error deleting volunteer')
    }
  }

  const handleSort = (field: keyof IVSVolunteer | 'earlyEntry') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      // Early entry: default desc so eligible rows surface first
      setSortDirection(field === 'earlyEntry' ? 'desc' : 'asc')
    }
  }

  const filteredVolunteers = volunteers.filter(v => {
    if (filterDepartment && v.submittedBy !== filterDepartment) return false
    if (filterStatus && v.approvalStatus !== filterStatus) return false
    if (filterRound && v.requestRound !== parseInt(filterRound)) return false
    if (filterCongregation && v.congregation !== filterCongregation) return false
    if (filterEarlyEntry === 'eligible' && !hasAnyEarlyEligibility(v.earlyEntry ?? { friday: false, saturday: false, sunday: false })) {
      return false
    }
    if (filterEarlyEntry === 'none' && hasAnyEarlyEligibility(v.earlyEntry ?? { friday: false, saturday: false, sunday: false })) {
      return false
    }
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const fullName = `${v.firstName} ${v.lastName}`.toLowerCase()
      const congregation = v.congregation.toLowerCase()
      const department = (v.submittedBy || '').toLowerCase()
      const email = (v.email || '').toLowerCase()
      const phone = (v.phone || '').toLowerCase()
      if (
        !fullName.includes(search) &&
        !congregation.includes(search) &&
        !department.includes(search) &&
        !email.includes(search) &&
        !phone.includes(search)
      )
        return false
    }
    return true
  })

  const earlyEntrySortKey = (v: IVSVolunteer) => {
    const schedule = v.earlyEntry ?? { friday: false, saturday: false, sunday: false }
    const days =
      (schedule.friday ? 1 : 0) + (schedule.saturday ? 1 : 0) + (schedule.sunday ? 1 : 0)
    // Eligible first when descending; secondary by day summary for stable grouping
    return { days, summary: formatEarlyEntrySummary(schedule).toLowerCase() }
  }

  const sortedVolunteers = [...filteredVolunteers].sort((a, b) => {
    if (sortField === 'earlyEntry') {
      const aKey = earlyEntrySortKey(a)
      const bKey = earlyEntrySortKey(b)
      if (aKey.days !== bKey.days) {
        return sortDirection === 'asc' ? aKey.days - bKey.days : bKey.days - aKey.days
      }
      if (aKey.summary < bKey.summary) return sortDirection === 'asc' ? -1 : 1
      if (aKey.summary > bKey.summary) return sortDirection === 'asc' ? 1 : -1
      return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
    }

    let aVal = a[sortField]
    let bVal = b[sortField]
    
    if (aVal === undefined || aVal === null) return 1
    if (bVal === undefined || bVal === null) return -1
    
    const aStr = String(aVal).toLowerCase()
    const bStr = String(bVal).toLowerCase()
    
    if (sortDirection === 'asc') {
      return aStr < bStr ? -1 : aStr > bStr ? 1 : 0
    } else {
      return aStr > bStr ? -1 : aStr < bStr ? 1 : 0
    }
  })

  const totalPages =
    itemsPerPage === -1 ? 1 : Math.ceil(sortedVolunteers.length / itemsPerPage) || 1
  const startIndex = itemsPerPage === -1 ? 0 : (currentPage - 1) * itemsPerPage
  const endIndex = itemsPerPage === -1 ? sortedVolunteers.length : startIndex + itemsPerPage
  const paginatedVolunteers =
    itemsPerPage === -1
      ? sortedVolunteers
      : sortedVolunteers.slice(startIndex, endIndex)

  const handleVolunteerCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    volunteerId: string,
    indexOnPage: number,
  ) => {
    const anchor = selectionAnchorIndexRef.current
    const shift = shiftClickRef.current
    shiftClickRef.current = false

    if (shift && anchor !== null) {
      const lo = Math.min(anchor, indexOnPage)
      const hi = Math.max(anchor, indexOnPage)
      const ids = paginatedVolunteers.slice(lo, hi + 1).map((v) => v.id)
      setSelectedVolunteers((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })
      selectionAnchorIndexRef.current = indexOnPage
      e.target.checked = true
      return
    }

    selectionAnchorIndexRef.current = indexOnPage
    const checked = e.target.checked
    setSelectedVolunteers((prev) => {
      const next = new Set(prev)
      if (checked) next.add(volunteerId)
      else next.delete(volunteerId)
      return next
    })
  }

  const handleVolunteerCheckboxShiftClick = (
    e: React.MouseEvent<HTMLInputElement>,
  ) => {
    shiftClickRef.current = e.shiftKey
  }

  const allPageSelected =
    paginatedVolunteers.length > 0 &&
    paginatedVolunteers.every((v) => selectedVolunteers.has(v.id))

  const handleSelectAll = () => {
    selectionAnchorIndexRef.current = null
    const pageIds = paginatedVolunteers.map((v) => v.id)
    const everyPageRowSelected =
      pageIds.length > 0 && pageIds.every((id) => selectedVolunteers.has(id))

    if (everyPageRowSelected) {
      setSelectedVolunteers((prev) => {
        const next = new Set(prev)
        pageIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedVolunteers((prev) => {
        const next = new Set(prev)
        pageIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleClearFilters = () => {
    setFilterDepartment('')
    setFilterStatus('')
    setFilterRound('')
    setFilterCongregation('')
    setFilterEarlyEntry('all')
    setSearchTerm('')
    setCurrentPage(1)
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800'
      case 'Not Approved': return 'bg-red-100 text-red-800'
      case 'Requested': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <>
      {/* Action Buttons */}
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-base font-medium"
            >
              Add volunteer
            </button>
          )}
          {canEdit && (
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-base font-medium"
          >
            Import Volunteers
          </button>
          )}
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-base font-medium"
          >
            Export List
          </button>
          {canEdit && volunteers.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-base font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        {selectedVolunteers.size > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:ml-auto sm:w-auto w-full">
            <span className="text-sm text-gray-600 sm:whitespace-nowrap">
              {selectedVolunteers.size} selected
            </span>
            <select
              aria-label="Bulk actions"
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkAction(e.target.value)
                  e.target.value = ''
                }
              }}
              className="w-full sm:w-auto min-h-[44px] px-3 py-2 border rounded-md bg-purple-600 text-white hover:bg-purple-700 text-base"
            >
              <option value="">Bulk actions</option>
              <option value="setStatus">Set status…</option>
              <option value="setEarlyEntry">Set early entry…</option>
              <option value="changeRound">Change round…</option>
              <option value="changeDepartment">Change department name…</option>
              <option value="changeCongregation">Change congregation name…</option>
            </select>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="search"
          enterKeyHint="search"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          placeholder="Search by name, congregation, department, email, or phone..."
          className="w-full min-h-[44px] px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
        />
      </div>

      {canEdit && (
        <div className="mb-4">
          <IvsDepartmentContactsPanel
            eventId={eventId}
            canEdit={canEdit}
            mode="manage"
            initialDepartment={filterDepartment}
          />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <select
          value={filterDepartment}
          onChange={(e) => { setFilterDepartment(e.target.value); setCurrentPage(1); }}
          className="w-full min-w-0 min-h-[44px] px-3 py-2 border rounded-md text-base"
        >
          <option value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          className="w-full min-w-0 min-h-[44px] px-3 py-2 border rounded-md text-base"
        >
          <option value="">All Statuses</option>
          {IVS_APPROVAL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={filterRound}
          onChange={(e) => { setFilterRound(e.target.value); setCurrentPage(1); }}
          className="w-full min-w-0 min-h-[44px] px-3 py-2 border rounded-md text-base"
        >
          <option value="">All Rounds</option>
          {rounds.map(round => (
            <option key={round} value={round}>Request {round}</option>
          ))}
        </select>

        <select
          value={filterCongregation}
          onChange={(e) => { setFilterCongregation(e.target.value); setCurrentPage(1); }}
          className="w-full min-w-0 min-h-[44px] px-3 py-2 border rounded-md text-base"
        >
          <option value="">All Congregations</option>
          {congregations.map(cong => (
            <option key={cong} value={cong}>{cong}</option>
          ))}
        </select>

        <select
          value={filterEarlyEntry}
          onChange={(e) => {
            setFilterEarlyEntry(e.target.value as 'all' | 'eligible' | 'none')
            setCurrentPage(1)
          }}
          className="w-full min-w-0 min-h-[44px] px-3 py-2 border rounded-md text-base"
          aria-label="Filter by early entry"
        >
          <option value="all">Early entry: All</option>
          <option value="eligible">Early entry: Eligible</option>
          <option value="none">Early entry: None</option>
        </select>

        {(filterDepartment || filterStatus || filterRound || filterCongregation || filterEarlyEntry !== 'all' || searchTerm) && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="min-h-[44px] px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-md sm:col-span-2 lg:col-span-5"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Results Summary + page size (always visible when there are results) */}
      {!loading && sortedVolunteers.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
          <div>
            Showing{' '}
            {itemsPerPage === -1 ? (
              <>
                all {sortedVolunteers.length} volunteer{sortedVolunteers.length !== 1 ? 's' : ''}
              </>
            ) : (
              <>
                {startIndex + 1}-{Math.min(endIndex, sortedVolunteers.length)} of {sortedVolunteers.length}{' '}
                volunteer{sortedVolunteers.length !== 1 ? 's' : ''}
              </>
            )}
            {sortedVolunteers.length !== volunteers.length && ` (filtered from ${volunteers.length} total)`}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="ivs-approvals-page-size" className="text-gray-700 whitespace-nowrap">
              Per page:
            </label>
            <select
              id="ivs-approvals-page-size"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value, 10))
                setCurrentPage(1)
              }}
              className="min-h-[44px] sm:min-h-0 border border-gray-300 rounded-md px-2 py-2 sm:py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={-1}>All</option>
            </select>
          </div>
        </div>
      )}

      {/* Volunteers Table */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : sortedVolunteers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {volunteers.length === 0 
            ? 'No volunteers yet. Use Add volunteer or Import Volunteers to get started.'
            : 'No volunteers match your search or filters.'}
        </div>
      ) : (
        <>
          {/* Mobile: card list (readable without horizontal scroll) */}
          <div className="md:hidden space-y-3">
            <label className="flex items-center gap-3 min-h-[44px] px-1 text-sm text-gray-700 border-b border-gray-200 pb-2">
              <input
                type="checkbox"
                checked={allPageSelected}
                onChange={handleSelectAll}
                className="h-5 w-5 shrink-0 cursor-pointer"
              />
              <span>Select all on this page ({paginatedVolunteers.length})</span>
            </label>
            {paginatedVolunteers.map((volunteer, index) => (
              <div
                key={volunteer.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3"
              >
                <div className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={selectedVolunteers.has(volunteer.id)}
                    onChange={(e) => handleVolunteerCheckboxChange(e, volunteer.id, index)}
                    onClick={(e) => handleVolunteerCheckboxShiftClick(e)}
                    className="mt-1 h-5 w-5 shrink-0 cursor-pointer"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="font-semibold text-base break-words">
                      {volunteer.firstName} {volunteer.lastName}
                    </div>
                    <div className="text-sm text-gray-600 break-words">{volunteer.congregation}</div>
                    {(volunteer.email || volunteer.phone) && (
                      <div className="text-sm text-gray-600 break-words space-y-0.5">
                        {volunteer.email ? <div>{volunteer.email}</div> : null}
                        {volunteer.phone ? <div>{volunteer.phone}</div> : null}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      {volunteer.submittedBy || '—'} · Request {volunteer.requestRound}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-gray-500">Status</span>
                  <select
                    value={volunteer.approvalStatus}
                    disabled={updatingStatusId === volunteer.id}
                    onChange={(e) => handleQuickStatusUpdate(volunteer.id, e.target.value)}
                    className={`mt-1 w-full min-h-[44px] rounded border px-2 py-2 text-sm font-semibold ${getStatusBadgeColor(volunteer.approvalStatus)}`}
                  >
                    {IVS_APPROVAL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {updatingStatusId === volunteer.id && (
                    <span className="mt-1 block text-xs text-gray-500">Saving...</span>
                  )}
                </div>

                <div className={updatingEarlyEntryId === volunteer.id ? 'opacity-60 pointer-events-none' : ''}>
                  <p className="text-xs font-medium text-gray-600 mb-1">Early entry</p>
                  <EarlyEntryDayControls
                    compact
                    schedule={
                      volunteer.earlyEntry ?? {
                        friday: false,
                        saturday: false,
                        sunday: false,
                      }
                    }
                    checkIns={volunteer.checkIns}
                    disabled={!canEdit || updatingEarlyEntryId === volunteer.id}
                    onChange={(schedule) =>
                      handleUpdateEarlyEntry(
                        volunteer.id,
                        schedule,
                        volunteer.earlyEntry ?? {
                          friday: false,
                          saturday: false,
                          sunday: false,
                        },
                        volunteer.checkIns ?? {},
                      )
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingVolunteer(volunteer)
                      setShowEditModal(true)
                    }}
                    className="min-h-[44px] rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteVolunteer(volunteer.id, `${volunteer.firstName} ${volunteer.lastName}`)
                    }
                    className="min-h-[44px] rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: full table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 border">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={handleSelectAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th
                    className="px-4 py-2 border text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('lastName')}
                  >
                    Name {sortField === 'lastName' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-2 border text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('congregation')}
                  >
                    Congregation {sortField === 'congregation' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 border text-left">Email</th>
                  <th className="px-4 py-2 border text-left">Phone</th>
                  <th
                    className="px-4 py-2 border text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('submittedBy')}
                  >
                    Department {sortField === 'submittedBy' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-2 border text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('requestRound')}
                  >
                    Round {sortField === 'requestRound' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-2 border text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('approvalStatus')}
                  >
                    Status {sortField === 'approvalStatus' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-2 border text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('earlyEntry')}
                  >
                    Early Entry {sortField === 'earlyEntry' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 border text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVolunteers.map((volunteer, index) => (
                  <tr key={volunteer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">
                      <input
                        type="checkbox"
                        checked={selectedVolunteers.has(volunteer.id)}
                        onChange={(e) => handleVolunteerCheckboxChange(e, volunteer.id, index)}
                        onClick={(e) => handleVolunteerCheckboxShiftClick(e)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-2 border">
                      {volunteer.firstName} {volunteer.lastName}
                    </td>
                    <td className="px-4 py-2 border">{volunteer.congregation}</td>
                    <td className="px-4 py-2 border text-sm break-all">{volunteer.email || '—'}</td>
                    <td className="px-4 py-2 border text-sm whitespace-nowrap">{volunteer.phone || '—'}</td>
                    <td className="px-4 py-2 border">{volunteer.submittedBy}</td>
                    <td className="px-4 py-2 border">Request {volunteer.requestRound}</td>
                    <td className="px-4 py-2 border">
                      <div className="flex items-center gap-2">
                        <select
                          value={volunteer.approvalStatus}
                          disabled={updatingStatusId === volunteer.id}
                          onChange={(e) => handleQuickStatusUpdate(volunteer.id, e.target.value)}
                          className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusBadgeColor(volunteer.approvalStatus)}`}
                        >
                          {IVS_APPROVAL_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        {updatingStatusId === volunteer.id && (
                          <span className="text-xs text-gray-500">Saving...</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 border text-center min-w-[200px]">
                      <EarlyEntryDayControls
                        compact
                        schedule={
                          volunteer.earlyEntry ?? {
                            friday: false,
                            saturday: false,
                            sunday: false,
                          }
                        }
                        checkIns={volunteer.checkIns}
                        disabled={!canEdit || updatingEarlyEntryId === volunteer.id}
                        onChange={(schedule) =>
                          handleUpdateEarlyEntry(
                            volunteer.id,
                            schedule,
                            volunteer.earlyEntry ?? {
                              friday: false,
                              saturday: false,
                              sunday: false,
                            },
                            volunteer.checkIns ?? {},
                          )
                        }
                      />
                    </td>
                    <td className="px-4 py-2 border">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVolunteer(volunteer)
                            setShowEditModal(true)
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteVolunteer(
                              volunteer.id,
                              `${volunteer.firstName} ${volunteer.lastName}`
                            )
                          }
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {itemsPerPage !== -1 && totalPages > 1 && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="min-h-[40px] px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  First
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="min-h-[40px] px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="min-h-[40px] px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="min-h-[40px] px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Last
                </button>
              </div>

              <div className="text-center text-sm text-gray-600 sm:text-left">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add single volunteer */}
      {showAddModal && (
        <AddIvsVolunteerModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddVolunteer}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          eventId={eventId}
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          departments={departments}
          rounds={rounds}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingVolunteer && (
        <EditVolunteerModal
          volunteer={editingVolunteer}
          onClose={() => {
            setShowEditModal(false)
            setEditingVolunteer(null)
          }}
          onSave={async (data) => {
            try {
              const response = await fetch(`/api/events/${eventId}/ivs/volunteers/${editingVolunteer.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              })

              if (response.ok) {
                notifyAlert('Volunteer updated successfully!')
                setShowEditModal(false)
                setEditingVolunteer(null)
                fetchVolunteers(true)
              } else {
                notifyAlert('Failed to update volunteer')
              }
            } catch (error) {
              console.error('Error updating volunteer:', error)
              notifyAlert('Error updating volunteer')
            }
          }}
        />
      )}

      {/* Bulk Action Modal */}
      {showBulkModal && (
        <BulkActionModal
          action={bulkAction}
          selectedCount={selectedVolunteers.size}
          onClose={() => {
            setShowBulkModal(false)
            setBulkAction('')
          }}
          onConfirm={handleBulkConfirm}
        />
      )}
    </>
  )
}
