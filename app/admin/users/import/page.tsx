'use client'

import { useAuth } from '../../../providers'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ValidationError {
  row: number
  field: string
  message: string
  value: string
}

interface ImportResult {
  success: boolean
  totalRows: number
  successCount: number
  errorCount: number
  errors: ValidationError[]
  createdUsers: any[]
}

export default function UserImportPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    if (authLoading) return
    
    if (!user || user.role !== 'ADMIN') {
      router.push('/unauthorized')
      return
    }
  }, [user, authLoading, router])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile)
        setResult(null)
      } else {
        alert('Please select a CSV file')
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile)
        setResult(null)
      } else {
        alert('Please select a CSV file')
      }
    }
  }

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/admin/users/import')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'user_import_template.csv'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to download template:', error)
      alert('Failed to download template')
    }
  }

  const handleImport = async () => {
    if (!file) {
      alert('Please select a file to import')
      return
    }

    setImporting(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/users/import', {
        method: 'POST',
        body: formData
      })

      const importResult = await response.json()
      setResult(importResult)

      if (importResult.success) {
        alert(`Successfully imported ${importResult.successCount} users!`)
      }
    } catch (error) {
      console.error('Failed to import users:', error)
      alert('Failed to import users')
    } finally {
      setImporting(false)
    }
  }

  const resetImport = () => {
    setFile(null)
    setResult(null)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Import Users</h1>
            <Link
              href="/admin"
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Admin
            </Link>
          </div>

          {!result && (
            <>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 className="font-semibold text-blue-800 mb-2">Before You Start</h3>
                <ol className="text-sm text-blue-700 space-y-1">
                  <li>1. Download the CSV template below</li>
                  <li>2. Fill in your user data following the template format</li>
                  <li>3. Required fields: firstName, lastName, email, role</li>
                  <li>4. Valid roles: ADMIN, OVERSEER, ASSISTANT_OVERSEER, KEYMAN, ATTENDANT</li>
                  <li>5. Upload your completed CSV file</li>
                </ol>
              </div>

              <div className="mb-6">
                <button
                  onClick={downloadTemplate}
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 flex items-center"
                >
                  📥 Download CSV Template
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload CSV File
                </label>
                
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center ${
                    dragActive 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="text-gray-600">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-2 text-lg">
                        {file ? file.name : 'Drag and drop your CSV file here, or click to select'}
                      </p>
                      <p className="text-sm text-gray-500">CSV files only</p>
                    </div>
                  </label>
                </div>
              </div>

              {file && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
                  <h3 className="font-semibold text-green-800">File Selected</h3>
                  <p className="text-green-700">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <button
                  onClick={resetImport}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
                  disabled={!file}
                >
                  Clear
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || importing}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Import Users'}
                </button>
              </div>
            </>
          )}

          {result && (
            <div className="space-y-6">
              <div className={`p-4 rounded border ${
                result.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <h3 className={`font-semibold ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  Import {result.success ? 'Successful' : 'Failed'}
                </h3>
                <p className={result.success ? 'text-green-700' : 'text-red-700'}>
                  {result.success 
                    ? `Successfully imported ${result.successCount} users and sent invitation emails.`
                    : `Found ${result.errorCount} errors in ${result.totalRows} rows.`
                  }
                </p>
              </div>

              {result.success && result.createdUsers.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4">Imported Users</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left border-b">Name</th>
                          <th className="px-4 py-2 text-left border-b">Email</th>
                          <th className="px-4 py-2 text-left border-b">Role</th>
                          <th className="px-4 py-2 text-left border-b">Invitation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.createdUsers.map((user, index) => (
                          <tr key={index} className="border-b">
                            <td className="px-4 py-2">{user.firstName} {user.lastName}</td>
                            <td className="px-4 py-2">{user.email}</td>
                            <td className="px-4 py-2">
                              <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                user.emailSent 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {user.emailSent ? 'Sent' : 'Failed'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!result.success && result.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-800 mb-4">Validation Errors</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto border border-red-200">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-4 py-2 text-left border-b">Row</th>
                          <th className="px-4 py-2 text-left border-b">Field</th>
                          <th className="px-4 py-2 text-left border-b">Error</th>
                          <th className="px-4 py-2 text-left border-b">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((error, index) => (
                          <tr key={index} className="border-b">
                            <td className="px-4 py-2">{error.row}</td>
                            <td className="px-4 py-2 font-mono text-sm">{error.field}</td>
                            <td className="px-4 py-2 text-red-700">{error.message}</td>
                            <td className="px-4 py-2 font-mono text-sm bg-gray-100">
                              {error.value || '(empty)'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <button
                  onClick={resetImport}
                  className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                >
                  Import Another File
                </button>
                <Link
                  href="/admin"
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                >
                  Back to Admin Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
