import { shiftsConflict, sameShiftDay, toDateKey } from '../../lib/shiftConflict'
import { addDaysToDateKey, daysBetweenDateKeys, enumerateEventDateKeys, isMultiDayEvent } from '../../lib/eventDates'

describe('shiftConflict', () => {
  it('does not conflict across different days with same clock times', () => {
    expect(
      shiftsConflict(
        { startTime: '08:00', endTime: '10:00', shiftDate: '2026-07-31' },
        { startTime: '08:00', endTime: '10:00', shiftDate: '2026-08-01' }
      )
    ).toBe(false)
  })

  it('conflicts on the same day when times overlap', () => {
    expect(
      shiftsConflict(
        { startTime: '08:00', endTime: '10:00', shiftDate: '2026-07-31' },
        { startTime: '09:00', endTime: '11:00', shiftDate: '2026-07-31' }
      )
    ).toBe(true)
  })

  it('treats undated shifts as same day (legacy)', () => {
    expect(sameShiftDay({ shiftDate: null }, { shiftDate: null })).toBe(true)
    expect(
      shiftsConflict(
        { startTime: '08:00', endTime: '10:00' },
        { startTime: '09:00', endTime: '11:00' }
      )
    ).toBe(true)
  })

  it('all-day only conflicts same day', () => {
    expect(
      shiftsConflict(
        { isAllDay: true, shiftDate: '2026-07-31' },
        { startTime: '08:00', endTime: '10:00', shiftDate: '2026-08-01' }
      )
    ).toBe(false)
    expect(
      shiftsConflict(
        { isAllDay: true, shiftDate: '2026-07-31' },
        { startTime: '08:00', endTime: '10:00', shiftDate: '2026-07-31' }
      )
    ).toBe(true)
  })

  it('normalizes ISO date strings', () => {
    expect(toDateKey('2026-07-31T12:00:00.000Z')).toBe('2026-07-31')
  })
})

describe('eventDates', () => {
  it('enumerates inclusive multi-day range', () => {
    expect(enumerateEventDateKeys('2026-07-31', '2026-08-02')).toEqual([
      '2026-07-31',
      '2026-08-01',
      '2026-08-02'
    ])
    expect(isMultiDayEvent('2026-07-31', '2026-08-02')).toBe(true)
    expect(isMultiDayEvent('2026-07-31', '2026-07-31')).toBe(false)
  })

  it('moves a shift day by the same amount as the event start date', () => {
    const delta = daysBetweenDateKeys('2026-10-31', '2027-05-16')
    expect(addDaysToDateKey('2026-10-31', delta)).toBe('2027-05-16')
    expect(addDaysToDateKey('2026-11-01', delta)).toBe('2027-05-17')
  })
})
