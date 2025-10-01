import { useState } from 'react'

interface CreateCountSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { sessionName: string; countTime: string; notes?: string }) => Promise<void>
}

export default function CreateCountSessionModal({ isOpen, onClose, onSubmit }: CreateCountSessionModalProps) {
  const [sessionName, setSessionName] = useState('')
  const [countTime, setCountTime] = useState(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  })
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sessionName.trim()) {
      setError('Session name is required')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      await onSubmit({
        sessionName: sessionName.trim(),
        countTime: new Date(countTime).toISOString(),
        notes: notes.trim() || undefined
      })
      
      // Reset form
      setSessionName('')
      setNotes('')
      setCountTime(() => {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create count session')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setError('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create Count Session</h3>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Session Name */}
            <div>
              <label htmlFor="sessionName" className="block text-sm font-medium text-gray-700 mb-1">
                Session Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="sessionName"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., First Count, Second Count, Morning Count"
                required
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-gray-500">
                Give this count session a descriptive name
              </p>
            </div>

            {/* Count Time */}
            <div>
              <label htmlFor="countTime" className="block text-sm font-medium text-gray-700 mb-1">
                Count Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                id="countTime"
                value={countTime}
                onChange={(e) => setCountTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-gray-500">
                When should this count be taken?
              </p>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any additional notes about this count session..."
                disabled={submitting}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !sessionName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
