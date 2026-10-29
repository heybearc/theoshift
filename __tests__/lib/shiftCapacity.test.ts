import {
  countShiftAssignments,
  getOpenShiftSlots,
  getPositionSlotFillRatio,
  getShiftVolunteersNeeded,
  isShiftFullyStaffed
} from '../../lib/shiftCapacity'

describe('shiftCapacity', () => {
  it('defaults volunteersNeeded to 1', () => {
    expect(getShiftVolunteersNeeded({})).toBe(1)
    expect(getShiftVolunteersNeeded({ volunteersNeeded: null })).toBe(1)
    expect(getShiftVolunteersNeeded({ volunteersNeeded: 0 })).toBe(1)
    expect(getShiftVolunteersNeeded({ volunteersNeeded: 4 })).toBe(4)
  })

  it('counts shift volunteers and ignores overseer and keyman', () => {
    const assignments = [
      { role: 'OVERSEER', shift: { id: 's1' } },
      { role: 'KEYMAN', shift: { id: 's1' } },
      { role: 'VOLUNTEER', shift: { id: 's1' } },
      { role: 'VOLUNTEER', shift: { id: 's2' } }
    ]
    expect(countShiftAssignments(assignments, 's1')).toBe(1)
    expect(getOpenShiftSlots({ id: 's1', volunteersNeeded: 1 }, assignments)).toBe(0)
    expect(getOpenShiftSlots({ id: 's1', volunteersNeeded: 4 }, assignments)).toBe(3)
    expect(isShiftFullyStaffed({ id: 's1', volunteersNeeded: 1 }, assignments)).toBe(true)
    expect(isShiftFullyStaffed({ id: 's1', volunteersNeeded: 2 }, assignments)).toBe(false)
  })

  it('computes position slot fill ratio', () => {
    const shifts = [
      { id: 's1', volunteersNeeded: 4 },
      { id: 's2', volunteersNeeded: 1 }
    ]
    const assignments = [
      { role: 'VOLUNTEER', shift: { id: 's1' } },
      { role: 'VOLUNTEER', shift: { id: 's1' } },
      { role: 'VOLUNTEER', shift: { id: 's2' } }
    ]
    expect(getPositionSlotFillRatio(shifts, assignments)).toEqual({
      filled: 3,
      needed: 5,
      percentage: 60
    })
  })
})
