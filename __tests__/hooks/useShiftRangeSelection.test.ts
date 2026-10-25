import { idsInShiftRange } from '../../hooks/useShiftRangeSelection'

describe('idsInShiftRange', () => {
  const ids = ['a', 'b', 'c', 'd']

  it('includes the last id when selecting downward', () => {
    expect(idsInShiftRange(ids, 0, 2)).toEqual(['a', 'b', 'c'])
  })

  it('includes the last id when selecting upward', () => {
    expect(idsInShiftRange(ids, 3, 1)).toEqual(['b', 'c', 'd'])
  })

  it('includes a single id when the click is the anchor', () => {
    expect(idsInShiftRange(ids, 2, 2)).toEqual(['c'])
  })
})
