import { useState } from 'react'
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/formatPhone'

interface AddIvsVolunteerModalProps {
  onClose: () => void
  onAdd: (payload: {
    firstName: string
    lastName: string
    congregation: string
    email: string
    phone: string
    requestRound: number
    departmentName?: string
  }) => Promise<void>
}

export default function AddIvsVolunteerModal({ onClose, onAdd }: AddIvsVolunteerModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [congregation, setCongregation] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [requestRound, setRequestRound] = useState(1)
  const [departmentName, setDepartmentName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fn = firstName.trim()
    const ln = lastName.trim()
    const cong = congregation.trim()
    const em = email.trim().toLowerCase()
    const ph = phone.trim()
    if (!fn || !cong || !em || !ph) {
      setError('First name, congregation, email, and phone are required')
      return
    }
    if (!em.includes('@')) {
      setError('Enter a valid email address')
      return
    }
    if (!isValidPhoneNumber(ph)) {
      setError('Enter a valid 10-digit phone number')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await onAdd({
        firstName: fn,
        lastName: ln,
        congregation: cong,
        email: em,
        phone: ph,
        requestRound: Math.max(1, requestRound),
        departmentName: departmentName.trim() || undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Add volunteer</h2>
        <p className="text-sm text-gray-600 mb-4">
          Adds one IVS volunteer to this event (same rules as import: duplicates skipped; elders may auto-approve).
        </p>
        <form onSubmit={handleSubmit}>
          {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">First name *</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 border rounded-md text-base"
              required
              autoComplete="given-name"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Last name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 border rounded-md text-base"
              autoComplete="family-name"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Congregation *</label>
            <input
              type="text"
              value={congregation}
              onChange={(e) => setCongregation(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 border rounded-md text-base"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 border rounded-md text-base"
              required
              autoComplete="email"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Phone *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              className="w-full min-h-[44px] px-3 py-2 border rounded-md text-base"
              required
              placeholder="(555) 123-4567"
              autoComplete="tel"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Request round</label>
            <input
              type="number"
              min={1}
              value={requestRound}
              onChange={(e) => setRequestRound(parseInt(e.target.value, 10) || 1)}
              className="w-full min-h-[44px] px-3 py-2 border rounded-md text-base"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Department (optional)</label>
            <input
              type="text"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 border rounded-md text-base"
              placeholder="e.g., Parking, Security"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add volunteer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
