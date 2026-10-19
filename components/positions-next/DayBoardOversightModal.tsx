import React, { useMemo, useState } from 'react'
import { createPositionService } from '../../lib/positionService'
import { notifyAlert, toast } from '../../lib/ui/toast'
import { listEventKeymen, listEventOverseers } from './eventOversightOptions'
import type { Position, Volunteer } from './types'
import { positionDisplayName } from './types'

type Props = {
  eventId: string
  position: Position
  attendants: Volunteer[]
  onClose: () => void
  onSaved: () => void
}

export default function DayBoardOversightModal({
  eventId,
  position,
  attendants,
  onClose,
  onSaved,
}: Props) {
  const positionService = useMemo(() => createPositionService(eventId), [eventId])
  const existing = position.oversight?.[0]
  const [overseerId, setOverseerId] = useState(existing?.overseer?.id || '')
  const [keymanId, setKeymanId] = useState(existing?.keyman?.id || '')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const overseers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return listEventOverseers(attendants).filter((person) => {
      if (!q) return true
      return `${person.firstName} ${person.lastName}`.toLowerCase().includes(q)
    })
  }, [attendants, search])
  const keymen = useMemo(() => {
    const q = search.trim().toLowerCase()
    return listEventKeymen(attendants).filter((person) => {
      if (!q) return true
      return `${person.firstName} ${person.lastName}`.toLowerCase().includes(q)
    })
  }, [attendants, search])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!overseerId) {
      notifyAlert('Select a position overseer')
      return
    }
    setSaving(true)
    try {
      const ok = await positionService.assignOversight(position.id, {
        overseerId,
        keymanId: keymanId || undefined,
      })
      if (!ok) {
        notifyAlert('Failed to save oversight')
        return
      }
      toast.success('Position oversight saved')
      onSaved()
    } catch {
      notifyAlert('Failed to save oversight')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl">
        <form onSubmit={handleSave}>
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Position oversight
            </h3>
            <p className="text-sm text-gray-600">
              #{position.positionNumber} {positionDisplayName(position)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Station-level overseer/keyman (separate from per-shift roles).
            </p>
          </div>
          <div className="space-y-3 px-4 py-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter overseers and keymen…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 min-h-[44px] text-base sm:text-sm"
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Overseer *
              </label>
              <select
                value={overseerId}
                onChange={(e) => setOverseerId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 min-h-[44px] text-base sm:text-sm"
                required
              >
                <option value="">Select…</option>
                {overseers.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.firstName} {a.lastName}
                  </option>
                ))}
              </select>
              {overseers.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">No overseers on this event.</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Keyman
              </label>
              <select
                value={keymanId}
                onChange={(e) => setKeymanId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 min-h-[44px] text-base sm:text-sm"
              >
                <option value="">None</option>
                {keymen.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.firstName} {a.lastName}
                  </option>
                ))}
              </select>
              {keymen.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">No keymen on this event.</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-md border border-gray-300 px-4 py-2 text-sm touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 touch-manipulation"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
