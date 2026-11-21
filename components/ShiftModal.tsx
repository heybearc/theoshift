import React from 'react'
import { formatEventDayLabel } from '../lib/eventDates'

interface Position {
  id: string
  name: string
}

interface ShiftFormData {
  name: string
  startTime: string
  endTime: string
  isAllDay: boolean
  volunteersNeeded: number
  shiftDate: string | null
}

interface ShiftModalProps {
  isOpen: boolean
  position: Position | null
  formData: ShiftFormData
  eventDateKeys?: string[]
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onFormDataChange: (data: ShiftFormData) => void
}

export default function ShiftModal({
  isOpen,
  position,
  formData,
  eventDateKeys = [],
  onClose,
  onSubmit,
  onFormDataChange
}: ShiftModalProps) {
  if (!isOpen || !position) return null

  const handleTemplateChange = (template: string) => {
    switch (template) {
      case 'morning':
        onFormDataChange({ ...formData, name: 'Morning', startTime: '07:50', endTime: '10:00', isAllDay: false })
        break
      case 'midday':
        onFormDataChange({ ...formData, name: 'Midday', startTime: '10:00', endTime: '12:00', isAllDay: false })
        break
      case 'afternoon':
        onFormDataChange({ ...formData, name: 'Afternoon', startTime: '12:00', endTime: '14:00', isAllDay: false })
        break
      case 'evening':
        onFormDataChange({ ...formData, name: 'Evening', startTime: '14:00', endTime: '17:00', isAllDay: false })
        break
      case 'allday':
        onFormDataChange({ ...formData, name: 'All Day', startTime: '', endTime: '', isAllDay: true })
        break
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600/50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Add Shift to {position.name}
          </h3>
          
          <form onSubmit={onSubmit}>
            <div className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Templates
                </label>
                <select 
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a template or create custom...</option>
                  <option value="morning">Morning (7:50 - 10:00)</option>
                  <option value="midday">Midday (10:00 - 12:00)</option>
                  <option value="afternoon">Afternoon (12:00 - 14:00)</option>
                  <option value="evening">Evening (14:00 - 17:00)</option>
                  <option value="allday">All Day</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shift Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Morning, Evening, All Day"
                />
              </div>

              {eventDateKeys.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Day
                  </label>
                  <select
                    value={formData.shiftDate || ''}
                    onChange={(e) =>
                      onFormDataChange({ ...formData, shiftDate: e.target.value || null })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a day…</option>
                    {eventDateKeys.map(key => (
                      <option key={key} value={key}>
                        {formatEventDayLabel(key)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Required for multi-day events so Friday and Saturday shifts do not conflict.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => onFormDataChange({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={formData.isAllDay}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => onFormDataChange({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={formData.isAllDay}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Volunteers needed
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={formData.volunteersNeeded ?? 1}
                  onChange={(e) =>
                    onFormDataChange({
                      ...formData,
                      volunteersNeeded: Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1))
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  How many people serve on this shift (default 1). Includes shift overseer if they also serve.
                </p>
              </div>

              <div>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={formData.isAllDay}
                    onChange={(e) => onFormDataChange({ ...formData, isAllDay: e.target.checked })}
                    className="mr-2" 
                  />
                  <span className="text-sm text-gray-700">All Day Shift</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Add Shift
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
