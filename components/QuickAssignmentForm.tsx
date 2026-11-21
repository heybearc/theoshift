import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

interface Position {
  id: string
  name: string
  department?: string
  startTime?: string
  endTime?: string
}

interface Volunteer {
  id: string
  name: string
  email: string
}

interface QuickAssignmentFormProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  preselectedVolunteer?: Volunteer
  preselectedPosition?: Position
  onSuccess?: () => void
}

export default function QuickAssignmentForm({
  isOpen,
  onClose,
  eventId,
  preselectedVolunteer,
  preselectedPosition,
  onSuccess
}: QuickAssignmentFormProps) {
  const [positions, setPositions] = useState<Position[]>([])
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [selectedPosition, setSelectedPosition] = useState<string>(preselectedPosition?.id || '')
  const [selectedVolunteer, setSelectedVolunteer] = useState<string>(preselectedVolunteer?.id || '')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, eventId])

  useEffect(() => {
    if (preselectedPosition) {
      setSelectedPosition(preselectedPosition.id)
    }
  }, [preselectedPosition])

  useEffect(() => {
    if (preselectedVolunteer) {
      setSelectedVolunteer(preselectedVolunteer.id)
    }
  }, [preselectedVolunteer])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    
    try {
      const [positionsRes, volunteersRes] = await Promise.all([
        fetch(`/api/events/${eventId}/positions`),
        fetch(`/api/events/${eventId}/volunteers`)
      ])

      if (positionsRes.ok) {
        const posData = await positionsRes.json()
        setPositions(posData.positions || [])
      }

      if (volunteersRes.ok) {
        const volData = await volunteersRes.json()
        setVolunteers(volData.volunteers || [])
      }
    } catch (err) {
      setError('Failed to load data')
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedPosition || !selectedVolunteer) {
      setError('Please select both position and volunteer')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/events/${eventId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: selectedPosition,
          volunteerId: selectedVolunteer
        })
      })

      if (response.ok) {
        // Success!
        if (onSuccess) {
          onSuccess()
        }
        handleClose()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create assignment')
      }
    } catch (err) {
      setError('Failed to create assignment')
      console.error('Error creating assignment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedPosition(preselectedPosition?.id || '')
    setSelectedVolunteer(preselectedVolunteer?.id || '')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Quick Assignment</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <span className="text-gray-500 text-xl">×</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <>
              {/* Position Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position *
                </label>
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  disabled={!!preselectedPosition}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-600"
                  required
                >
                  <option value="">Select a position...</option>
                  {positions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                      {position.department && ` - ${position.department}`}
                      {position.startTime && ` (${position.startTime})`}
                    </option>
                  ))}
                </select>
                {preselectedPosition && (
                  <p className="text-xs text-gray-500 mt-1">
                    Position pre-selected
                  </p>
                )}
              </div>

              {/* Volunteer Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Volunteer *
                </label>
                <select
                  value={selectedVolunteer}
                  onChange={(e) => setSelectedVolunteer(e.target.value)}
                  disabled={!!preselectedVolunteer}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-600"
                  required
                >
                  <option value="">Select a volunteer...</option>
                  {volunteers.map((volunteer) => (
                    <option key={volunteer.id} value={volunteer.id}>
                      {volunteer.name} ({volunteer.email})
                    </option>
                  ))}
                </select>
                {preselectedVolunteer && (
                  <p className="text-xs text-gray-500 mt-1">
                    Volunteer pre-selected
                  </p>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  💡 <strong>Quick Tip:</strong> The volunteer will be notified via email about this assignment.
                </p>
              </div>
            </>
          )}
        </form>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting || loading || !selectedPosition || !selectedVolunteer}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Creating...
              </span>
            ) : (
              'Create Assignment'
            )}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
