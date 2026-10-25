import React, { useMemo, useState } from 'react'
import { useShiftRangeSelection } from '../../hooks/useShiftRangeSelection'
import { createPositionService } from '../../lib/positionService'
import { notifyAlert, toast } from '../../lib/ui/toast'
import type { Position } from './types'
import { positionDisplayName } from './types'

const TEMPLATES: Array<{ id: string; label: string; detail: string }> = [
  { id: 'allday', label: 'All Day', detail: 'One all-day shift' },
  {
    id: 'standard',
    label: 'Standard',
    detail: 'Morning 1–2 + Afternoon 1–2',
  },
  {
    id: 'extended',
    label: 'Extended',
    detail: 'Five timed shifts through the day',
  },
]

type Props = {
  eventId: string
  positions: Position[]
  onClose: () => void
  onApplied: () => void
}

/**
 * Thin setup action: pick stations + template. No classic multi-select chrome.
 */
export default function DayBoardApplyTemplateModal({
  eventId,
  positions,
  onClose,
  onApplied,
}: Props) {
  const positionService = useMemo(() => createPositionService(eventId), [eventId])
  const active = useMemo(
    () => positions.filter((p) => p.isActive),
    [positions]
  )
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [templateType, setTemplateType] = useState('allday')
  const [volunteersNeeded, setVolunteersNeeded] = useState(1)
  const [applying, setApplying] = useState(false)
  const stationRange = useShiftRangeSelection()

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(active.map((p) => p.id)))
  const clear = () => setSelected(new Set())

  const handleApply = async () => {
    if (selected.size === 0) {
      notifyAlert('Select at least one station')
      return
    }
    setApplying(true)
    try {
      const ok = await positionService.applyShiftTemplate({
        positionIds: Array.from(selected),
        templateType,
        volunteersNeeded: Math.max(1, Math.min(50, volunteersNeeded)),
      })
      if (!ok) {
        notifyAlert('Failed to apply template')
        return
      }
      toast.success(`Template applied to ${selected.size} station(s)`)
      onApplied()
    } catch {
      notifyAlert('Failed to apply template')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">Apply shift template</h3>
          <p className="text-sm text-gray-600">
            Adds shifts to selected stations. Does not replace existing shifts.
          </p>
        </div>
        <div className="space-y-4 overflow-y-auto px-4 py-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Template
            </label>
            <div className="space-y-2">
              {TEMPLATES.map((t) => (
                <label
                  key={t.id}
                  className={`flex min-h-[44px] cursor-pointer items-start gap-2 rounded-md border px-3 py-2 touch-manipulation ${
                    templateType === t.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    checked={templateType === t.id}
                    onChange={() => setTemplateType(t.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">
                      {t.label}
                    </span>
                    <span className="block text-xs text-gray-500">{t.detail}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Volunteers needed per shift
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={volunteersNeeded}
              onChange={(e) =>
                setVolunteersNeeded(parseInt(e.target.value, 10) || 1)
              }
              className="w-28 rounded-md border border-gray-300 px-3 py-2 min-h-[44px] text-base sm:text-sm"
            />
          </div>
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-700">
                Stations ({selected.size} selected)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:text-blue-800 min-h-[44px] px-2 touch-manipulation"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clear}
                  className="text-sm text-gray-600 hover:text-gray-800 min-h-[44px] px-2 touch-manipulation"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
              {active.map((p, index) => (
                <label
                  key={p.id}
                  className="flex min-h-[44px] items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50 touch-manipulation"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onClick={(e) => stationRange.markClick(e)}
                    onChange={(e) => {
                      const ids = active.map((row) => row.id)
                      const handled = stationRange.consumeRange(e, index, (lo, hi) => {
                        setSelected((prev) => {
                          const next = new Set(prev)
                          ids.slice(lo, hi + 1).forEach((id) => next.add(id))
                          return next
                        })
                      })
                      if (!handled) toggle(p.id)
                    }}
                    className="h-4 w-4"
                  />
                  <span>
                    #{p.positionNumber} {positionDisplayName(p)}
                    {(p.shifts?.length || 0) > 0
                      ? ` · ${p.shifts!.length} shift(s)`
                      : ' · no shifts'}
                  </span>
                </label>
              ))}
              {active.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500">
                  No active stations
                </p>
              )}
            </div>
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
            type="button"
            disabled={applying || selected.size === 0}
            onClick={handleApply}
            className="min-h-[44px] rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 touch-manipulation"
          >
            {applying ? 'Applying…' : `Apply to ${selected.size || 0}`}
          </button>
        </div>
      </div>
    </div>
  )
}
