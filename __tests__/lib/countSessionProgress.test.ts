import { countSessionProgress } from '../../src/lib/countSessionReporting'

describe('countSessionProgress', () => {
  it('counts a submitted zero and leaves an unsubmitted group pending', () => {
    const result = countSessionProgress({
      groups: [{ attendeeCount: 0 }, { attendeeCount: null }],
      ungrouped: [],
      positionCounts: [],
    })
    expect(result).toEqual({ total: 2, counted: 1, pending: 1 })
  })

  it('includes group submissions when individual station rows also exist', () => {
    const result = countSessionProgress({
      groups: [{ attendeeCount: 40 }, { attendeeCount: null }],
      ungrouped: [{ attendeeCount: 12 }],
      positionCounts: [{ attendeeCount: 12 }, { attendeeCount: 3 }],
    })
    expect(result).toEqual({ total: 3, counted: 2, pending: 1 })
  })

  it('uses station rows when the session has no groups', () => {
    const result = countSessionProgress({
      groups: [],
      ungrouped: [],
      positionCounts: [{ attendeeCount: 0 }, { attendeeCount: null }],
    })
    expect(result).toEqual({ total: 2, counted: 1, pending: 1 })
  })
})
