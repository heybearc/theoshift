import React, { useState, useEffect } from 'react'

interface ShiftTemplate {
  id: string
  name: string
  description: string
  shifts: Array<{
    name: string
    startTime?: string
    endTime?: string
    isAllDay?: boolean
  }>
  isSystemTemplate: boolean
}

interface BulkPositionCreatorProps {
  eventId: string
  onSuccess: (result: any) => void
  onCancel: () => void
}

export default function BulkPositionCreator({ eventId, onSuccess, onCancel }: BulkPositionCreatorProps) {
  const [startNumber, setStartNumber] = useState(1)
  const [endNumber, setEndNumber] = useState(10)
  const [namePrefix, setNamePrefix] = useState('Position')
  const [area, setArea] = useState('')
  const [shiftTemplateId, setShiftTemplateId] = useState('')
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchShiftTemplates()
  }, [])

  const fetchShiftTemplates = async () => {
    try {
      const response = await fetch('/api/shift-templates', {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.success) {
        setTemplates(data.data)
        // Don't default to any template - let user choose
        // setShiftTemplateId('') // Keep empty by default
      } else {
        console.error('Failed to fetch shift templates:', data.error)
        // Set a default template structure if API fails
        setTemplates([
          {
            id: 'default',
            name: 'All Day',
            description: 'Single all-day shift',
            shifts: [{ name: 'All Day', isAllDay: true }],
            isSystemTemplate: true
          }
        ])
        // Don't auto-select even the fallback template
        // setShiftTemplateId('default')
      }
    } catch (error) {
      console.error('Failed to fetch shift templates:', error)
      // Set a default template structure if API fails
      setTemplates([
        {
          id: 'default',
          name: 'All Day',
          description: 'Single all-day shift',
          shifts: [{ name: 'All Day', isAllDay: true }],
          isSystemTemplate: true
        }
      ])
      // Don't auto-select even the fallback template
      // setShiftTemplateId('default')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/events/${eventId}/positions/bulk-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          startNumber,
          endNumber,
          namePrefix,
          area: area || undefined,
          shiftTemplateId: shiftTemplateId || undefined
        }),
      })

      const data = await response.json()

      if (data.success) {
        onSuccess(data.data)
      } else {
        setError(data.error || 'Failed to create positions')
      }
    } catch (error) {
      console.error('Bulk create error:', error)
      setError(`Network error occurred: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const selectedTemplate = templates.find(t => t.id === shiftTemplateId)
  const positionCount = Math.max(0, endNumber - startNumber + 1)

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Bulk Create Positions</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Position Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Number
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={startNumber}
              onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Number
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={endNumber}
              onChange={(e) => setEndNumber(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Name Prefix */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name Prefix
          </label>
          <input
            type="text"
            value={namePrefix}
            onChange={(e) => setNamePrefix(e.target.value)}
            placeholder="Position, Station, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Will create: "{namePrefix} {startNumber}", "{namePrefix} {startNumber + 1}", etc.
          </p>
        </div>

        {/* Area (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Area (Optional)
          </label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Auditorium, Dining, Lobby, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Shift Template */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Shift Pattern
          </label>
          <select
            value={shiftTemplateId}
            onChange={(e) => setShiftTemplateId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No shifts (positions only)</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.isSystemTemplate && ' (System)'}
              </option>
            ))}
          </select>
          
          {selectedTemplate && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <strong>Shifts:</strong>
              <ul className="mt-1">
                {selectedTemplate.shifts.map((shift, index) => (
                  <li key={index}>
                    • {shift.name}
                    {shift.isAllDay ? ' (All Day)' : ` (${shift.startTime} - ${shift.endTime})`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-sm text-blue-800">
            <strong>Will create:</strong> {positionCount} position{positionCount !== 1 ? 's' : ''}
            {selectedTemplate && (
              <span> with {selectedTemplate.shifts.length} shift{selectedTemplate.shifts.length !== 1 ? 's' : ''} each</span>
            )}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || positionCount <= 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : `Create ${positionCount} Position${positionCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </div>
  )
}
