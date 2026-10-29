import { volunteerVisibleCountSessions } from '../../src/lib/volunteerCountVisibility'

const hour = 60 * 60 * 1000

function at(iso: string) {
  return new Date(iso)
}

describe('volunteerVisibleCountSessions', () => {
  const morning = { id: 'morning', countTime: '2026-10-29T14:00:00.000Z' }
  const afternoon = { id: 'afternoon', countTime: '2026-10-29T18:00:00.000Z' }

  it('shows a single assigned session even before its count time', () => {
    const result = volunteerVisibleCountSessions([afternoon], at('2026-10-29T13:00:00.000Z'))
    expect([...result.visibleIds]).toEqual(['afternoon'])
    expect(result.nextRevealAt).toBeNull()
  })

  it('hides a later count until its own count time', () => {
    const beforeMorning = volunteerVisibleCountSessions(
      [morning, afternoon],
      at('2026-10-29T13:30:00.000Z')
    )
    expect([...beforeMorning.visibleIds]).toEqual(['morning'])
    expect(beforeMorning.nextRevealAt?.toISOString()).toBe(afternoon.countTime)

    const duringGap = volunteerVisibleCountSessions(
      [morning, afternoon],
      at('2026-10-29T16:00:00.000Z')
    )
    expect([...duringGap.visibleIds]).toEqual(['morning'])

    const atAfternoon = volunteerVisibleCountSessions(
      [morning, afternoon],
      at('2026-10-29T18:00:00.000Z')
    )
    expect([...atAfternoon.visibleIds]).toEqual(['afternoon'])
    expect(atAfternoon.nextRevealAt).toBeNull()
  })

  it('holds a count that is less than an hour after the previous one', () => {
    const first = { id: 'first', countTime: '2026-10-29T14:00:00.000Z' }
    const second = { id: 'second', countTime: '2026-10-29T14:30:00.000Z' }
    const duringFirst = volunteerVisibleCountSessions(
      [first, second],
      at('2026-10-29T14:20:00.000Z')
    )
    expect([...duringFirst.visibleIds]).toEqual(['first'])
    expect(duringFirst.nextRevealAt?.getTime()).toBe(at(first.countTime).getTime() + hour)

    const afterHandoff = volunteerVisibleCountSessions(
      [first, second],
      new Date(at(first.countTime).getTime() + hour)
    )
    expect([...afterHandoff.visibleIds]).toEqual(['second'])
  })

  it('keeps sessions that share a count time together', () => {
    const a = { id: 'a', countTime: morning.countTime }
    const b = { id: 'b', countTime: morning.countTime }
    const result = volunteerVisibleCountSessions([b, a], at('2026-10-29T13:00:00.000Z'))
    expect(result.visibleIds).toEqual(new Set(['a', 'b']))
  })

  it('leaves a session with no count time visible', () => {
    const unscheduled = { id: 'open', countTime: null }
    const result = volunteerVisibleCountSessions(
      [unscheduled, afternoon],
      at('2026-10-29T12:00:00.000Z')
    )
    expect(result.visibleIds.has('open')).toBe(true)
    expect(result.visibleIds.has('afternoon')).toBe(true)
  })
})
