import { ConventionDay } from '@/generated/prisma/browser'
import type { Prisma } from '@/generated/prisma/client'
import { v4 as uuidv4 } from 'uuid'

export const CONVENTION_DAYS: ConventionDay[] = [
  ConventionDay.FRIDAY,
  ConventionDay.SATURDAY,
  ConventionDay.SUNDAY,
]

export const DEFAULT_CONVENTION_TIMEZONE =
  process.env.THEOSHIFT_CONVENTION_TIMEZONE || 'America/New_York'

export type EarlyEntrySchedule = {
  friday: boolean
  saturday: boolean
  sunday: boolean
}

export type DayCheckInRecord = {
  day: ConventionDay
  checkedInAt: string
  checkedInBy: string | null
  checkinNotes: string | null
}

export type EarlyCheckinVolunteerPayload = {
  id: string
  firstName: string
  lastName: string
  congregation: string
  /** IVS department label (ivsSubmittedBy) */
  department: string
  earlyEntry: EarlyEntrySchedule
  checkIns: Partial<Record<ConventionDay, DayCheckInRecord>>
  /** @deprecated use earlyEntry + checkIns */
  earlyCheckinEligible?: boolean
}

const DAY_LABELS: Record<ConventionDay, string> = {
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
}

const WEEKDAY_TO_CONVENTION: Record<string, ConventionDay | null> = {
  Friday: ConventionDay.FRIDAY,
  Saturday: ConventionDay.SATURDAY,
  Sunday: ConventionDay.SUNDAY,
}

export function conventionDayLabel(day: ConventionDay): string {
  return DAY_LABELS[day]
}

export function shortDayLabel(day: ConventionDay): string {
  return day === ConventionDay.FRIDAY ? 'Fri' : day === ConventionDay.SATURDAY ? 'Sat' : 'Sun'
}

export function getCurrentConventionDay(
  timezone: string = DEFAULT_CONVENTION_TIMEZONE,
  at: Date = new Date(),
): ConventionDay | null {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
  }).format(at)
  return WEEKDAY_TO_CONVENTION[weekday] ?? null
}

export function scheduleFromRecord(record: {
  earlyCheckinFriday?: boolean | null
  earlyCheckinSaturday?: boolean | null
  earlyCheckinSunday?: boolean | null
  earlyCheckinEligible?: boolean | null
}): EarlyEntrySchedule {
  const legacyAll = !!record.earlyCheckinEligible
  return {
    friday: record.earlyCheckinFriday ?? legacyAll,
    saturday: record.earlyCheckinSaturday ?? legacyAll,
    sunday: record.earlyCheckinSunday ?? legacyAll,
  }
}

export function isEligibleForDay(schedule: EarlyEntrySchedule, day: ConventionDay): boolean {
  if (day === ConventionDay.FRIDAY) return schedule.friday
  if (day === ConventionDay.SATURDAY) return schedule.saturday
  return schedule.sunday
}

export function hasAnyEarlyEligibility(schedule: EarlyEntrySchedule): boolean {
  return schedule.friday || schedule.saturday || schedule.sunday
}

export function syncLegacyEarlyCheckinFlag(schedule: EarlyEntrySchedule): boolean {
  return hasAnyEarlyEligibility(schedule)
}

export function scheduleToPrismaUpdate(
  schedule: EarlyEntrySchedule,
): Pick<
  Prisma.event_volunteersUpdateInput,
  'earlyCheckinFriday' | 'earlyCheckinSaturday' | 'earlyCheckinSunday' | 'earlyCheckinEligible'
> {
  const eligible = syncLegacyEarlyCheckinFlag(schedule)
  return {
    earlyCheckinFriday: schedule.friday,
    earlyCheckinSaturday: schedule.saturday,
    earlyCheckinSunday: schedule.sunday,
    earlyCheckinEligible: eligible,
  }
}

export function checkInsFromRows(
  rows: Array<{
    conventionDay: ConventionDay
    checkedInAt: Date
    checkedInBy: string | null
    checkinNotes: string | null
  }>,
): Partial<Record<ConventionDay, DayCheckInRecord>> {
  const out: Partial<Record<ConventionDay, DayCheckInRecord>> = {}
  for (const row of rows) {
    out[row.conventionDay] = {
      day: row.conventionDay,
      checkedInAt: row.checkedInAt.toISOString(),
      checkedInBy: row.checkedInBy,
      checkinNotes: row.checkinNotes,
    }
  }
  return out
}

export function isCheckedInForDay(
  checkIns: Partial<Record<ConventionDay, DayCheckInRecord>>,
  day: ConventionDay,
): boolean {
  return Boolean(checkIns[day])
}

