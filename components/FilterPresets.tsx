import { useState, useEffect } from 'react'
import { notifyAlert, toast } from '../lib/ui/toast'
import { appConfirm, appConfirmMessage } from '../lib/ui/confirm'

interface FilterPreset {
  id: string
  name: string
  filters: {
    search: string
    congregation: string
    isActive: 'all' | 'true' | 'false'
    overseerId: string
    keymanId: string
    formsOfService: string[]
    availability?: 'all' | 'AVAILABLE' | 'NOT_AVAILABLE' | 'PARTIAL' | 'PENDING' | 'none'
  }
}

interface FilterPresetsProps {
  currentFilters: FilterPreset['filters']
  onApplyPreset: (filters: FilterPreset['filters']) => void
  eventId: string
}

export default function FilterPresets({ currentFilters, onApplyPreset, eventId }: FilterPresetsProps) {
  const [presets, setPresets] = useState<FilterPreset[]>([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [showPresets, setShowPresets] = useState(false)

  // Load presets from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`filterPresets_${eventId}`)
    if (stored) {
      try {
        setPresets(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to load presets:', e)
      }
    }
  }, [eventId])

  // Save presets to localStorage
  const savePresets = (newPresets: FilterPreset[]) => {
    localStorage.setItem(`filterPresets_${eventId}`, JSON.stringify(newPresets))
    setPresets(newPresets)
  }

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      notifyAlert('Please enter a preset name')
      return
    }

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName,
      filters: currentFilters
    }

    savePresets([...presets, newPreset])
    setPresetName('')
    setShowSaveModal(false)
  }

  const handleDeletePreset = async (id: string) => {
    if (await appConfirmMessage('Delete this filter preset?')) {
      savePresets(presets.filter(p => p.id !== id))
    }
  }

  const getPresetDescription = (preset: FilterPreset) => {
    const parts: string[] = []
    if (preset.filters.search) parts.push(`Search: "${preset.filters.search}"`)
    if (preset.filters.congregation) parts.push(`Congregation: "${preset.filters.congregation}"`)
    if (preset.filters.isActive !== 'true') parts.push(`Status: ${preset.filters.isActive === 'all' ? 'All' : 'Inactive'}`)
    if (preset.filters.formsOfService.length > 0) parts.push(`Roles: ${preset.filters.formsOfService.join(', ')}`)
    if (preset.filters.availability && preset.filters.availability !== 'all') {
      const labels: Record<string, string> = {
        AVAILABLE: 'Available',
        NOT_AVAILABLE: 'Not available',
        PARTIAL: 'Partial',
        PENDING: 'Pending',
        none: 'No request yet',
      }
      parts.push(`Availability: ${labels[preset.filters.availability] || preset.filters.availability}`)
    }
    return parts.length > 0 ? parts.join(' • ') : 'No filters'
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <span>⭐</span>
          {showPresets ? 'Hide' : 'Show'} Filter Presets ({presets.length})
        </button>
        <button
          onClick={() => setShowSaveModal(true)}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          💾 Save Current Filters
        </button>
      </div>

      {showPresets && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          {presets.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No saved filter presets. Click "Save Current Filters" to create one.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {presets.map(preset => (
                <div
                  key={preset.id}
                  className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{preset.name}</h4>
                    <button
                      onClick={() => handleDeletePreset(preset.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="Delete preset"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                    {getPresetDescription(preset)}
                  </p>
                  <button
                    onClick={() => onApplyPreset(preset.filters)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save Preset Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Filter Preset</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preset Name
              </label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., Active Elders"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600 mb-1">Current filters:</p>
              <p className="text-xs text-gray-700">{getPresetDescription({ id: '', name: '', filters: currentFilters })}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSaveModal(false)
                  setPresetName('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
