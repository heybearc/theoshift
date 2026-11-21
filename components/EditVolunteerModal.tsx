import { useState } from 'react'
import { ConventionDay } from '@/generated/prisma/browser'
import { EarlyEntrySchedule } from '@/lib/ivsEarlyCheckin'
import { EarlyEntryDayControls } from './ivs/EarlyEntryDayControls'
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/formatPhone'

interface IVSVolunteer {
  id: string
  firstName: string
  lastName: string
  congregation: string
  email?: string
  phone?: string
  approvalStatus: string
  submittedBy: string
  requestRound: number
  approvedAt?: string
  approvedBy?: string
  notes?: string
  earlyEntry?: EarlyEntrySchedule
  checkIns?: Partial<Record<ConventionDay, { checkedInAt: string }>>
  earlyCheckinEligible?: boolean
}

interface EditVolunteerModalProps {
  volunteer: IVSVolunteer
  onClose: () => void
  onSave: (data: any) => void
}

export default function EditVolunteerModal({ volunteer, onClose, onSave }: EditVolunteerModalProps) {
  const [firstName, setFirstName] = useState(volunteer.firstName)
  const [lastName, setLastName] = useState(volunteer.lastName)
  const [congregation, setCongregation] = useState(volunteer.congregation)
  const [email, setEmail] = useState(volunteer.email || '')
  const [phone, setPhone] = useState(volunteer.phone || '')
  const [approvalStatus, setApprovalStatus] = useState(volunteer.approvalStatus)
  const [notes, setNotes] = useState(volunteer.notes || '')
  const [deniedReason, setDeniedReason] = useState('')
  const [earlyEntry, setEarlyEntry] = useState<EarlyEntrySchedule>(
    volunteer.earlyEntry ?? {
      friday: !!volunteer.earlyCheckinEligible,
      saturday: !!volunteer.earlyCheckinEligible,
      sunday: !!volunteer.earlyCheckinEligible,
    },
  )
  const [requestRound, setRequestRound] = useState(volunteer.requestRound)
  const [department, setDepartment] = useState(volunteer.submittedBy)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const em = email.trim().toLowerCase()
    const ph = phone.trim()
    if (!em || !em.includes('@')) {
      setError('Enter a valid email address')
      return
    }
    if (!ph || !isValidPhoneNumber(ph)) {
      setError('Enter a valid 10-digit phone number')
      return
    }
    setError('')
    onSave({
      firstName,
      lastName,
      congregation,
      email: em,
      phone: ph,
      ivsApprovalStatus: approvalStatus,
      ivsApprovalNotes: notes,
      ...(approvalStatus === 'Not Approved' && deniedReason && { ivsDeniedReason: deniedReason }),
      earlyEntry,
      ivsRequestRound: requestRound,
      ivsSubmittedBy: department,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Edit Volunteer</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Congregation</label>
            <input
              type="text"
              value={congregation}
              onChange={(e) => setCongregation(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                className="w-full px-3 py-2 border rounded-md"
                required
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., Parking, Security"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Request Round</label>
              <input
                type="number"
                min="1"
                value={requestRound}
                onChange={(e) => setRequestRound(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Approval Status</label>
            <select
              value={approvalStatus}
              onChange={(e) => setApprovalStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="Pending">Pending</option>
              <option value="Requested">Requested</option>
              <option value="Approved">Approved</option>
              <option value="Not Approved">Not Approved</option>
            </select>
          </div>

          {approvalStatus === 'Not Approved' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Denial Reason</label>
              <textarea
                value={deniedReason}
                onChange={(e) => setDeniedReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Reason for denial..."
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Approval Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Early entry days</label>
            <EarlyEntryDayControls
              schedule={earlyEntry}
              checkIns={volunteer.checkIns}
              onChange={setEarlyEntry}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
