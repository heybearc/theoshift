import { useState } from 'react'

interface ImportModalProps {
  eventId: string
  onClose: () => void
  onImport: (file: File, round: number, dept?: string) => void
}

export default function ImportModal({ eventId, onClose, onImport }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [requestRound, setRequestRound] = useState(1)
  const [departmentName, setDepartmentName] = useState('')
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (file) {
      onImport(file, requestRound, departmentName || undefined)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true)
      const response = await fetch(`/api/events/${eventId}/ivs/import-template`)
      if (!response.ok) {
        throw new Error('Failed to download template')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'IVS_Import_Template.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error(error)
      alert('Could not download the import template. Please try again.')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Import Volunteers</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="block text-sm font-medium">Excel/CSV File</label>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {downloadingTemplate ? 'Downloading…' : 'Download template'}
              </button>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              Required: <span className="font-medium">NAME</span>,{' '}
              <span className="font-medium">CONGREGATION</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Optional: <span className="font-medium">DEPARTMENT</span>,{' '}
              <span className="font-medium">STATUS</span> (Pending / Requested / Approved / Not
              Approved), <span className="font-medium">EARLY ENTRY</span> (e.g. Fri, Sat · All days ·
              No)
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Re-importing updates existing people when early entry or status is included.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Request Round</label>
            <input
              type="number"
              min="1"
              value={requestRound}
              onChange={(e) => setRequestRound(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Department Name (Optional default)
            </label>
            <input
              type="text"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Used when DEPARTMENT column is blank"
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
              Import
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
