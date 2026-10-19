import React, { useMemo, useState } from 'react'
import {
  buildVolunteerAssignmentMap,
  getConflictsForShift,
} from '../../hooks/useConflicts'
import { appConfirm } from '../../lib/ui/confirm'
import { notifyAlert } from '../../lib/ui/toast'
import { listEventKeymen, listEventOverseers } from './eventOversightOptions'
import type { AssignTarget, Position, Volunteer } from './types'

type Props = {
  eventId: string
  target: AssignTarget
  positions: Position[]
  attendants: Volunteer[]
  onClose: () => void
  onAssigned: () => void
}

export default function DayBoardAssignModal({
  eventId,
  target,
  positions,
  attendants,
  onClose,
  onAssigned,
}: Props) {
  const [search, setSearch] = useState('')
  const [assigning, setAssigning] = useState(false)

  const preferredOverseerId = target.position.oversight?.[0]?.overseer?.id || null
  const preferredKeymanId = target.position.oversight?.[0]?.keyman?.id || null

  const matchesPreferred = (a: Volunteer) => {
    if (!preferredOverseerId && !preferredKeymanId) return true
    return Boolean(
      (preferredOverseerId && a.overseerId === preferredOverseerId) ||
        (preferredKeymanId && a.keymanId === preferredKeymanId)
    )
  }

  const assignmentMap = useMemo(
    () => buildVolunteerAssignmentMap(positions),
    [positions]
  )

  const conflictMap = useMemo(
    () =>
      getConflictsForShift(
        attendants.map((a) => a.id),
        target.shift,
        assignmentMap
      ),
    [attendants, target.shift, assignmentMap]
  )

  const roster = useMemo(() => {
    if (target.role === 'OVERSEER') return listEventOverseers(attendants)
    if (target.role === 'KEYMAN') return listEventKeymen(attendants)
    return attendants.filter((person) => person.isActive !== false)
  }, [attendants, target.role])

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    return roster
      .filter((a) => {
        if (!q) return true
        return `${a.firstName} ${a.lastName} ${a.congregation || ''}`
          .toLowerCase()
          .includes(q)
      })
      .sort((a, b) => {
        const aPref = matchesPreferred(a) ? 0 : 1
        const bPref = matchesPreferred(b) ? 0 : 1
        if (aPref !== bPref) return aPref - bPref
        const ac = conflictMap.get(a.id)?.hasConflict ? 1 : 0
        const bc = conflictMap.get(b.id)?.hasConflict ? 1 : 0
        if (ac !== bc) return ac - bc
        return `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`
        )
      })
      .slice(0, 40)
  }, [roster, search, conflictMap, preferredOverseerId, preferredKeymanId])

  const roleLabel =
    target.role === 'OVERSEER'
      ? 'Set shift overseer'
      : target.role === 'KEYMAN'
        ? 'Set keyman'
        : 'Assign volunteer'

  const handleAssign = async (volunteerId: string) => {
    const conflict = conflictMap.get(volunteerId)
    if (conflict?.hasConflict) {
      const confirmed = await appConfirm({
        title: 'Scheduling conflict',
        message: `${conflict.message}\n\nAssign anyway? Coordinators can override conflicts.`,
        confirmLabel: 'Assign anyway',
        cancelLabel: 'Cancel',
      })
      if (!confirmed) return
    }
    setAssigning(true)
    try {
      const res = await fetch(`/api/events/${eventId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: target.position.id,
          volunteerId,
          shiftId: target.shift.id,
          role: target.role,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 409) {
          const details = data.conflicts
            ?.map((c: { positionName?: string; shiftName?: string }) =>
              `${c.positionName || ''} — ${c.shiftName || ''}`.trim()
            )
            .filter(Boolean)
            .join(', ')
          notifyAlert(
            data.message ||
              data.error ||
              (details
                ? `Time conflict: already assigned to ${details}`
                : 'Assignment conflict')
          )
        } else {
          notifyAlert(data.message || data.error || 'Failed to assign')
        }
        return
      }
      onAssigned()
    } catch {
      notifyAlert('Failed to assign')
    } finally {
      setAssigning(false)
    }
  }

  const showPreferredHint =
    target.role === 'VOLUNTEER' && (preferredOverseerId || preferredKeymanId)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">{roleLabel}</h3>
          <p className="text-sm text-gray-600">
            {target.position.name} · {target.shift.name}
          </p>
        </div>
        <div className="px-4 py-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or congregation…"
            className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 min-h-[44px] text-base sm:text-sm"
            autoFocus
          />
          {showPreferredHint && (
            <p className="mb-2 text-xs text-gray-500">
              Matching overseer/keyman listed first. Others available for overflow.
            </p>
          )}
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {candidates.map((a) => {
              const conflict = conflictMap.get(a.id)
              const hasConflict = conflict?.hasConflict
              const preferred = matchesPreferred(a)
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={assigning}
                  onClick={() => handleAssign(a.id)}
                  className="flex w-full min-h-[44px] items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-blue-50 touch-manipulation disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-gray-900">
                      {a.firstName} {a.lastName}
                    </span>
                    {a.congregation && (
                      <span className="block text-xs text-gray-500">
                        {a.congregation}
                      </span>
                    )}
                    {hasConflict && (
                      <span className="mt-0.5 block text-xs text-amber-700">
                        {conflict!.message}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {!preferred && showPreferredHint && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                        Other
                      </span>
                    )}
                    {hasConflict && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                        Conflict
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
            {candidates.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-500">
                {search.trim()
                  ? 'No matches'
                  : target.role === 'OVERSEER'
                    ? 'No overseers on this event'
                    : target.role === 'KEYMAN'
                      ? 'No keymen on this event'
                      : 'No matches'}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-md border border-gray-300 px-4 py-2 text-sm touch-manipulation"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
