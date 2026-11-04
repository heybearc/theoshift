import { useEffect, useState } from 'react'
import { addDaysToDateKey, daysBetweenDateKeys } from '../lib/eventDates'

interface CloneEventModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (options: CloneOptions) => void
  eventName: string
  startDate?: string | null
  endDate?: string | null
  submitError?: string
}

function dateInputValue(value?: string | null): string {
  if (!value) return ''
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : ''
}

export interface CloneOptions {
  name: string
  clonePositions: boolean
  cloneVolunteers: boolean
  cloneAssignments: boolean
  cloneLanyards: boolean
  clonePermissions: boolean
  cloneSettings: boolean
  cloneOversight: boolean
  cloneDocuments: boolean
  startDate?: string
  endDate?: string
}

export default function CloneEventModal({
  isOpen,
  onClose,
  onConfirm,
  eventName,
  startDate,
  endDate,
  submitError,
}: CloneEventModalProps) {
  const [options, setOptions] = useState<CloneOptions>({
    name: `${eventName} (Copy)`,
    clonePositions: true,
    cloneVolunteers: false, // Unchecked by default per requirements
    cloneAssignments: false,
    cloneLanyards: true,
    clonePermissions: true,
    cloneSettings: true,
    cloneOversight: true,
    cloneDocuments: true,
    startDate: dateInputValue(startDate),
    endDate: dateInputValue(endDate || startDate),
  })
  const [dateError, setDateError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setDateError('')
    setOptions((prev) => ({
      ...prev,
      name: `${eventName} (Copy)`,
      startDate: dateInputValue(startDate),
      endDate: dateInputValue(endDate || startDate),
    }))
  }, [isOpen, eventName, startDate, endDate])

  if (!isOpen) return null

  const updateStartDate = (value: string) => {
    setDateError('')
    setOptions((prev) => {
      const previousStart = prev.startDate || dateInputValue(startDate)
      const previousEnd = prev.endDate || dateInputValue(endDate || startDate)
      let nextEnd = previousEnd
      if (previousStart && value && previousEnd) {
        const delta = daysBetweenDateKeys(previousStart, value)
        nextEnd = addDaysToDateKey(previousEnd, delta)
      }
      return { ...prev, startDate: value, endDate: nextEnd }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!options.startDate || !options.endDate) {
      setDateError('Choose a start and end date for the new event.')
      return
    }
    if (options.endDate < options.startDate) {
      setDateError('The end date has to be on or after the start date.')
      return
    }
    onConfirm(options)
  }

  const toggleOption = (key: keyof CloneOptions) => {
    if (key === 'name') return
    setOptions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-lg">
            <h2 className="text-xl font-bold text-white">Clone Event</h2>
            <p className="text-blue-100 text-sm mt-1">Choose what to include in the cloned event</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Event Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Event Name *
              </label>
              <input
                type="text"
                value={options.name}
                onChange={(e) => setOptions(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">New event dates</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cloneStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start date
                  </label>
                  <input
                    id="cloneStartDate"
                    type="date"
                    value={options.startDate || ''}
                    onChange={(e) => updateStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="cloneEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End date
                  </label>
                  <input
                    id="cloneEndDate"
                    type="date"
                    value={options.endDate || ''}
                    onChange={(e) => {
                      setDateError('')
                      setOptions((prev) => ({ ...prev, endDate: e.target.value }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {options.clonePositions
                  ? 'Shifts move with the start date. Change the end date if the new event is shorter or longer. You can move them again later by editing the event dates and saving.'
                  : 'The new event uses these dates. Turn on Positions & Shifts if the schedule should move with the start date.'}
              </p>
              {dateError ? <p className="mt-2 text-sm text-red-600">{dateError}</p> : null}
              {submitError ? <p className="mt-2 text-sm text-red-600">{submitError}</p> : null}
            </div>

            {/* Clone Options */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">What to Clone</h3>
              <div className="space-y-3">
                
                {/* Settings */}
                <label className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.cloneSettings}
                    onChange={() => toggleOption('cloneSettings')}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-gray-900">Event Settings</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Module configurations, terminology, and custom fields
                    </div>
                  </div>
                </label>

                {/* Positions */}
                <label className="flex items-start p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.clonePositions}
                    onChange={() => toggleOption('clonePositions')}
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-gray-900">Positions & Shifts</div>
                    <div className="text-xs text-gray-600 mt-1">
                      All position definitions and shift schedules
                    </div>
                  </div>
                </label>

                {/* Volunteers */}
                <label className="flex items-start p-3 bg-purple-50 border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.cloneVolunteers}
                    onChange={() => toggleOption('cloneVolunteers')}
                    className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-gray-900">Volunteer Links</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Link the same volunteers to the new event
                    </div>
                    <div className="text-xs text-purple-700 font-medium mt-1">
                      ⚠️ Unchecked by default - volunteers are usually event-specific
                    </div>
                  </div>
                </label>

                {/* Assignments */}
                <label className={`flex items-start p-3 rounded-lg cursor-pointer transition-colors ${
                  !options.cloneVolunteers 
                    ? 'bg-gray-100 border border-gray-200 opacity-60 cursor-not-allowed' 
                    : 'bg-orange-50 border border-orange-200 hover:bg-orange-100'
                }`}>
                  <input
                    type="checkbox"
                    checked={options.cloneAssignments}
                    onChange={() => toggleOption('cloneAssignments')}
                    disabled={!options.cloneVolunteers}
                    className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded disabled:opacity-50"
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-gray-900">Position Assignments</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Copy volunteer assignments to positions
                    </div>
                    {!options.cloneVolunteers && (
                      <div className="text-xs text-gray-500 font-medium mt-1">
                        Requires "Volunteer Links" to be checked
                      </div>
                    )}
                  </div>
                </label>

                {/* Lanyards */}
                <label className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.cloneLanyards}
                    onChange={() => toggleOption('cloneLanyards')}
                    className="mt-1 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-gray-900">Lanyard Settings</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Lanyard configuration and badge numbers
                    </div>
                  </div>
                </label>

                {/* Oversight */}
                <label className="flex items-start p-3 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.cloneOversight}
                    onChange={() => toggleOption('cloneOversight')}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-gray-900">Oversight Details</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Department overseer contacts, keymen, and position oversight assignments
                    </div>
                  </div>
                </label>

                <label className="flex items-start p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.cloneDocuments}
                    onChange={() => toggleOption('cloneDocuments')}
                    className="mt-1 h-4 w-4 text-slate-700 focus:ring-slate-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-gray-900">Documents</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Event files and the station diagram, using the same uploaded files
                    </div>
                  </div>
                </label>

                {/* Permissions */}
                <label className="flex items-start p-3 bg-teal-50 border border-teal-200 rounded-lg cursor-pointer hover:bg-teal-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.clonePermissions}
                    onChange={() => toggleOption('clonePermissions')}
                    className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-gray-900">Event Permissions</div>
                    <div className="text-xs text-gray-600 mt-1">
                      User access permissions and roles
                    </div>
                  </div>
                </label>

              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Count times are never cloned - they are event-specific and will start fresh.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clone Event
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
