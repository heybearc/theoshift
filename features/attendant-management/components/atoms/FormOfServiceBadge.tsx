import React from 'react'
import { FormOfService } from '../../types'

interface FormOfServiceBadgeProps {
  form: FormOfService
  className?: string
  size?: 'sm' | 'md'
}

const formColors: Record<FormOfService, string> = {
  'Elder': 'bg-purple-100 text-purple-800',
  'Ministerial Servant': 'bg-blue-100 text-blue-800',
  'Exemplary': 'bg-green-100 text-green-800',
  'Regular Pioneer': 'bg-yellow-100 text-yellow-800',
  'Other Department': 'bg-gray-100 text-gray-800'
}

const formAbbreviations: Record<FormOfService, string> = {
  'Elder': 'Elder',
  'Ministerial Servant': 'MS',
  'Exemplary': 'Exemplary',
  'Regular Pioneer': 'RP',
  'Other Department': 'Other'
}

export default function FormOfServiceBadge({ 
  form, 
  className = '', 
  size = 'sm' 
}: FormOfServiceBadgeProps) {
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-1 text-xs' 
    : 'px-3 py-1 text-sm'

  return (
    <span
      className={`
        inline-flex font-medium rounded-full
        ${formColors[form]}
        ${sizeClasses}
        ${className}
      `}
      title={form}
    >
      {formAbbreviations[form]}
    </span>
  )
}
