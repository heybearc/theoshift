export type DayKey = string | 'undated'

export type AssignmentRole = 'VOLUNTEER' | 'OVERSEER' | 'KEYMAN'

export type Assignment = {
  id: string
  role: string
  volunteer?: {
    id: string
    firstName: string
    lastName: string
    user?: { role?: string } | null
  } | null
  attendant?: { id: string; firstName: string; lastName: string } | null
  shift?: {
    id: string
    name: string
    startTime?: string | null
    endTime?: string | null
    isAllDay: boolean
    shiftDate?: string | Date | null
  } | null
}

export type Shift = {
  id: string
  name: string
  startTime?: string | null
  endTime?: string | null
  isAllDay: boolean
  volunteersNeeded?: number
  shiftDate?: string | null
}

export type Position = {
  id: string
  name: string
  positionName?: string
  positionNumber: number
  isActive: boolean
  area?: string | null
  description?: string | null
  shifts?: Shift[]
  assignments?: Assignment[]
  oversight?: Array<{
    id?: string
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
  }>
}

export type Volunteer = {
  id: string
  firstName: string
  lastName: string
  congregation?: string | null
  isActive?: boolean
  isOverseer?: boolean
  isKeyman?: boolean
  formsOfService?: unknown
  user?: { role: string } | null
  overseerId?: string | null
  keymanId?: string | null
}

export type AssignTarget = {
  position: Position
  shift: Shift
  role: AssignmentRole
}

export function personName(a: Assignment): string {
  const p = a.volunteer || a.attendant
  return p ? `${p.firstName} ${p.lastName}` : 'Unknown'
}

export function formatTime12Hour(time24: string): string {
  if (!time24) return ''
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${hour12}:${minutes} ${ampm}`
}

export function shiftLabel(shift: Shift): string {
  if (shift.isAllDay) return `${shift.name} · All day`
  if (shift.startTime) {
    return `${shift.name} · ${formatTime12Hour(shift.startTime)} – ${formatTime12Hour(
      shift.endTime || ''
    )}`
  }
  return shift.name
}

export function positionDisplayName(p: Position): string {
  return p.name || p.positionName || `Position ${p.positionNumber}`
}
