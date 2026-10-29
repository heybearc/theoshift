import React, { useMemo, useState } from 'react'
import { useShiftRangeSelection } from '../../hooks/useShiftRangeSelection'
import { createPositionService } from '../../lib/positionService'
import { notifyAlert, toast } from '../../lib/ui/toast'
import { formatEventDayLabel } from '../../lib/eventDates'
import { toDateKey } from '../../lib/shiftConflict'
import { listEventKeymen, listEventOverseers } from './eventOversightOptions'
import type { Position, Shift, Volunteer } from './types'
import { positionDisplayName, shiftLabel } from './types'

type Props = {
  eventId: string
  positions: Position[]
  attendants: Volunteer[]
  activeDay: string
  eventDateKeys: string[]
  initialShiftKeys?: string[]
  onClose: () => void
  onDone: () => void
}

const fieldClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 min-h-[44px] text-base sm:text-sm'

function clampNeeded(value: number): number {
  return Math.max(1, Math.min(50, Number(value) || 1))
}

export default function DayBoardBulkModal({
  eventId,
  positions,
  attendants,
  activeDay,
  eventDateKeys,
  initialShiftKeys,
  onClose,
  onDone,
}: Props) {
  const positionService = useMemo(() => createPositionService(eventId), [eventId])
  const [busy, setBusy] = useState(false)
  const [area, setArea] = useState('')
  const [status, setStatus] = useState('')
  const [templateType, setTemplateType] = useState('')
  const [templateNeeded, setTemplateNeeded] = useState(1)
  const [shiftName, setShiftName] = useState('')
  const [shiftStart, setShiftStart] = useState('')
  const [shiftEnd, setShiftEnd] = useState('')
  const [shiftAllDay, setShiftAllDay] = useState(false)
  const [shiftNeeded, setShiftNeeded] = useState(1)
  const [shiftDay, setShiftDay] = useState(
    activeDay !== 'undated' ? activeDay : eventDateKeys[0] || ''
  )
  const [capacity, setCapacity] = useState(1)
  const [capacityName, setCapacityName] = useState('')
  const [capacityThisDayOnly, setCapacityThisDayOnly] = useState(true)
  const [stationOverseerId, setStationOverseerId] = useState('')
  const [stationKeymanId, setStationKeymanId] = useState('')
  const [shiftOverseerId, setShiftOverseerId] = useState('')
  const [shiftKeymanId, setShiftKeymanId] = useState('')
  const dayShiftRows = useMemo(() => {
    const rows: Array<{ key: string; label: string; shift: Shift; position: Position }> = []
    for (const position of positions) {
      for (const shift of position.shifts || []) {
        const day = toDateKey(shift.shiftDate) || 'undated'
        if (day !== activeDay) continue
        rows.push({
          key: `${position.id}:${shift.id}`,
          label: `#${position.positionNumber} ${positionDisplayName(position)} · ${shiftLabel(shift)}`,
          shift,
          position,
        })
      }
    }
    return rows
  }, [positions, activeDay])
  const [pickedShifts, setPickedShifts] = useState<Set<string>>(() => {
    if (initialShiftKeys && initialShiftKeys.length > 0) return new Set(initialShiftKeys)
    return new Set(dayShiftRows.map((row) => row.key))
  })
  const shiftRange = useShiftRangeSelection()

  const ids = positions.map((p) => p.id)
  const overseers = listEventOverseers(attendants)
  const keymen = listEventKeymen(attendants)
  const dayLabel =
    activeDay === 'undated' ? 'undated shifts' : formatEventDayLabel(activeDay)

  const guard = async (work: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    try {
      await work()
    } catch {
      notifyAlert('Bulk action failed')
    } finally {
      setBusy(false)
    }
  }

  const updateStations = () =>
    guard(async () => {
      if (!area.trim() && status === '') {
        notifyAlert('Enter an area or choose a status')
        return
      }
      const data: { area?: string; isActive?: boolean } = {}
      if (area.trim()) data.area = area.trim()
      if (status !== '') data.isActive = status === 'true'
      const result = await positionService.bulkUpdatePositions(ids, data)
      toast.success(
        `Updated ${result.successCount} of ${ids.length} station${ids.length === 1 ? '' : 's'}`
      )
      onDone()
    })

  const applyTemplate = () =>
    guard(async () => {
      if (!templateType) {
        notifyAlert('Choose a template')
        return
      }
      const ok = await positionService.applyShiftTemplate({
        positionIds: ids,
        templateType,
        volunteersNeeded: clampNeeded(templateNeeded),
      })
      if (!ok) {
        notifyAlert('Failed to apply template')
        return
      }
      toast.success(`Template applied to ${ids.length} station${ids.length === 1 ? '' : 's'}`)
      onDone()
    })

  const createShift = () =>
    guard(async () => {
      if (!shiftName.trim()) {
        notifyAlert('Enter a shift name')
        return
      }
      if (!shiftAllDay && (!shiftStart || !shiftEnd)) {
        notifyAlert('Enter start and end times, or mark the shift all day')
        return
      }
      if (eventDateKeys.length > 1 && !shiftDay) {
        notifyAlert('Choose a day for the new shift')
        return
      }
      const result = await positionService.bulkCreateShifts(ids, {
        name: shiftName.trim(),
        startTime: shiftAllDay ? null : shiftStart,
        endTime: shiftAllDay ? null : shiftEnd,
        isAllDay: shiftAllDay,
        volunteersNeeded: clampNeeded(shiftNeeded),
        shiftDate: shiftDay || null,
      })
      toast.success(
        `Created “${shiftName.trim()}” on ${result.successCount} of ${ids.length} stations`
      )
      onDone()
    })

  const updateCapacity = () =>
    guard(async () => {
      const needed = clampNeeded(capacity)
      const nameFilter = capacityName.trim().toLowerCase()
      let updated = 0
      for (const position of positions) {
        for (const shift of position.shifts || []) {
          if (capacityThisDayOnly) {
            const key = toDateKey(shift.shiftDate) || 'undated'
            if (key !== activeDay) continue
          }
          if (nameFilter && !(shift.name || '').toLowerCase().includes(nameFilter)) continue
          const ok = await positionService.updateShift(position.id, shift.id, {
            volunteersNeeded: needed,
          })
          if (ok) updated++
        }
      }
      if (updated === 0) {
        notifyAlert('No matching shifts to update')
        return
      }
      toast.success(`Set volunteers needed to ${needed} on ${updated} shift${updated === 1 ? '' : 's'}`)
      onDone()
    })

  const assignStationOversight = () =>
    guard(async () => {
      if (!stationOverseerId && !stationKeymanId) {
        notifyAlert('Choose a station overseer, a keyman, or both')
        return
      }
      if (positions.length === 0) {
        notifyAlert('No stations are included in this edit')
        return
      }
      let updated = 0
      for (const position of positions) {
        const current = position.oversight?.[0]
        const overseerId = stationOverseerId || current?.overseer?.id || undefined
        const keymanId = stationKeymanId || current?.keyman?.id || undefined
        const ok = await positionService.assignOversight(position.id, {
          overseerId,
          keymanId,
        })
        if (ok) updated++
      }
      if (updated === 0) {
        notifyAlert('Failed to assign station oversight')
        return
      }
      toast.success(`Station oversight saved on ${updated} station${updated === 1 ? '' : 's'}`)
      onDone()
    })

  const assignShiftRoles = () =>
    guard(async () => {
      if (!shiftOverseerId && !shiftKeymanId) {
        notifyAlert('Choose a shift overseer, a keyman, or both')
        return
      }
      if (pickedShifts.size === 0) {
        notifyAlert('Select at least one shift')
        return
      }
      let updated = 0
      let failed = 0
      const roles: Array<['OVERSEER' | 'KEYMAN', string]> = []
      if (shiftOverseerId) roles.push(['OVERSEER', shiftOverseerId])
      if (shiftKeymanId) roles.push(['KEYMAN', shiftKeymanId])

      for (const position of positions) {
        const shifts = (position.shifts || []).filter((shift) => {
          const key = toDateKey(shift.shiftDate) || 'undated'
          if (key !== activeDay) return false
          return pickedShifts.has(`${position.id}:${shift.id}`)
        })
        for (const shift of shifts) {
          for (const [role, volunteerId] of roles) {
            const existing = (position.assignments || []).find(
              (a) => a.shift?.id === shift.id && a.role === role
            )
            if (existing?.volunteer?.id === volunteerId) continue
            if (existing) {
              const removed = await fetch(
                `/api/events/${eventId}/assignments/${existing.id}`,
                { method: 'DELETE', credentials: 'include' }
              )
              if (!removed.ok) {
                failed++
                continue
              }
            }
            const res = await fetch(`/api/events/${eventId}/assignments`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                positionId: position.id,
                volunteerId,
                shiftId: shift.id,
                role,
              }),
            })
            if (res.ok) {
              updated++
            } else {
              failed++
              if (existing?.volunteer?.id) {
                await fetch(`/api/events/${eventId}/assignments`, {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    positionId: position.id,
                    volunteerId: existing.volunteer.id,
                    shiftId: shift.id,
                    role,
                  }),
                })
              }
            }
          }
        }
      }
      if (updated === 0 && failed === 0) {
        notifyAlert(`No shifts on ${dayLabel} needed a change`)
        return
      }
      toast.success(
        `Updated ${updated} shift role${updated === 1 ? '' : 's'}${
          failed ? ` (${failed} failed)` : ''
        }`
      )
      onDone()
    })

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div className="mx-auto my-4 w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Bulk edit · {positions.length} station{positions.length === 1 ? '' : 's'}
            </h3>
            <p className="text-sm text-gray-600">
              {positions.map((p) => `#${p.positionNumber} ${positionDisplayName(p)}`).join(', ')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-gray-500 hover:text-gray-800 touch-manipulation"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="mb-3 font-medium text-blue-950">Station details</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-gray-700">
                Area
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Leave blank to keep"
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="block text-sm text-gray-700">
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={`${fieldClass} mt-1`}
                >
                  <option value="">Keep current</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={updateStations}
                className="inline-flex min-h-[44px] items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 touch-manipulation"
              >
                Update stations
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <h4 className="mb-3 font-medium text-orange-950">Shifts</h4>
            <div className="space-y-4 rounded-md bg-white p-3">
              <p className="text-sm font-medium text-gray-900">Apply a template</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value)}
                  className={fieldClass}
                  aria-label="Shift template"
                >
                  <option value="">Choose a template…</option>
                  <option value="standard">Standard day</option>
                  <option value="extended">Extended day</option>
                  <option value="allday">All day</option>
                </select>
                <label className="text-sm text-gray-700">
                  Volunteers needed
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={templateNeeded}
                    onChange={(e) => setTemplateNeeded(Number(e.target.value))}
                    className={`${fieldClass} mt-1`}
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={applyTemplate}
                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 touch-manipulation"
                  >
                    Apply template
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-3 rounded-md bg-white p-3">
              <p className="text-sm font-medium text-gray-900">Create a shift on each selected station</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  placeholder="Shift name"
                  className={fieldClass}
                  aria-label="Shift name"
                />
                <label className="flex min-h-[44px] items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={shiftAllDay}
                    onChange={(e) => setShiftAllDay(e.target.checked)}
                    className="h-4 w-4"
                  />
                  All day
                </label>
                {!shiftAllDay && (
                  <>
                    <input
                      type="time"
                      value={shiftStart}
                      onChange={(e) => setShiftStart(e.target.value)}
                      className={fieldClass}
                      aria-label="Start time"
                    />
                    <input
                      type="time"
                      value={shiftEnd}
                      onChange={(e) => setShiftEnd(e.target.value)}
                      className={fieldClass}
                      aria-label="End time"
                    />
                  </>
                )}
                <label className="text-sm text-gray-700">
                  Volunteers needed
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={shiftNeeded}
                    onChange={(e) => setShiftNeeded(Number(e.target.value))}
                    className={`${fieldClass} mt-1`}
                  />
                </label>
                {eventDateKeys.length > 0 && (
                  <label className="text-sm text-gray-700">
                    Day
                    <select
                      value={shiftDay}
                      onChange={(e) => setShiftDay(e.target.value)}
                      className={`${fieldClass} mt-1`}
                    >
                      <option value="">Select a day…</option>
                      {eventDateKeys.map((key) => (
                        <option key={key} value={key}>
                          {formatEventDayLabel(key)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={createShift}
                  className="inline-flex min-h-[44px] items-center rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 touch-manipulation"
                >
                  Create shift
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-3 rounded-md bg-white p-3">
              <p className="text-sm font-medium text-gray-900">Volunteers needed</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className={fieldClass}
                  aria-label="Volunteers needed"
                />
                <input
                  value={capacityName}
                  onChange={(e) => setCapacityName(e.target.value)}
                  placeholder="Match shift name (optional)"
                  className={fieldClass}
                  aria-label="Match shift name"
                />
              </div>
              <label className="flex min-h-[44px] items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={capacityThisDayOnly}
                  onChange={(e) => setCapacityThisDayOnly(e.target.checked)}
                  className="h-4 w-4"
                />
                Only shifts on {dayLabel}
              </label>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={updateCapacity}
                  className="inline-flex min-h-[44px] items-center rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 touch-manipulation"
                >
                  Update capacity
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-green-200 bg-green-50 p-4">
            <h4 className="mb-1 font-medium text-green-950">Station overseer and keyman</h4>
            <p className="mb-3 text-sm text-green-900">
              Station oversight, separate from the person on each shift. A role you leave blank stays as it is.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-gray-700">
                Overseer
                <select
                  value={stationOverseerId}
                  onChange={(e) => setStationOverseerId(e.target.value)}
                  className={`${fieldClass} mt-1`}
                >
                  <option value="">No change</option>
                  {overseers.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.firstName} {person.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-gray-700">
                Keyman
                <select
                  value={stationKeymanId}
                  onChange={(e) => setStationKeymanId(e.target.value)}
                  className={`${fieldClass} mt-1`}
                >
                  <option value="">No change</option>
                  {keymen.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.firstName} {person.lastName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={assignStationOversight}
                className="inline-flex min-h-[44px] items-center rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50 touch-manipulation"
              >
                Save station oversight
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <h4 className="mb-1 font-medium text-indigo-950">Shift overseer and keyman</h4>
            <p className="mb-3 text-sm text-indigo-900">
              Choose the shifts on {dayLabel}, then set the people. An existing person in that role is replaced.
            </p>
            <div className="mb-3 max-h-48 space-y-1 overflow-y-auto rounded-md bg-white p-2">
              <div className="mb-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPickedShifts(new Set(dayShiftRows.map((row) => row.key)))}
                  className="min-h-[44px] rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm touch-manipulation"
                >
                  All shifts
                </button>
                <button
                  type="button"
                  onClick={() => setPickedShifts(new Set())}
                  className="min-h-[44px] rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm touch-manipulation"
                >
                  Clear shifts
                </button>
              </div>
              {dayShiftRows.length === 0 ? (
                <p className="px-1 py-2 text-sm text-gray-600">No shifts on {dayLabel}.</p>
              ) : (
                dayShiftRows.map((row, index) => (
                  <label
                    key={row.key}
                    className="flex min-h-[44px] items-center gap-2 px-1 text-sm text-gray-800 touch-manipulation"
                  >
                    <input
                      type="checkbox"
                      checked={pickedShifts.has(row.key)}
                      onClick={(e) => shiftRange.markClick(e)}
                      onChange={(e) => {
                        const ids = dayShiftRows.map((item) => item.key)
                        const handled = shiftRange.consumeRange(e, index, (lo, hi) => {
                          setPickedShifts((prev) => {
                            const next = new Set(prev)
                            ids.slice(lo, hi + 1).forEach((id) => next.add(id))
                            return next
                          })
                        })
                        if (handled) return
                        setPickedShifts((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(row.key)
                          else next.delete(row.key)
                          return next
                        })
                      }}
                      className="h-4 w-4"
                    />
                    {row.label}
                  </label>
                ))
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-gray-700">
                Shift overseer
                <select
                  value={shiftOverseerId}
                  onChange={(e) => setShiftOverseerId(e.target.value)}
                  className={`${fieldClass} mt-1`}
                >
                  <option value="">No change</option>
                  {overseers.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.firstName} {person.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-gray-700">
                Shift keyman
                <select
                  value={shiftKeymanId}
                  onChange={(e) => setShiftKeymanId(e.target.value)}
                  className={`${fieldClass} mt-1`}
                >
                  <option value="">No change</option>
                  {keymen.map((person) => (
                    <option key={`k-${person.id}`} value={person.id}>
                      {person.firstName} {person.lastName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={assignShiftRoles}
                className="inline-flex min-h-[44px] items-center rounded-md bg-indigo-700 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-50 touch-manipulation"
              >
                Set on {dayLabel}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
