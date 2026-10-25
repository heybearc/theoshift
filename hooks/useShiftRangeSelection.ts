import { useRef } from 'react'

/**
 * Ids covered by a shift-click from `anchor` through `index`, inclusive.
 * Order follows the list on screen.
 */
export function idsInShiftRange(
  ids: string[],
  anchor: number,
  index: number
): string[] {
  const lo = Math.min(anchor, index)
  const hi = Math.max(anchor, index)
  return ids.slice(lo, hi + 1)
}

/**
 * Shift-click selects every row from the anchor through the clicked row.
 * The browser toggles the clicked box before React runs. Forcing
 * `checked` keeps that last box checked on screen.
 */
export function useShiftRangeSelection() {
  const anchorRef = useRef<number | null>(null)
  const shiftRef = useRef(false)

  const markClick = (event: { shiftKey: boolean }) => {
    shiftRef.current = event.shiftKey
  }

  const clearAnchor = () => {
    anchorRef.current = null
  }

  const consumeRange = (
    event: { target: { checked: boolean } },
    index: number,
    applyRange: (lo: number, hi: number) => void
  ): boolean => {
    const anchor = anchorRef.current
    const shift = shiftRef.current
    shiftRef.current = false
    anchorRef.current = index
    if (!shift || anchor === null) return false
    const lo = Math.min(anchor, index)
    const hi = Math.max(anchor, index)
    applyRange(lo, hi)
    event.target.checked = true
    return true
  }

  return { markClick, consumeRange, clearAnchor }
}
