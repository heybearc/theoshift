import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import {
  countShiftAssignments,
  getShiftVolunteersNeeded,
} from '../../lib/shiftCapacity'
import { formatEventDayLabel } from '../../lib/eventDates'
import { toDateKey } from '../../lib/shiftConflict'
import { sortShiftsByTime } from '../../lib/shiftSort'
import { createPositionService } from '../../lib/positionService'
import { AutoAssignmentEngine } from '../../lib/autoAssignmentEngine'
import { notifyAlert, toast } from '../../lib/ui/toast'
import { appConfirm } from '../../lib/ui/confirm'
import {
  abortEventBulkEmail,
  formatBulkEmailConfirmMessage,
} from '../../lib/bulkEmailClient'
import { useExport } from '../../hooks/useExport'
import ShiftInlineEditor from '../ShiftInlineEditor'
import CreatePositionModal from '../CreatePositionModal'
import BulkPositionCreator from '../positions/BulkPositionCreator'
import DayBoardAssignModal from './DayBoardAssignModal'
import DayBoardAddShiftModal from './DayBoardAddShiftModal'
import DayBoardOversightModal from './DayBoardOversightModal'
import DayBoardApplyTemplateModal from './DayBoardApplyTemplateModal'
import DayBoardBulkModal from './DayBoardBulkModal'
import DayBoardAvailableModal from './DayBoardAvailableModal'
import { listUnassignedVolunteers } from './unassignedVolunteers'
import {
  type AssignTarget,
  type DayKey,
  type Position,
  type Shift,
  type Volunteer,
  personName,
  positionDisplayName,
  shiftLabel,
} from './types'

type Props = {
  eventId: string
  eventName: string
  eventStart: string | null
  eventEnd: string | null
  positions: Position[]
  attendants: Volunteer[]
  canManageContent: boolean
  eventDateKeys: string[]
}

type StationGroup = {
  position: Position
  shifts: Shift[]
  filled: number
  needed: number
}

