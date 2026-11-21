import { useState } from 'react'
import { IVS_APPROVAL_STATUSES } from '@/lib/ivs'
import { EarlyEntrySchedule } from '@/lib/ivsEarlyCheckin'
import { EarlyEntryDayControls } from './ivs/EarlyEntryDayControls'
import { notifyAlert } from '../lib/ui/toast'

interface BulkActionModalProps {
  action: string
  selectedCount: number
  onClose: () => void
  onConfirm: (data: Record<string, unknown>) => void
}

export default function BulkActionModal({
  action,
  selectedCount,
  onClose,
  onConfirm,
}: BulkActionModalProps) {
  const [status, setStatus] = useState<(typeof IVS_APPROVAL_STATUSES)[number]>('Pending')
  const [denialReason, setDenialReason] = useState('')
  const [earlyEntry, setEarlyEntry] = useState<EarlyEntrySchedule>({
    friday: false,
    saturday: false,
    sunday: false,
  })
  const [requestRound, setRequestRound] = useState(1)
  const [department, setDepartment] = useState('')
  const [congregation, setCongregation] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    switch (action) {
      case 'setStatus': {
        const payload: Record<string, unknown> = {
          action: 'setStatus',
          ivsApprovalStatus: status,
        }
        if (status === 'Not Approved' && denialReason.trim()) {
          payload.ivsDeniedReason = denialReason.trim()
        }
        onConfirm(payload)
        break
      }
      case 'setEarlyEntry':
        onConfirm({ action: 'setEarlyEntry', earlyEntry })
        break
      case 'changeRound':
        onConfirm({ action: 'changeRound', ivsRequestRound: requestRound })
        break
      case 'changeDepartment':
        if (!department.trim()) {
          notifyAlert('Please provide a department name')
          return
        }
        onConfirm({ action: 'changeDepartment', ivsSubmittedBy: department.trim() })
        break
      case 'changeCongregation':
        if (!congregation.trim()) {
          notifyAlert('Please provide a congregation name')
          return
        }
        onConfirm({ action: 'changeCongregation', congregation: congregation.trim() })
        break
    }
  }

  const getTitle = () => {
    switch (action) {
      case 'setStatus':
        return 'Set approval status'
      case 'setEarlyEntry':
        return 'Set early entry days'
      case 'changeRound':
        return 'Change request round'
      case 'changeDepartment':
        return 'Change department name'
      case 'changeCongregation':
        return 'Change congregation name'
      default:
        return 'Bulk action'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">{getTitle()}</h2>
        <p className="text-sm text-gray-600 mb-4">
          This will affect {selectedCount} selected volunteer{selectedCount !== 1 ? 's' : ''}.
        </p>

        <form onSubmit={handleSubmit}>
          {action === 'setStatus' && (
            <div className="mb-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as (typeof IVS_APPROVAL_STATUSES)[number])}
                className="w-full min-h-[44px] px-3 py-2 border rounded-md text-base"
              >
                {IVS_APPROVAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {status === 'Not Approved' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Denial reason (optional)
                  </label>
                  <textarea
                    value={denialReason}
                    onChange={(e) => setDenialReason(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    rows={3}
                    placeholder="Leave blank to keep existing reasons, or enter a note for all selected rows…"
                  />
                </div>
              )}
            </div>
          )}

          {action === 'setEarlyEntry' && (
            <div className="mb-4">
              <EarlyEntryDayControls schedule={earlyEntry} onChange={setEarlyEntry} />
            </div>
          )}

          {action === 'changeRound' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Request round *</label>
              <input
                type="number"
                min={1}
                value={requestRound}
                onChange={(e) => setRequestRound(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
          )}

          {action === 'changeDepartment' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Department name *</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g. Parking, Security"
                required
              />
            </div>
          )}

          {action === 'changeCongregation' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Congregation name *</label>
              <input
                type="text"
                value={congregation}
                onChange={(e) => setCongregation(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Applied to each selected person’s congregation"
                required
              />
            </div>
          )}

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
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
