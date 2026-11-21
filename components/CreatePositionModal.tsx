import React from 'react'

interface Position {
  id: string
  positionNumber: number
  name: string
  area?: string
  description?: string
}

interface FormData {
  positionNumber: number
  name: string
  area: string
  description: string
}

interface CreatePositionModalProps {
  isOpen: boolean
  editingPosition: Position | null
  formData: FormData
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onFormDataChange: (data: FormData) => void
}

export default function CreatePositionModal({
  isOpen,
  editingPosition,
  formData,
  onClose,
  onSubmit,
  onFormDataChange
}: CreatePositionModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600/50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <form onSubmit={onSubmit}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingPosition ? 'Edit Position' : 'Create New Position'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="positionNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Position Number *
              </label>
              <input
                type="number"
                id="positionNumber"
                value={formData.positionNumber}
                onChange={(e) => onFormDataChange({ ...formData, positionNumber: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="1000"
                required
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Position Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Sound Operator, Parking Attendant"
                required
              />
            </div>

            <div>
              <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
                Area
              </label>
              <input
                type="text"
                id="area"
                value={formData.area}
                onChange={(e) => onFormDataChange({ ...formData, area: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Main Hall, Parking Lot A"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of the position..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {editingPosition ? 'Update Position' : 'Create Position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