export default function PositionsDayBoard({
  eventId,
  eventName,
  positions,
  attendants,
  canManageContent,
  eventDateKeys,
}: Props) {
  const router = useRouter()
  const positionService = useMemo(() => createPositionService(eventId), [eventId])
  const [activeDay, setActiveDay] = useState<DayKey>(
    eventDateKeys[0] || 'undated'
  )
  const [search, setSearch] = useState('')
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null)
  const [editingShiftKey, setEditingShiftKey] = useState<string | null>(null)
  const [savingShiftKey, setSavingShiftKey] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [underfilledOnly, setUnderfilledOnly] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [selectedUndated, setSelectedUndated] = useState<Set<string>>(new Set())
  const [bulkDay, setBulkDay] = useState(eventDateKeys[0] || '')
  const [settingDayKey, setSettingDayKey] = useState<string | null>(null)
  const [bulkSettingDay, setBulkSettingDay] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPosition, setEditingPosition] = useState<Position | null>(null)
  const [createForm, setCreateForm] = useState({
    positionNumber: 1,
    name: '',
    area: '',
    description: '',
  })
  const [creatingPosition, setCreatingPosition] = useState(false)
  const [addShiftPosition, setAddShiftPosition] = useState<Position | null>(null)
  const [savingNewShift, setSavingNewShift] = useState(false)
  const [notifySending, setNotifySending] = useState(false)
  const [notifyJobActive, setNotifyJobActive] = useState(false)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [oversightPosition, setOversightPosition] = useState<Position | null>(
    null
  )
  const [showBulkCreator, setShowBulkCreator] = useState(false)
  const [showApplyTemplate, setShowApplyTemplate] = useState(false)
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set())
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [showAvailable, setShowAvailable] = useState(false)
  const [overseerFilter, setOverseerFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState<
    'all' | 'overseers' | 'assistants' | 'keymen'
  >('all')
  const [bulkWorking, setBulkWorking] = useState(false)
  /** Manual expand overrides; absent key = default (open if underfilled). */
  const [expandOverride, setExpandOverride] = useState<Record<string, boolean>>(
    {}
  )

  useEffect(() => {
    setExpandOverride({})
  }, [activeDay])

  const undatedShiftCount = useMemo(() => {
    let n = 0
    for (const p of positions) {
      for (const s of p.shifts || []) {
        if (!toDateKey(s.shiftDate)) n++
      }
    }
    return n
  }, [positions])

  const dayTabs: DayKey[] = useMemo(() => {
    const keys = [...eventDateKeys]
    if (undatedShiftCount > 0 || keys.length === 0) keys.push('undated')
    return keys
  }, [eventDateKeys, undatedShiftCount])

  const overseerOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const position of positions) {
      const overseer = position.oversight?.[0]?.overseer
      if (!overseer) continue
      seen.set(overseer.id, `${overseer.firstName} ${overseer.lastName}`)
    }
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [positions])

  const availableVolunteers = useMemo(
    () => listUnassignedVolunteers(positions, attendants),
    [positions, attendants]
  )

  const filteredPositions = useMemo(() => {
    const q = search.trim().toLowerCase()
    return positions.filter((p) => {
      if (!p.isActive && !showInactive) return false
      if (
        overseerFilter !== 'all' &&
        !p.oversight?.some((o) => o.overseer?.id === overseerFilter)
      ) {
        return false
      }
      if (roleFilter === 'overseers') {
        const has = (p.assignments || []).some((a) => a.role === 'OVERSEER')
        if (!has) return false
      } else if (roleFilter === 'keymen') {
        const has = (p.assignments || []).some((a) => a.role === 'KEYMAN')
        if (!has) return false
      } else if (roleFilter === 'assistants') {
        const has = (p.assignments || []).some(
          (a) =>
            (a.role === 'VOLUNTEER' || a.role === 'ATTENDANT') &&
            a.volunteer?.user?.role === 'ASSISTANT_OVERSEER'
        )
        if (!has) return false
      }
      if (!q) return true
      const name = (p.name || p.positionName || '').toLowerCase()
      const area = (p.area || '').toLowerCase()
      return (
        name.includes(q) ||
        area.includes(q) ||
        String(p.positionNumber).includes(q)
      )
    })
  }, [positions, search, showInactive, overseerFilter, roleFilter])

  const { isExporting, handleExportPDF, handleExportExcel } = useExport({
    eventId,
    eventName,
    positions: filteredPositions as any,
    overseerFilter: overseerFilter === 'all' ? null : overseerFilter,
  })

  const stations = useMemo((): StationGroup[] => {
    const out: StationGroup[] = []
    for (const position of filteredPositions) {
      const dayShifts = sortShiftsByTime(position.shifts || []).filter((shift) => {
        const key = toDateKey(shift.shiftDate) || 'undated'
        if (key !== activeDay) return false
        const filled = countShiftAssignments(position.assignments, shift.id)
        const needed = getShiftVolunteersNeeded(shift)
        if (underfilledOnly && filled >= needed) return false
        return true
      })
      if (dayShifts.length === 0) {
        if (showInactive && !position.isActive) {
          out.push({ position, shifts: [], filled: 0, needed: 0 })
        }
        continue
      }
      let filled = 0
      let needed = 0
      for (const shift of dayShifts) {
        filled += countShiftAssignments(position.assignments, shift.id)
        needed += getShiftVolunteersNeeded(shift)
      }
      out.push({ position, shifts: dayShifts, filled, needed })
    }
    return out
  }, [filteredPositions, activeDay, underfilledOnly, showInactive])

  const inactiveCount = useMemo(
    () => positions.filter((p) => !p.isActive).length,
    [positions]
  )

  const dayScopedUnfilledCount = useMemo(() => {
    let open = 0
    for (const p of positions) {
      if (!p.isActive) continue
      for (const s of p.shifts || []) {
        const key = toDateKey(s.shiftDate) || 'undated'
        if (key !== activeDay) continue
        const filled = countShiftAssignments(p.assignments, s.id)
        const needed = getShiftVolunteersNeeded(s)
        open += Math.max(0, needed - filled)
      }
    }
    return open
  }, [positions, activeDay])

  const eventDaySummaries = useMemo(() => {
    return eventDateKeys.map((day) => {
      let filled = 0
      let needed = 0
      for (const p of positions) {
        if (!p.isActive) continue
        for (const s of p.shifts || []) {
          if (toDateKey(s.shiftDate) !== day) continue
          filled += countShiftAssignments(p.assignments, s.id)
          needed += getShiftVolunteersNeeded(s)
        }
      }
      return {
        day,
        filled,
        needed,
        open: Math.max(0, needed - filled),
      }
    })
  }, [positions, eventDateKeys])

  const stationExpanded = (positionId: string, filled: number, needed: number) => {
    if (Object.prototype.hasOwnProperty.call(expandOverride, positionId)) {
      return expandOverride[positionId]
    }
    // Default: expand underfilled / empty; collapse fully filled
    return needed === 0 || filled < needed
  }

  const toggleStation = (positionId: string, currentlyOpen: boolean) => {
    setExpandOverride((prev) => ({ ...prev, [positionId]: !currentlyOpen }))
  }

  const expandAllStations = () => {
    const next: Record<string, boolean> = {}
    for (const s of stations) next[s.position.id] = true
    setExpandOverride(next)
  }

  const collapseFilledStations = () => {
    const next: Record<string, boolean> = {}
    for (const s of stations) {
      next[s.position.id] = s.needed === 0 || s.filled < s.needed
    }
    setExpandOverride(next)
  }

  const runToolbarAction = async (action: string) => {
    if (!action) return
    if (action === 'create') openCreatePosition()
    else if (action === 'bulk') setShowBulkCreator(true)
    else if (action === 'template') setShowApplyTemplate(true)
    else if (action === 'auto') await handleAutoAssignDay()
    else if (action === 'auto-all') await handleAutoAssignAll()
    else if (action === 'available') setShowAvailable(true)
    else if (action === 'clear-shifts') await handleClearAll('shifts')
    else if (action === 'clear-assignments') await handleClearAll('assignments')
    else if (action === 'add-shift') {
      const first = filteredPositions.find((p) => p.isActive)
      if (!first) {
        notifyAlert('Create a position first')
        return
      }
      setAddShiftPosition(first)
    } else if (action === 'notify') await handleSendNotifications()
    else if (action === 'abort') await handleAbortNotifications()
    else if (action === 'pdf') await handleExportPDF()
    else if (action === 'excel') await handleExportExcel()
  }

  const dayCoverage = useMemo(() => {
    let filled = 0
    let needed = 0
    let shifts = 0
    for (const s of stations) {
      filled += s.filled
      needed += s.needed
      shifts += s.shifts.length
    }
    return { filled, needed, shifts, open: Math.max(0, needed - filled) }
  }, [stations])

  const nextPositionNumber = useMemo(() => {
    return (
      positions.reduce((acc, p) => Math.max(acc, p.positionNumber || 0), 0) + 1
    )
  }, [positions])

  const setShiftDay = async (
    positionId: string,
    shiftId: string,
    shiftDate: string
  ) => {
    const rowKey = `${positionId}:${shiftId}`
    setSettingDayKey(rowKey)
    try {
      const ok = await positionService.updateShift(positionId, shiftId, {
        shiftDate,
      })
      if (!ok) {
        notifyAlert('Failed to set day')
        return false
      }
      return true
    } catch {
      notifyAlert('Failed to set day')
      return false
    } finally {
      setSettingDayKey(null)
    }
  }

  const handleBulkSetDay = async () => {
    if (!bulkDay || selectedUndated.size === 0) return
    const confirmed = await appConfirm({
      title: 'Set day for shifts',
      message: `Set ${selectedUndated.size} undated shift${
        selectedUndated.size === 1 ? '' : 's'
      } to ${formatEventDayLabel(bulkDay)}?`,
      confirmLabel: 'Set day',
      cancelLabel: 'Cancel',
    })
    if (!confirmed) return
    setBulkSettingDay(true)
    try {
      let okCount = 0
      for (const key of selectedUndated) {
        const [positionId, shiftId] = key.split(':')
        const ok = await positionService.updateShift(positionId, shiftId, {
          shiftDate: bulkDay,
        })
        if (ok) okCount++
      }
      toast.success(`Updated ${okCount} of ${selectedUndated.size} shifts`)
      setSelectedUndated(new Set())
      router.reload()
    } catch {
      notifyAlert('Bulk set day failed')
    } finally {
      setBulkSettingDay(false)
    }
  }

  const openCreatePosition = () => {
    setEditingPosition(null)
    setCreateForm({
      positionNumber: nextPositionNumber,
      name: '',
      area: '',
      description: '',
    })
    setShowCreateModal(true)
  }

  const openEditPosition = (position: Position) => {
    setEditingPosition(position)
    setCreateForm({
      positionNumber: position.positionNumber,
      name: position.name || position.positionName || '',
      area: position.area || '',
      description: position.description || '',
    })
    setShowCreateModal(true)
  }

  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.name.trim()) {
      notifyAlert('Position name is required')
      return
    }
    setCreatingPosition(true)
    try {
      if (editingPosition) {
        const ok = await positionService.updatePosition(editingPosition.id, {
          positionNumber: createForm.positionNumber,
          name: createForm.name,
          area: createForm.area || undefined,
          description: createForm.description || undefined,
        })
        if (!ok) {
          notifyAlert('Failed to update position')
          return
        }
        toast.success('Position updated')
        setShowCreateModal(false)
        setEditingPosition(null)
        router.reload()
        return
      }

      const res = await fetch(`/api/events/${eventId}/positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        notifyAlert(data.error || 'Failed to create position')
        return
      }
      const created = data.data || data.position || data
      toast.success('Position created')
      setShowCreateModal(false)
      if (created?.id) {
        setAddShiftPosition({
          id: created.id,
          name: created.name || createForm.name,
          positionNumber: created.positionNumber || createForm.positionNumber,
          isActive: true,
          area: createForm.area || null,
          shifts: [],
          assignments: [],
        })
      } else {
        router.reload()
      }
    } catch {
      notifyAlert(
        editingPosition ? 'Failed to update position' : 'Failed to create position'
      )
    } finally {
      setCreatingPosition(false)
    }
  }

  const handleCreateShift = async (values: {
    name: string
    startTime: string
    endTime: string
    isAllDay: boolean
    volunteersNeeded: number
    shiftDate: string | null
  }) => {
    if (!addShiftPosition) return
    setSavingNewShift(true)
    try {
      const ok = await positionService.createShift(addShiftPosition.id, {
        name: values.name,
        startTime: values.isAllDay ? null : values.startTime || null,
        endTime: values.isAllDay ? null : values.endTime || null,
        isAllDay: values.isAllDay,
        volunteersNeeded: values.volunteersNeeded,
        shiftDate: values.shiftDate,
      })
      if (!ok) {
        notifyAlert('Failed to create shift')
        return
      }
      toast.success('Shift added')
      setAddShiftPosition(null)
      router.reload()
    } catch {
      notifyAlert('Failed to create shift')
    } finally {
      setSavingNewShift(false)
    }
  }

  const handleRemove = async (
    assignment: Parameters<typeof personName>[0]
  ) => {
    const ok = await appConfirm({
      title: 'Remove assignment',
      message: `Remove ${personName(assignment)} from this shift?`,
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
    })
    if (!ok) return
    setRemovingId(assignment.id)
    try {
      const res = await fetch(
        `/api/events/${eventId}/assignments/${assignment.id}`,
        { method: 'DELETE', credentials: 'include' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        notifyAlert(data.error || data.message || 'Failed to remove')
        return
      }
      toast.success('Assignment removed')
      router.reload()
    } catch {
      notifyAlert('Failed to remove assignment')
    } finally {
      setRemovingId(null)
    }
  }

  const handleDeleteShift = async (
    positionId: string,
    shiftId: string,
    shiftName: string
  ) => {
    const ok = await appConfirm({
      title: 'Delete shift',
      message: `Delete "${shiftName}"? This also removes anyone assigned to it.`,
      confirmLabel: 'Delete shift',
      cancelLabel: 'Cancel',
    })
    if (!ok) return
    const key = `${positionId}:${shiftId}`
    setDeletingKey(key)
    try {
      const success = await positionService.deleteShift(positionId, shiftId)
      if (!success) {
        notifyAlert('Failed to delete shift')
        return
      }
      toast.success('Shift deleted')
      router.reload()
    } catch {
      notifyAlert('Failed to delete shift')
    } finally {
      setDeletingKey(null)
    }
  }

  const handleDeactivatePosition = async (position: Position) => {
    const ok = await appConfirm({
      title: 'Deactivate position',
      message: `Deactivate "#${position.positionNumber} ${positionDisplayName(
        position
      )}"? It can be reactivated from Show inactive.`,
      confirmLabel: 'Deactivate',
      cancelLabel: 'Cancel',
    })
    if (!ok) return
    setDeletingKey(position.id)
    try {
      const success = await positionService.deletePosition(position.id)
      if (!success) {
        notifyAlert('Failed to deactivate position')
        return
      }
      toast.success('Position deactivated')
      router.reload()
    } catch {
      notifyAlert('Failed to deactivate position')
    } finally {
      setDeletingKey(null)
    }
  }

  const handleReactivatePosition = async (position: Position) => {
    setDeletingKey(position.id)
    try {
      const ok = await positionService.activatePosition(position.id)
      if (!ok) {
        notifyAlert('Failed to reactivate position')
        return
      }
      toast.success('Position reactivated')
      router.reload()
    } catch {
      notifyAlert('Failed to reactivate position')
    } finally {
      setDeletingKey(null)
    }
  }

  const handleAutoAssignDay = async () => {
    if (dayScopedUnfilledCount === 0) {
      notifyAlert('No open slots on this day')
      return
    }
    const dayLabel =
      activeDay === 'undated' ? 'undated shifts' : formatEventDayLabel(activeDay)
    const confirmed = await appConfirm({
      title: 'Auto-assign (this day only)',
      message: `Fill up to ${dayScopedUnfilledCount} open slot${
        dayScopedUnfilledCount === 1 ? '' : 's'
      } for ${dayLabel}?\n\nOnly shifts on this day are considered.`,
      confirmLabel: 'Auto-assign',
      cancelLabel: 'Cancel',
    })
    if (!confirmed) return

    setAutoAssigning(true)
    try {
      const dayPositions = positions
        .filter((p) => p.isActive)
        .map((p) => ({
          ...p,
          shifts: (p.shifts || []).filter((s) => {
            const key = toDateKey(s.shiftDate) || 'undated'
            return key === activeDay
          }),
        }))
        .filter((p) => (p.shifts || []).length > 0)

      const engine = new AutoAssignmentEngine({
        eventId,
        positions: dayPositions as any,
        attendants: attendants as any,
      })
      const result = await engine.execute()
      notifyAlert(result.message)
      router.reload()
    } catch {
      notifyAlert('Failed to auto-assign')
    } finally {
      setAutoAssigning(false)
    }
  }

  const handleAutoAssignAll = async () => {
    const confirmed = await appConfirm({
      title: 'Auto-assign (all days)',
      message:
        'Fill open slots across the whole event?\n\nThis uses every active station, not only the day you are viewing.',
      confirmLabel: 'Auto-assign',
      cancelLabel: 'Cancel',
    })
    if (!confirmed) return
    setAutoAssigning(true)
    try {
      const engine = new AutoAssignmentEngine({
        eventId,
        positions: positions.filter((p) => p.isActive) as any,
        attendants: attendants as any,
      })
      const result = await engine.execute()
      notifyAlert(result.message)
      router.reload()
    } catch {
      notifyAlert('Failed to auto-assign')
    } finally {
      setAutoAssigning(false)
    }
  }

  const handleClearAll = async (kind: 'shifts' | 'assignments') => {
    const shifts = kind === 'shifts'
    const confirmed = await appConfirm({
      title: shifts ? 'Clear all shifts' : 'Clear all assignments',
      message: shifts
        ? 'Remove every shift and its assignments from this event? This cannot be undone.'
        : 'Remove every assignment from this event? Shifts stay. This cannot be undone.',
      confirmLabel: shifts ? 'Clear shifts' : 'Clear assignments',
      cancelLabel: 'Cancel',
    })
    if (!confirmed) return
    setBulkWorking(true)
    try {
      const ok = shifts
        ? await positionService.clearAllShifts()
        : await positionService.clearAllAssignments()
      if (!ok) {
        notifyAlert(shifts ? 'Failed to clear shifts' : 'Failed to clear assignments')
        return
      }
      toast.success(shifts ? 'Cleared all shifts' : 'Cleared all assignments')
      router.reload()
    } catch {
      notifyAlert(shifts ? 'Failed to clear shifts' : 'Failed to clear assignments')
    } finally {
      setBulkWorking(false)
    }
  }

  const handleBulkDeleteStations = async () => {
    if (selectedStations.size === 0) return
    const confirmed = await appConfirm({
      title: 'Delete stations',
      message: `Delete ${selectedStations.size} selected station${
        selectedStations.size === 1 ? '' : 's'
      }? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    })
    if (!confirmed) return
    setBulkWorking(true)
    try {
      const result = await positionService.bulkDeletePositions(
        Array.from(selectedStations)
      )
      if (result.successCount === 0) {
        notifyAlert('Failed to delete stations')
        return
      }
      toast.success(
        `Deleted ${result.successCount} station${result.successCount === 1 ? '' : 's'}`
      )
      router.reload()
    } catch {
      notifyAlert('Failed to delete stations')
    } finally {
      setBulkWorking(false)
    }
  }

  const toggleStationSelected = (positionId: string) => {
    setSelectedStations((prev) => {
      const next = new Set(prev)
      if (next.has(positionId)) next.delete(positionId)
      else next.add(positionId)
      return next
    })
  }

  const selectVisibleStations = () => {
    setSelectedStations(new Set(stations.map((s) => s.position.id)))
  }

  const runShiftMoreAction = async (
    action: string,
    position: Position,
    shift: Shift
  ) => {
    if (!action) return
    if (action === 'overseer') {
      setAssignTarget({ position, shift, role: 'OVERSEER' })
      return
    }
    if (action === 'keyman') {
      setAssignTarget({ position, shift, role: 'KEYMAN' })
      return
    }
    if (action === 'edit') {
      setEditingShiftKey(`${position.id}:${shift.id}`)
      return
    }
    if (action === 'delete') {
      await handleDeleteShift(position.id, shift.id, shift.name || 'Shift')
    }
  }

  const handleSendNotifications = async () => {
    if (notifySending || notifyJobActive) {
      notifyAlert('An assignment notification send is already in progress.')
      return
    }
    try {
      const previewRes = await fetch(
        `/api/events/${eventId}/assignments/send-notifications`,
        { credentials: 'include' }
      )
      const preview = await previewRes.json().catch(() => ({}))
      const count =
        typeof preview.recipientCount === 'number' ? preview.recipientCount : 0
      if (!previewRes.ok) {
        notifyAlert(preview.error || preview.message || 'Could not preview recipients')
        return
      }
      if (count === 0) {
        notifyAlert('No assigned volunteers with an email address to notify.')
        return
      }
      const confirmed = await appConfirm({
        title: 'Send assignment notifications',
        message: formatBulkEmailConfirmMessage({
          recipientCount: count,
          estimatedSeconds:
            typeof preview.estimatedSeconds === 'number'
              ? preview.estimatedSeconds
              : Math.ceil(count * 1.2),
          scopeNote:
            'Assigned volunteers with email only (one email per person).',
        }),
        confirmLabel: 'Queue emails',
        cancelLabel: 'Cancel',
      })
      if (!confirmed) return

      setNotifySending(true)
      setNotifyJobActive(true)
      const response = await fetch(
        `/api/events/${eventId}/assignments/send-notifications`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }
      )
      const data = await response.json().catch(() => ({}))
      if (response.ok && data.success) {
        notifyAlert(data.message || `Queued ${count} notification(s)`)
        if (!data.async) setNotifyJobActive(false)
      } else {
        setNotifyJobActive(false)
        notifyAlert(data.error || data.message || 'Failed to send notifications')
      }
    } catch (error: unknown) {
      setNotifyJobActive(false)
      notifyAlert(
        `Failed to send notifications: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    } finally {
      setNotifySending(false)
    }
  }

  const handleAbortNotifications = async () => {
    const result = await abortEventBulkEmail(
      eventId,
      'assignment-notifications'
    )
    notifyAlert(result.message)
    if (result.ok) setNotifyJobActive(false)
  }

  const selectAllUndatedVisible = () => {
    const keys = new Set<string>()
    for (const station of stations) {
      for (const shift of station.shifts) {
        keys.add(`${station.position.id}:${shift.id}`)
      }
    }
    setSelectedUndated(keys)
  }

  return (
    <div className="space-y-4">
      {eventDateKeys.length > 1 && undatedShiftCount > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p>
            <span className="font-medium">
              {undatedShiftCount} undated shift
              {undatedShiftCount === 1 ? '' : 's'}
            </span>
            {' — '}set a day here, or open the No day set tab.
          </p>
          <button
            type="button"
            onClick={() => setActiveDay('undated')}
            className="mt-2 inline-flex min-h-[44px] items-center rounded-md border border-amber-400 bg-white px-3 py-2 text-sm font-medium touch-manipulation"
          >
            Show undated
          </button>
        </div>
      )}

      {eventDateKeys.length > 1 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {eventDaySummaries.map(({ day, filled, needed, open }) => (
            <button
              key={day}
              type="button"
              onClick={() => {
                setActiveDay(day)
                setSelectedUndated(new Set())
              }}
              className={`inline-flex min-h-[44px] items-center rounded-md border px-3 py-1.5 touch-manipulation ${
                activeDay === day
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="font-medium">{formatEventDayLabel(day)}</span>
              <span
                className={`ml-1.5 ${
                  needed > 0 && filled >= needed
                    ? 'text-green-700'
                    : open > 0
                      ? 'text-amber-700'
                      : 'text-gray-500'
                }`}
              >
                {filled}/{needed}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {dayTabs.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => {
                setActiveDay(day)
                setSelectedUndated(new Set())
              }}
              className={`px-3 py-2 min-h-[44px] rounded-md text-sm font-medium touch-manipulation ${
                activeDay === day
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {day === 'undated'
                ? `No day set${undatedShiftCount ? ` (${undatedShiftCount})` : ''}`
                : formatEventDayLabel(day)}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {canManageContent && (
            <>
              {/* Mobile: single Actions control */}
              <select
                defaultValue=""
                disabled={autoAssigning || notifySending || isExporting}
                onChange={async (e) => {
                  const action = e.target.value
                  e.target.value = ''
                  await runToolbarAction(action)
                }}
                className="w-full min-h-[44px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 touch-manipulation sm:hidden"
                aria-label="Actions"
              >
                <option value="">Actions…</option>
                <option value="create">Create position</option>
                <option value="bulk">Bulk create</option>
                <option value="template">Apply template</option>
                <option
                  value="auto"
                  disabled={dayScopedUnfilledCount === 0}
                >
                  Auto-assign ({dayScopedUnfilledCount})
                </option>
                <option value="auto-all">Auto-assign all days</option>
                <option value="add-shift">Add shift</option>
                <option value="notify">Send notifications</option>
                {notifyJobActive && (
                  <option value="abort">Abort send</option>
                )}
                <option value="available">
                  Available volunteers ({availableVolunteers.length})
                </option>
                <option value="pdf">Export PDF</option>
                <option value="excel">Export Excel</option>
                <option value="clear-assignments">Clear all assignments</option>
                <option value="clear-shifts">Clear all shifts</option>
              </select>

              {/* Desktop: visible action buttons */}
              <div className="hidden flex-wrap justify-end gap-2 sm:flex">
                <button
                  type="button"
                  onClick={openCreatePosition}
                  className="inline-flex min-h-[44px] items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 touch-manipulation"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkCreator(true)}
                  className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 touch-manipulation"
                >
                  Bulk create
                </button>
                <button
                  type="button"
                  onClick={() => setShowApplyTemplate(true)}
                  className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 touch-manipulation"
                >
                  Apply template
                </button>
                <button
                  type="button"
                  disabled={autoAssigning || dayScopedUnfilledCount === 0}
                  onClick={handleAutoAssignDay}
                  className="inline-flex min-h-[44px] items-center rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-900 hover:bg-orange-100 disabled:opacity-50 touch-manipulation"
                  title="Fills open slots for the active day only"
                >
                  {autoAssigning
                    ? 'Assigning…'
                    : `Auto-assign (${dayScopedUnfilledCount})`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const first = filteredPositions.find((p) => p.isActive)
                    if (!first) {
                      notifyAlert('Create a position first')
                      return
                    }
                    setAddShiftPosition(first)
                  }}
                  className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 touch-manipulation"
                >
                  Add shift
                </button>
                <button
                  type="button"
                  disabled={notifySending}
                  onClick={handleSendNotifications}
                  className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 touch-manipulation"
                >
                  {notifySending ? 'Queuing…' : 'Notify'}
                </button>
                {notifyJobActive && (
                  <button
                    type="button"
                    onClick={handleAbortNotifications}
                    className="inline-flex min-h-[44px] items-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 touch-manipulation"
                  >
                    Abort send
                  </button>
                )}
                <select
                  defaultValue=""
                  disabled={isExporting || bulkWorking || autoAssigning}
                  onChange={async (e) => {
                    const action = e.target.value
                    e.target.value = ''
                    if (action === 'pdf') await handleExportPDF()
                    if (action === 'excel') await handleExportExcel()
                    if (action === 'available') setShowAvailable(true)
                    if (action === 'auto-all') await handleAutoAssignAll()
                    if (action === 'clear-shifts') await handleClearAll('shifts')
                    if (action === 'clear-assignments') await handleClearAll('assignments')
                  }}
                  className="min-h-[44px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 touch-manipulation"
                  aria-label="More actions"
                >
                  <option value="">
                    {isExporting ? 'Exporting…' : 'More…'}
                  </option>
                  <option value="available">
                    Available volunteers ({availableVolunteers.length})
                  </option>
                  <option value="auto-all">Auto-assign all days</option>
                  <option value="pdf">Export PDF</option>
                  <option value="excel">Export Excel</option>
                  <option value="clear-assignments">Clear all assignments</option>
                  <option value="clear-shifts">Clear all shifts</option>
                </select>
              </div>
            </>
          )}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter stations…"
            className="w-full sm:w-64 px-3 py-2 min-h-[44px] text-base sm:text-sm border border-gray-300 rounded-md"
          />
          <div className="flex flex-wrap justify-end gap-3">
            <label className="inline-flex min-h-[44px] items-center gap-2 text-sm text-gray-700 touch-manipulation">
              Overseer
              <select
                value={overseerFilter}
                onChange={(e) => setOverseerFilter(e.target.value)}
                className="min-h-[44px] rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
              >
                <option value="all">All</option>
                {overseerOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex min-h-[44px] items-center gap-2 text-sm text-gray-700 touch-manipulation">
              Role
              <select
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(
                    e.target.value as 'all' | 'overseers' | 'assistants' | 'keymen'
                  )
                }
                className="min-h-[44px] rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="overseers">Has shift overseer</option>
                <option value="keymen">Has shift keyman</option>
                <option value="assistants">Has assistant</option>
              </select>
            </label>
            <label className="inline-flex min-h-[44px] items-center gap-2 text-sm text-gray-700 touch-manipulation">
              <input
                type="checkbox"
                checked={underfilledOnly}
                onChange={(e) => setUnderfilledOnly(e.target.checked)}
                className="h-4 w-4"
              />
              Underfilled only
            </label>
            <label className="inline-flex min-h-[44px] items-center gap-2 text-sm text-gray-700 touch-manipulation">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4"
              />
              Show inactive
              {inactiveCount > 0 ? ` (${inactiveCount})` : ''}
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800">
        <p className="font-medium text-gray-900">
          {activeDay === 'undated'
            ? 'Undated shifts'
            : formatEventDayLabel(activeDay)}{' '}
          · {stations.length} station{stations.length === 1 ? '' : 's'}
        </p>
        <p className="mt-1">
          {dayCoverage.filled}/{dayCoverage.needed} slots · {dayCoverage.open} open ·{' '}
          {dayCoverage.shifts} shift{dayCoverage.shifts === 1 ? '' : 's'}
          {underfilledOnly ? ' · underfilled only' : ''}
        </p>
        {canManageContent && (
          <button
            type="button"
            onClick={() => setShowAvailable(true)}
            className="mt-2 inline-flex min-h-[44px] items-center text-sm font-medium text-purple-800 underline touch-manipulation"
          >
            {availableVolunteers.length} available volunteer
            {availableVolunteers.length === 1 ? '' : 's'}
          </button>
        )}
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-2 rounded-full ${
              dayCoverage.needed > 0 && dayCoverage.filled >= dayCoverage.needed
                ? 'bg-green-500'
                : dayCoverage.filled > 0
                  ? 'bg-amber-400'
                  : 'bg-gray-300'
            }`}
            style={{
              width: `${
                dayCoverage.needed > 0
                  ? Math.min(
                      100,
                      Math.round((dayCoverage.filled / dayCoverage.needed) * 100)
                    )
                  : 0
              }%`,
            }}
          />
        </div>
      </div>

      {activeDay === 'undated' && canManageContent && stations.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2">
          <button
            type="button"
            onClick={selectAllUndatedVisible}
            className="min-h-[44px] rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm touch-manipulation"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setSelectedUndated(new Set())}
            className="min-h-[44px] rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm touch-manipulation"
          >
            Clear
          </button>
          <select
            value={bulkDay}
            onChange={(e) => setBulkDay(e.target.value)}
            className="min-h-[44px] rounded-md border border-indigo-300 bg-white px-2 py-1.5 text-sm"
          >
            {eventDateKeys.map((key) => (
              <option key={key} value={key}>
                {formatEventDayLabel(key)}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={bulkSettingDay || selectedUndated.size === 0 || !bulkDay}
            onClick={handleBulkSetDay}
            className="inline-flex min-h-[44px] items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300 touch-manipulation"
          >
            {bulkSettingDay
              ? 'Updating…'
              : `Set day on ${selectedUndated.size || 0}`}
          </button>
        </div>
      )}

      {stations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
          {activeDay === 'undated'
            ? 'No undated shifts. All shifts have a day set.'
            : canManageContent
              ? 'No shifts for this day. Add a shift or pick another day.'
              : 'No shifts for this day.'}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={expandAllStations}
              className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 touch-manipulation"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseFilledStations}
              className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 touch-manipulation"
            >
              Collapse filled
            </button>
            {canManageContent && (
              <>
                <button
                  type="button"
                  onClick={selectVisibleStations}
                  className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 touch-manipulation"
                >
                  Select visible
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStations(new Set())}
                  className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 touch-manipulation"
                >
                  Clear selection
                </button>
              </>
            )}
          </div>
          {canManageContent && selectedStations.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
              <span className="text-sm font-medium text-blue-900">
                {selectedStations.size} selected
              </span>
              <button
                type="button"
                disabled={bulkWorking}
                onClick={() => setShowBulkEdit(true)}
                className="inline-flex min-h-[44px] items-center rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-800 touch-manipulation"
              >
                Bulk edit
              </button>
              <button
                type="button"
                disabled={bulkWorking}
                onClick={handleBulkDeleteStations}
                className="inline-flex min-h-[44px] items-center rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 touch-manipulation"
              >
                Delete
              </button>
            </div>
          )}
          {stations.map(({ position, shifts, filled: stationFilled, needed: stationNeeded }) => {
            const positionOverseer = position.oversight?.[0]?.overseer
            const isOpen = stationExpanded(
              position.id,
              stationFilled,
              stationNeeded
            )
            return (
              <section
                key={position.id}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
              >
                <header className="flex flex-col gap-2 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  {canManageContent && (
                    <label className="inline-flex min-h-[44px] min-w-[44px] items-center touch-manipulation">
                      <input
                        type="checkbox"
                        checked={selectedStations.has(position.id)}
                        onChange={() => toggleStationSelected(position.id)}
                        className="h-4 w-4"
                        aria-label={`Select ${positionDisplayName(position)}`}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleStation(position.id, isOpen)}
                    className="flex min-h-[44px] flex-1 items-start gap-2 text-left touch-manipulation"
                    aria-expanded={isOpen}
                  >
                    <span
                      className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center text-gray-500"
                      aria-hidden
                    >
                      <svg
                        className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                    <span>
                      <span className="block text-base font-semibold text-gray-900">
                        #{position.positionNumber}{' '}
                        {positionDisplayName(position)}
                        {!position.isActive && (
                          <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs font-normal text-gray-700">
                            Inactive
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-sm text-gray-600">
                        {position.area ? `${position.area} · ` : ''}
                        {shifts.length === 0 ? (
                          <span className="text-gray-500">No shifts this day</span>
                        ) : (
                          <span
                            className={
                              stationFilled >= stationNeeded
                                ? 'text-green-700'
                                : 'text-amber-700'
                            }
                          >
                            {stationFilled}/{stationNeeded} filled
                          </span>
                        )}
                        {positionOverseer
                          ? ` · Overseer ${positionOverseer.firstName} ${positionOverseer.lastName}`
                          : ''}
                      </span>
                    </span>
                  </button>
                  {canManageContent && isOpen && (
                    <div className="flex flex-wrap gap-2 sm:pl-8">
                      {position.isActive ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditPosition(position)}
                            className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 touch-manipulation"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setOversightPosition(position)}
                            className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 touch-manipulation"
                          >
                            Oversight
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddShiftPosition(position)}
                            className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 touch-manipulation"
                          >
                            Add shift
                          </button>
                          <button
                            type="button"
                            disabled={deletingKey === position.id}
                            onClick={() => handleDeactivatePosition(position)}
                            className="inline-flex min-h-[44px] items-center rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 touch-manipulation"
                          >
                            Deactivate
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={deletingKey === position.id}
                          onClick={() => handleReactivatePosition(position)}
                          className="inline-flex min-h-[44px] items-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 touch-manipulation"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  )}
                </header>

                {isOpen && (
                <div className="divide-y divide-gray-100 border-t border-gray-100">
                  {shifts.map((shift) => {
                    const rowKey = `${position.id}:${shift.id}`
                    const filled = countShiftAssignments(
                      position.assignments,
                      shift.id
                    )
                    const needed = getShiftVolunteersNeeded(shift)
                    const shiftAssignments = (position.assignments || []).filter(
                      (a) => a.shift?.id === shift.id
                    )
                    const volunteers = shiftAssignments.filter(
                      (a) => a.role === 'VOLUNTEER' || a.role === 'ATTENDANT'
                    )
                    const overseer = shiftAssignments.find(
                      (a) => a.role === 'OVERSEER'
                    )
                    const keyman = shiftAssignments.find(
                      (a) => a.role === 'KEYMAN'
                    )
                    const isEditing = editingShiftKey === rowKey
                    const pct = Math.min(
                      100,
                      Math.round((filled / Math.max(needed, 1)) * 100)
                    )

                    return (
                      <div key={rowKey} className="px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex gap-3">
                            {activeDay === 'undated' && canManageContent && (
                              <label className="mt-1 inline-flex min-h-[44px] min-w-[44px] items-start touch-manipulation">
                                <input
                                  type="checkbox"
                                  checked={selectedUndated.has(rowKey)}
                                  onChange={() => {
                                    setSelectedUndated((prev) => {
                                      const next = new Set(prev)
                                      if (next.has(rowKey)) next.delete(rowKey)
                                      else next.add(rowKey)
                                      return next
                                    })
                                  }}
                                  className="mt-1 h-4 w-4"
                                  aria-label="Select undated shift"
                                />
                              </label>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {shiftLabel(shift)}
                                {!toDateKey(shift.shiftDate) &&
                                eventDateKeys.length > 1 ? (
                                  <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-900">
                                    No day
                                  </span>
                                ) : null}
                              </p>
                              <p
                                className={`text-sm ${
                                  filled >= needed
                                    ? 'text-green-700'
                                    : 'text-amber-700'
                                }`}
                              >
                                {filled}/{needed}
                                {filled < needed
                                  ? ` · ${needed - filled} open`
                                  : ''}
                              </p>
                              {canManageContent &&
                                !toDateKey(shift.shiftDate) &&
                                eventDateKeys.length > 0 &&
                                !isEditing && (
                                  <select
                                    defaultValue=""
                                    disabled={settingDayKey === rowKey}
                                    onChange={async (e) => {
                                      const day = e.target.value
                                      if (!day) return
                                      const ok = await setShiftDay(
                                        position.id,
                                        shift.id,
                                        day
                                      )
                                      if (ok) {
                                        toast.success(
                                          `Set to ${formatEventDayLabel(day)}`
                                        )
                                        router.reload()
                                      }
                                    }}
                                    className="mt-2 min-h-[44px] rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-sm"
                                  >
                                    <option value="">Set day…</option>
                                    {eventDateKeys.map((key) => (
                                      <option key={key} value={key}>
                                        {formatEventDayLabel(key)}
                                      </option>
                                    ))}
                                  </select>
                                )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-1.5 rounded-full ${
                              pct >= 100
                                ? 'bg-green-500'
                                : pct > 0
                                  ? 'bg-amber-400'
                                  : 'bg-gray-300'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {isEditing && canManageContent ? (
                          <ShiftInlineEditor
                            initial={{
                              name: shift.name || '',
                              startTime: shift.startTime || '',
                              endTime: shift.endTime || '',
                              isAllDay: !!shift.isAllDay,
                              volunteersNeeded: needed,
                              shiftDate: toDateKey(shift.shiftDate),
                            }}
                            eventDateKeys={eventDateKeys}
                            saving={savingShiftKey === rowKey}
                            onCancel={() => setEditingShiftKey(null)}
                            onSave={async (values) => {
                              if (filled > 0) {
                                const confirmed = await appConfirm({
                                  title: 'Update shift times',
                                  message: `This updates times for ${filled} assigned volunteer${
                                    filled === 1 ? '' : 's'
                                  }. Continue?`,
                                  confirmLabel: 'Update times',
                                  cancelLabel: 'Cancel',
                                })
                                if (!confirmed) return
                              }
                              setSavingShiftKey(rowKey)
                              try {
                                const ok = await positionService.updateShift(
                                  position.id,
                                  shift.id,
                                  {
                                    name: values.name,
                                    startTime: values.isAllDay
                                      ? null
                                      : values.startTime || null,
                                    endTime: values.isAllDay
                                      ? null
                                      : values.endTime || null,
                                    isAllDay: values.isAllDay,
                                    volunteersNeeded: values.volunteersNeeded,
                                    shiftDate: values.shiftDate,
                                  }
                                )
                                if (!ok) {
                                  notifyAlert('Failed to update shift')
                                  return
                                }
                                setEditingShiftKey(null)
                                toast.success('Shift updated')
                                router.reload()
                              } catch {
                                notifyAlert('Failed to update shift')
                              } finally {
                                setSavingShiftKey(null)
                              }
                            }}
                          />
                        ) : (
                          <>
                            <div className="mt-2 space-y-1 text-sm text-gray-800">
                              <p>
                                <span className="text-gray-500">Overseer · </span>
                                {overseer
                                  ? personName(overseer)
                                  : positionOverseer
                                    ? `${positionOverseer.firstName} ${positionOverseer.lastName} (position)`
                                    : '—'}
                                {canManageContent && overseer && (
                                  <button
                                    type="button"
                                    disabled={removingId === overseer.id}
                                    onClick={() => handleRemove(overseer)}
                                    className="ml-2 text-xs text-red-600 hover:text-red-800 min-h-[44px] px-1 touch-manipulation"
                                  >
                                    Remove
                                  </button>
                                )}
                              </p>
                              {(keyman || canManageContent) && (
                                <p>
                                  <span className="text-gray-500">Keyman · </span>
                                  {keyman ? personName(keyman) : '—'}
                                  {canManageContent && keyman && (
                                    <button
                                      type="button"
                                      disabled={removingId === keyman.id}
                                      onClick={() => handleRemove(keyman)}
                                      className="ml-2 text-xs text-red-600 hover:text-red-800 min-h-[44px] px-1 touch-manipulation"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </p>
                              )}
                              <div>
                                <span className="text-gray-500">Assigned · </span>
                                {volunteers.length === 0 ? (
                                  <span className="text-gray-500">None</span>
                                ) : (
                                  <ul className="mt-1 space-y-0.5">
                                    {volunteers.map((v) => (
                                      <li
                                        key={v.id}
                                        className="flex flex-wrap items-center gap-2"
                                      >
                                        <span>{personName(v)}</span>
                                        {canManageContent && (
                                          <button
                                            type="button"
                                            disabled={removingId === v.id}
                                            onClick={() => handleRemove(v)}
                                            className="text-xs text-red-600 hover:text-red-800 min-h-[44px] px-1 touch-manipulation"
                                          >
                                            Remove
                                          </button>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>

                            {canManageContent && (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAssignTarget({
                                      position,
                                      shift,
                                      role: 'VOLUNTEER',
                                    })
                                  }
                                  className="inline-flex min-h-[44px] items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 touch-manipulation"
                                >
                                  Assign
                                </button>
                                <select
                                  key={`${rowKey}-more`}
                                  defaultValue=""
                                  disabled={deletingKey === rowKey}
                                  onChange={async (e) => {
                                    const action = e.target.value
                                    e.target.value = ''
                                    await runShiftMoreAction(
                                      action,
                                      position,
                                      shift
                                    )
                                  }}
                                  className="min-h-[44px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 touch-manipulation"
                                  aria-label="More shift actions"
                                >
                                  <option value="">More…</option>
                                  <option value="overseer">Set overseer</option>
                                  <option value="keyman">Set keyman</option>
                                  <option value="edit">Edit times</option>
                                  <option value="delete">Delete shift</option>
                                </select>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {assignTarget && (
        <DayBoardAssignModal
          eventId={eventId}
          target={assignTarget}
          positions={positions}
          attendants={attendants}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => {
            setAssignTarget(null)
            router.reload()
          }}
        />
      )}

      <CreatePositionModal
        isOpen={showCreateModal}
        editingPosition={
          editingPosition
            ? {
                id: editingPosition.id,
                positionNumber: editingPosition.positionNumber,
                name: editingPosition.name || editingPosition.positionName || '',
                area: editingPosition.area || undefined,
                description: editingPosition.description || undefined,
              }
            : null
        }
        formData={createForm}
        onClose={() => {
          if (creatingPosition) return
          setShowCreateModal(false)
          setEditingPosition(null)
        }}
        onSubmit={handleCreatePosition}
        onFormDataChange={setCreateForm}
      />

      {addShiftPosition && (
        <DayBoardAddShiftModal
          position={addShiftPosition}
          positions={filteredPositions.filter((p) => p.isActive)}
          eventDateKeys={eventDateKeys}
          defaultDay={
            activeDay !== 'undated' ? activeDay : eventDateKeys[0] || null
          }
          saving={savingNewShift}
          onPositionChange={setAddShiftPosition}
          onCancel={() => setAddShiftPosition(null)}
          onSave={handleCreateShift}
        />
      )}

      {oversightPosition && (
        <DayBoardOversightModal
          eventId={eventId}
          position={oversightPosition}
          attendants={attendants}
          onClose={() => setOversightPosition(null)}
          onSaved={() => {
            setOversightPosition(null)
            router.reload()
          }}
        />
      )}

      {showApplyTemplate && (
        <DayBoardApplyTemplateModal
          eventId={eventId}
          positions={positions}
          onClose={() => setShowApplyTemplate(false)}
          onApplied={() => {
            setShowApplyTemplate(false)
            router.reload()
          }}
        />
      )}

      {showBulkCreator && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
          <div className="my-4 w-full max-w-md">
            <BulkPositionCreator
              eventId={eventId}
              onCancel={() => setShowBulkCreator(false)}
              onSuccess={(result) => {
                const n = result?.created ?? result?.length ?? ''
                toast.success(
                  typeof n === 'number'
                    ? `Created ${n} positions`
                    : 'Positions created'
                )
                setShowBulkCreator(false)
                router.reload()
              }}
            />
          </div>
        </div>
      )}

      {showBulkEdit && (
        <DayBoardBulkModal
          eventId={eventId}
          positions={positions.filter((p) => selectedStations.has(p.id))}
          attendants={attendants}
          activeDay={activeDay}
          eventDateKeys={eventDateKeys}
          onClose={() => setShowBulkEdit(false)}
          onDone={() => {
            setShowBulkEdit(false)
            setSelectedStations(new Set())
            router.reload()
          }}
        />
      )}

      {showAvailable && (
        <DayBoardAvailableModal
          volunteers={availableVolunteers}
          onClose={() => setShowAvailable(false)}
        />
      )}
    </div>
  )
}
