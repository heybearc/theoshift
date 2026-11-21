import React from 'react'

interface Position {
  id: string
  name: string
}

interface Volunteer {
  id: string
  firstName: string
  lastName: string
  formsOfService?: string | string[]
  isOverseer?: boolean
  isKeyman?: boolean
}

interface OverseerFormData {
  overseerId: string
  keymanId: string
}

interface OverseerModalProps {
  isOpen: boolean
  position: Position | null
  attendants: Volunteer[]
  formData: OverseerFormData
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onFormDataChange: (data: OverseerFormData) => void
}

export default function OverseerModal({
  isOpen,
  position,
  attendants,
  formData,
  onClose,
  onSubmit,
  onFormDataChange
}: OverseerModalProps) {
  if (!isOpen || !position) return null

  const overseers = attendants?.filter(att => att.isOverseer) || []
  const keymen = attendants?.filter(att => att.isKeyman) || []
  // Fall back to full roster when isOverseer/isKeyman flags are unset on event associations
  const overseerOptions = overseers.length > 0 ? overseers : (attendants || [])
  const keymanOptions = keymen.length > 0 ? keymen : (attendants || [])

  return (
    <div className="fixed inset-0 bg-gray-600/50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Assign Position Oversight
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Default overseer/keyman for <span className="font-medium text-gray-700">{position.name}</span>.
            For a specific shift, use <span className="font-medium">+ Assign Overseer</span> on that shift instead.
          </p>
          
          <form onSubmit={onSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Overseer
                </label>
                <select 
                  value={formData.overseerId}
                  onChange={(e) => onFormDataChange({ ...formData, overseerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select an overseer...</option>
                  {overseerOptions.map(attendant => (
                    <option key={attendant.id} value={attendant.id}>
                      {attendant.firstName} {attendant.lastName}{attendant.isOverseer ? ' (Elder)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Keyman (Optional)
                </label>
                <select 
                  value={formData.keymanId}
                  onChange={(e) => onFormDataChange({ ...formData, keymanId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a keyman...</option>
                  {keymanOptions.map(attendant => (
                    <option key={attendant.id} value={attendant.id}>
                      {attendant.firstName} {attendant.lastName}
                    </option>
                  ))}
                </select>
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
                Assign Overseer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
