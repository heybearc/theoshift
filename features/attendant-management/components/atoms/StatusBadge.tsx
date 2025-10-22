import React from 'react'

interface StatusBadgeProps {
  isActive: boolean
  className?: string
}

export default function StatusBadge({ isActive, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`
        inline-flex px-2 py-1 text-xs font-semibold rounded-full
        ${isActive 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
        }
        ${className}
      `}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}
