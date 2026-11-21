import { useState } from 'react'

interface ExportModalProps {
  departments: string[]
  rounds: number[]
  onClose: () => void
  onExport: (dept?: string, round?: number) => void
}

export default function ExportModal({ departments, rounds, onClose, onExport }: ExportModalProps) {
  const [departmentName, setDepartmentName] = useState('')
  const [requestRound, setRequestRound] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onExport(
      departmentName || undefined,
      requestRound ? parseInt(requestRound) : undefined
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Export Volunteers</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Department (Optional)</label>
            <select
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Request Round (Optional)</label>
            <select
              value={requestRound}
              onChange={(e) => setRequestRound(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">All Rounds</option>
              {rounds.map(round => (
                <option key={round} value={round}>Request {round}</option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-800">
              Export will include: NAME, CONGREGATION, APPROVAL STATUS, APPROVAL DATE, DEPARTMENT, ROUND, NOTES
            </p>
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
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Export
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
