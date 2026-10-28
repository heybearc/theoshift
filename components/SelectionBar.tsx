import { ReactNode } from 'react'

type SelectionBarProps = {
  count: number
  singular: string
  plural?: string
  /** Replaces the default "{count} {noun} selected" label. */
  label?: string
  children?: ReactNode
}

export default function SelectionBar({
  count,
  singular,
  plural,
  label,
  children,
}: SelectionBarProps) {
  if (count <= 0) return null
  const noun = count === 1 ? singular : plural ?? `${singular}s`
  const text = label ?? `${count} ${noun} selected`

  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-blue-200 bg-blue-50 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:bottom-0">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <span className="shrink-0 text-sm font-semibold text-blue-950">{text}</span>
        {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
    </div>
  )
}