export function formatEarlyEntrySummary(schedule: EarlyEntrySchedule): string {
  if (!hasAnyEarlyEligibility(schedule)) return 'No'
  const parts: string[] = []
  if (schedule.friday) parts.push('Fri')
  if (schedule.saturday) parts.push('Sat')
  if (schedule.sunday) parts.push('Sun')
  if (parts.length === 3) return 'All days'
  return parts.join(', ')
}

export function formatCheckInSummary(
  schedule: EarlyEntrySchedule,
  checkIns: Partial<Record<ConventionDay, DayCheckInRecord>>,
): string {
  const parts = CONVENTION_DAYS.filter((d) => isEligibleForDay(schedule, d)).map((d) => {
    const label = shortDayLabel(d)
    return isCheckedInForDay(checkIns, d) ? `${label} ✓` : `${label} —`
  })
  return parts.length ? parts.join(' · ') : '—'
}

export function parseEarlyEntryDaysInput(raw: string | undefined | null): EarlyEntrySchedule | null {
  if (raw == null) return null
  const normalized = raw.trim().toLowerCase()
  if (!normalized || normalized === 'no' || normalized === 'none' || normalized === 'false') {
    return { friday: false, saturday: false, sunday: false }
  }
  if (normalized === 'yes' || normalized === 'all' || normalized === 'all days') {
    return { friday: true, saturday: true, sunday: true }
  }
  const schedule: EarlyEntrySchedule = { friday: false, saturday: false, sunday: false }
  if (/\bfri/i.test(normalized)) schedule.friday = true
  if (/\bsat/i.test(normalized)) schedule.saturday = true
  if (/\bsun/i.test(normalized)) schedule.sunday = true
  if (!hasAnyEarlyEligibility(schedule)) return null
  return schedule
}

export function parseConventionDayParam(
  value: string | string[] | undefined,
): ConventionDay | 'TODAY' | null {
  if (!value || Array.isArray(value)) return 'TODAY'
  const upper = value.toUpperCase()
  if (upper === 'TODAY') return 'TODAY'
  if (CONVENTION_DAYS.includes(upper as ConventionDay)) return upper as ConventionDay
  return null
}

export function resolveViewDay(
  param: ConventionDay | 'TODAY' | null,
  timezone: string = DEFAULT_CONVENTION_TIMEZONE,
): ConventionDay | null {
  if (param && param !== 'TODAY') return param
  return getCurrentConventionDay(timezone)
}

type EventVolunteerWithCheckins = {
  id: string
  earlyCheckinFriday: boolean
  earlyCheckinSaturday: boolean
  earlyCheckinSunday: boolean
  earlyCheckinEligible: boolean | null
  ivsSubmittedBy?: string | null
  volunteer: { firstName: string; lastName: string; congregation: string } | null
  earlyCheckins: Array<{
    conventionDay: ConventionDay
    checkedInAt: Date
    checkedInBy: string | null
    checkinNotes: string | null
  }>
}

export function mapVolunteerEarlyCheckinPayload(
  ev: EventVolunteerWithCheckins,
): EarlyCheckinVolunteerPayload {
  const earlyEntry = scheduleFromRecord(ev)
  const checkIns = checkInsFromRows(ev.earlyCheckins)
  return {
    id: ev.id,
    firstName: ev.volunteer?.firstName || '',
    lastName: ev.volunteer?.lastName || '',
    congregation: ev.volunteer?.congregation || '',
    department: ev.ivsSubmittedBy || '',
    earlyEntry,
    checkIns,
    earlyCheckinEligible: hasAnyEarlyEligibility(earlyEntry),
  }
}

export async function upsertDayCheckIn(
  tx: Prisma.TransactionClient,
  eventVolunteerId: string,
  day: ConventionDay,
  checkedInBy: string,
  checkinNotes?: string | null,
) {
  const existing = await tx.event_volunteer_early_checkins.findUnique({
    where: {
      eventVolunteerId_conventionDay: { eventVolunteerId, conventionDay: day },
    },
  })
  if (existing) {
    throw new Error(`Already checked in for ${conventionDayLabel(day)}`)
  }
  await tx.event_volunteer_early_checkins.create({
    data: {
      id: uuidv4(),
      eventVolunteerId,
      conventionDay: day,
      checkedInBy,
      checkinNotes: checkinNotes ?? null,
    },
  })
}

export async function deleteDayCheckIn(
  tx: Prisma.TransactionClient,
  eventVolunteerId: string,
  day: ConventionDay,
) {
  await tx.event_volunteer_early_checkins.deleteMany({
    where: { eventVolunteerId, conventionDay: day },
  })
}

export const earlyCheckinInclude = {
  volunteer: true,
  earlyCheckins: true,
} as const

export function earlyEligibilityWhere(): Prisma.event_volunteersWhereInput {
  return {
    OR: [
      { earlyCheckinFriday: true },
      { earlyCheckinSaturday: true },
      { earlyCheckinSunday: true },
      { earlyCheckinEligible: true },
    ],
  }
}
