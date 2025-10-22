import React, { useState } from 'react'
import { FormOfService, FORMS_OF_SERVICE } from '../src/types/attendant'

interface FormsOfServiceSelectProps {
  selectedForms: FormOfService[]
  onChange: (forms: FormOfService[]) => void
  disabled?: boolean
  className?: string
  label?: string
  required?: boolean
}

export default function FormsOfServiceSelect({
  selectedForms,
  onChange,
  disabled = false,
  className = '',
  label = 'Forms of Service',
  required = false
}: FormsOfServiceSelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggleForm = (form: FormOfService) => {
    if (selectedForms.includes(form)) {
      onChange(selectedForms.filter(f => f !== form))
    } else {
      onChange([...selectedForms, form])
    }
  }

  const handleSelectAll = () => {
    onChange(FORMS_OF_SERVICE)
  }

  const handleClearAll = () => {
    onChange([])
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'}
            ${selectedForms.length === 0 ? 'text-gray-500' : 'text-gray-900'}
          `}
        >
          <div className="flex items-center justify-between">
            <span className="block truncate">
              {selectedForms.length === 0 
                ? 'Select forms of service...' 
                : selectedForms.length === 1
                ? selectedForms[0]
                : `${selectedForms.length} forms selected`
              }
            </span>
            <svg
              className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
            <div className="py-1">
              {/* Quick Actions */}
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Form Options */}
              <div className="max-h-60 overflow-y-auto">
                {FORMS_OF_SERVICE.map((form) => (
                  <label
                    key={form}
                    className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedForms.includes(form)}
                      onChange={() => handleToggleForm(form)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-900">{form}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Forms Display */}
      {selectedForms.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selectedForms.map((form) => (
            <span
              key={form}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
            >
              {form}
              <button
                type="button"
                onClick={() => handleToggleForm(form)}
                className="ml-1 h-3 w-3 rounded-full hover:bg-blue-200 flex items-center justify-center"
              >
                <svg className="h-2 w-2" fill="currentColor" viewBox="0 0 8 8">
                  <path d="M1.41 0l-1.41 1.41.72.72 1.78 1.81-1.78 1.81-.72.72 1.41 1.41.72-.72 1.81-1.78 1.81 1.78.72.72 1.41-1.41-.72-.72-1.78-1.81 1.78-1.81.72-.72-1.41-1.41-.72.72-1.81 1.78-1.81-1.78-.72-.72z"/>
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
