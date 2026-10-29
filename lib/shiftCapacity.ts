/**
 * Shift capacity helpers (Option C).
 * Default volunteersNeeded=1 preserves legacy one-person-per-shift behavior.
 */

export type ShiftCapacityLike = {
  volunteersNeeded?: number | null
}

export type AssignmentCapacityLike = {
  role?: string | null
  shift?: { id: string } | null
  shiftId?: string | null
}

export function getShiftVolunteersNeeded(shift: ShiftCapacityLike | null | undefined): number {
  const needed = shift?.volunteersNeeded
  if (typeof needed !== 'number' || !Number.isFinite(needed) || needed < 1) {
    return 1
  }
  return Math.floor(needed)
}

/** Clamp capacity for create/update forms (1–50). */
export function clampVolunteersNeeded(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return 1
  return Math.max(1, Math.min(50, Math.floor(n)))
}

/** Count shift volunteers. Overseer and keyman are oversight, not a filled slot. */
export function countShiftAssignments(
  assignments: AssignmentCapacityLike[] | null | undefined,
  shiftId: string
): number {
  if (!assignments?.length) return 0
  return assignments.filter(a => {
    if ((a.shift?.id || a.shiftId) !== shiftId) return false
    const role = (a.role || '').toUpperCase()
    return role !== 'OVERSEER' && role !== 'KEYMAN'
  }).length
}

export function getOpenShiftSlots(
  shift: ShiftCapacityLike & { id: string },
  assignments: AssignmentCapacityLike[] | null | undefined
): number {
  const needed = getShiftVolunteersNeeded(shift)
  const filled = countShiftAssignments(assignments, shift.id)
  return Math.max(0, needed - filled)
}

export function isShiftFullyStaffed(
  shift: ShiftCapacityLike & { id: string },
  assignments: AssignmentCapacityLike[] | null | undefined
): boolean {
  return getOpenShiftSlots(shift, assignments) === 0
}

/** Slot-based fill ratio for progress (0–1). */
export function getPositionSlotFillRatio(
  shifts: Array<ShiftCapacityLike & { id: string }> | null | undefined,
  assignments: AssignmentCapacityLike[] | null | undefined
): { filled: number; needed: number; percentage: number } {
  if (!shifts?.length) {
    return { filled: 0, needed: 0, percentage: 0 }
  }
  let filled = 0
  let needed = 0
  for (const shift of shifts) {
    const need = getShiftVolunteersNeeded(shift)
    needed += need
    filled += Math.min(need, countShiftAssignments(assignments, shift.id))
  }
  const percentage = needed > 0 ? Math.round((filled / needed) * 100) : 0
  return { filled, needed, percentage }
}
