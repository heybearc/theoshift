import { ConventionDay } from '@/generated/prisma/browser'
import {
  EarlyEntrySchedule,
  formatCheckInSummary,
  formatEarlyEntrySummary,
  shortDayLabel,
} from '@/lib/ivsEarlyCheckin'

export type EarlyEntryDayControlsProps = {
  schedule: EarlyEntrySchedule
  checkIns?: Partial<Record<ConventionDay, { checkedInAt: string }>>
  disabled?: boolean
  compact?: boolean
  onChange: (schedule: EarlyEntrySchedule) => void
}

export function EarlyEntryDayControls({
  schedule,
  checkIns = {},
  disabled = false,
  compact = false,
  onChange,
}: EarlyEntryDayControlsProps) {
  const toggle = (key: keyof EarlyEntrySchedule) => {
    if (disabled) return
    onChange({ ...schedule, [key]: !schedule[key] })
  }

  const setAll = (value: boolean) => {
    if (disabled) return
    onChange({ friday: value, saturday: value, sunday: value })
  }

  const days: Array<{ key: keyof EarlyEntrySchedule; day: ConventionDay; label: string }> = [
    { key: 'friday', day: ConventionDay.FRIDAY, label: 'Fri' },
    { key: 'saturday', day: ConventionDay.SATURDAY, label: 'Sat' },
    { key: 'sunday', day: ConventionDay.SUNDAY, label: 'Sun' },
  ]

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex flex-wrap items-center gap-2">
        {days.map(({ key, day, label }) => {
          const checkedIn = Boolean(checkIns[day])
          const active = schedule[key]
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => toggle(key)}
              className={`min-h-[36px] rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? checkedIn
                    ? 'border-green-600 bg-green-100 text-green-900'
                    : 'border-indigo-600 bg-indigo-50 text-indigo-900'
                  : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              title={
                checkedIn
                  ? `${label}: checked in`
                  : active
                    ? `${label}: eligible, not checked in`
                    : `${label}: not eligible`
              }
            >
              {label}
              {checkedIn ? ' ✓' : active ? ' •' : ''}
            </button>
          )
        })}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setAll(true)}
          className="min-h-[36px] rounded-md border border-gray-300 px-2 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          All
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setAll(false)}
          className="min-h-[36px] rounded-md border border-gray-300 px-2 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          None
        </button>
      </div>
      {!compact && (
        <p className="text-xs text-gray-500">
          Eligible: {formatEarlyEntrySummary(schedule)}
          {Object.keys(checkIns).length > 0 && (
            <> · Check-in: {formatCheckInSummary(schedule, checkIns as any)}</>
          )}
        </p>
      )}
    </div>
  )
}

export function EarlyEntryStatusBadges({
  schedule,
  checkIns = {},
}: {
  schedule: EarlyEntrySchedule
  checkIns?: Partial<Record<ConventionDay, { checkedInAt: string }>>
}) {
  const days = [
    { key: 'friday' as const, day: ConventionDay.FRIDAY },
    { key: 'saturday' as const, day: ConventionDay.SATURDAY },
    { key: 'sunday' as const, day: ConventionDay.SUNDAY },
  ]

  return (
    <div className="flex flex-wrap gap-1">
      {days.map(({ key, day }) => {
        if (!schedule[key]) return null
        const checkedIn = Boolean(checkIns[day])
        return (
          <span
            key={key}
            className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${
              checkedIn ? 'bg-green-100 text-green-800' : 'bg-amber-50 text-amber-800'
            }`}
          >
            {shortDayLabel(day)}
            {checkedIn ? ' ✓' : ' …'}
          </span>
        )
      })}
    </div>
  )
}
