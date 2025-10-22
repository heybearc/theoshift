import React, { useState } from 'react'
import { BulkImportModalProps, AttendantBulkImport, AttendantImportRow } from '../../types'
import { FORMS_OF_SERVICE } from '../../types'
import ActionButton from '../atoms/ActionButton'

export default function BulkImportModal({
  isOpen,
  onClose,
  onImport,
  eventId,
  loading = false
}: BulkImportModalProps) {
  const [csvText, setCsvText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<AttendantImportRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [step, setStep] = useState<'input' | 'preview' | 'results'>('input')
  const [importResults, setImportResults] = useState<any>(null)
  const [uploadMethod, setUploadMethod] = useState<'file' | 'text'>('file')

  const csvTemplate = `firstName,lastName,email,phone,congregation,formsOfService,isActive,notes
John,Smith,john.smith@example.com,216-555-0123,Central Congregation,"Elder,Exemplary",true,Available for all assignments
Jane,Doe,jane.doe@example.com,216-555-0124,North Congregation,"Ministerial Servant,Regular Pioneer",true,
Mike,Johnson,mike.j@example.com,,South Congregation,"Other Department",false,Currently unavailable`

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setErrors(['Please select a CSV file'])
        return
      }
      setSelectedFile(file)
      setErrors([])
    }
  }

  const handleFileUpload = () => {
    if (!selectedFile) {
      setErrors(['Please select a CSV file'])
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const csvContent = e.target?.result as string
      parseCsvContent(csvContent)
    }
    reader.onerror = () => {
      setErrors(['Error reading file'])
    }
    reader.readAsText(selectedFile)
  }

  const handleCsvParse = () => {
    if (!csvText.trim()) {
      setErrors(['Please enter CSV data'])
      return
    }
    parseCsvContent(csvText)
  }

  const parseCsvContent = (csvContent: string) => {
    try {
      const lines = csvContent.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      
      const requiredHeaders = ['firstName', 'lastName', 'email', 'congregation', 'formsOfService']
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
      
      if (missingHeaders.length > 0) {
        setErrors([`Missing required columns: ${missingHeaders.join(', ')}`])
        return
      }

      const parsed: AttendantImportRow[] = []
      const parseErrors: string[] = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const row: any = {}

        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })

        // Validate required fields
        if (!row.firstName) {
          parseErrors.push(`Row ${i + 1}: First name is required`)
          continue
        }
        if (!row.lastName) {
          parseErrors.push(`Row ${i + 1}: Last name is required`)
          continue
        }
        if (!row.email || !/\S+@\S+\.\S+/.test(row.email)) {
          parseErrors.push(`Row ${i + 1}: Valid email is required`)
          continue
        }
        if (!row.congregation) {
          parseErrors.push(`Row ${i + 1}: Congregation is required`)
          continue
        }
        if (!row.formsOfService) {
          parseErrors.push(`Row ${i + 1}: Forms of service are required`)
          continue
        }

        // Validate forms of service
        const forms = row.formsOfService.split(',').map((f: string) => f.trim())
        const invalidForms = forms.filter((f: string) => !FORMS_OF_SERVICE.includes(f as any))
        if (invalidForms.length > 0) {
          parseErrors.push(`Row ${i + 1}: Invalid forms of service: ${invalidForms.join(', ')}`)
          continue
        }

        // Set defaults
        row.isActive = row.isActive === 'false' ? false : true
        row.phone = row.phone || ''
        row.notes = row.notes || ''

        parsed.push(row)
      }

      if (parseErrors.length > 0) {
        setErrors(parseErrors)
        return
      }

      setParsedData(parsed)
      setErrors([])
      setStep('preview')
    } catch (error) {
      setErrors(['Error parsing CSV data. Please check the format.'])
    }
  }

  const handleImport = async () => {
    try {
      setImporting(true)
      const importData: AttendantBulkImport = {
        attendants: parsedData,
        eventId
      }
      
      const results = await onImport(importData)
      setImportResults(results)
      setStep('results')
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Import failed'])
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setCsvText('')
    setSelectedFile(null)
    setParsedData([])
    setErrors([])
    setStep('input')
    setImportResults(null)
    // Reset file input
    const fileInput = document.getElementById('csv-file-input') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'attendant_import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Bulk Import Attendants
            </h3>
            <button
              type="button"
              onClick={handleClose}
              disabled={importing}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step Indicator */}
          <div className="mb-6">
            <div className="flex items-center">
              <div className={`flex items-center ${step === 'input' ? 'text-blue-600' : 'text-green-600'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 'input' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  1
                </div>
                <span className="ml-2 text-sm font-medium">Input CSV</span>
              </div>
              <div className="flex-1 h-px bg-gray-300 mx-4"></div>
              <div className={`flex items-center ${
                step === 'preview' ? 'text-blue-600' : step === 'results' ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 'preview' ? 'bg-blue-100' : step === 'results' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  2
                </div>
                <span className="ml-2 text-sm font-medium">Preview</span>
              </div>
              <div className="flex-1 h-px bg-gray-300 mx-4"></div>
              <div className={`flex items-center ${step === 'results' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 'results' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  3
                </div>
                <span className="ml-2 text-sm font-medium">Results</span>
              </div>
            </div>
          </div>

          {/* Content based on step */}
          {step === 'input' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800">CSV Format Requirements</h4>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Required columns: firstName, lastName, email, congregation, formsOfService</p>
                      <p>Optional columns: phone, isActive, notes</p>
                      <p>Forms of Service: {FORMS_OF_SERVICE.join(', ')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Method Tabs */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4">
                <button
                  type="button"
                  onClick={() => setUploadMethod('file')}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                    uploadMethod === 'file'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📁 Upload CSV File
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMethod('text')}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                    uploadMethod === 'text'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📝 Paste CSV Text
                </button>
              </div>

              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  {uploadMethod === 'file' ? 'CSV File Upload' : 'CSV Data'}
                </label>
                <ActionButton
                  onClick={downloadTemplate}
                  variant="secondary"
                  size="sm"
                >
                  📥 Download Template
                </ActionButton>
              </div>

              {uploadMethod === 'file' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="csv-file-input" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">CSV files only</p>
                      </div>
                      <input
                        id="csv-file-input"
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleFileSelect}
                        disabled={importing}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  {selectedFile && (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-green-800 font-medium">{selectedFile.name}</span>
                        <span className="text-xs text-green-600 ml-2">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-green-600 hover:text-green-800 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  disabled={importing}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Paste your CSV data here or download the template to get started..."
                />
              )}

              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-red-800">Validation Errors</h4>
                      <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-gray-900">
                  Preview ({parsedData.length} attendants)
                </h4>
                <ActionButton
                  onClick={() => setStep('input')}
                  variant="secondary"
                  size="sm"
                >
                  Back to Edit
                </ActionButton>
              </div>

              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Congregation</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Forms of Service</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedData.map((attendant, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {attendant.firstName} {attendant.lastName}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">{attendant.email}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{attendant.congregation}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{attendant.formsOfService}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {attendant.isActive ? 'Active' : 'Inactive'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'results' && importResults && (
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">Import Results</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{importResults.created || 0}</div>
                    <div className="text-sm text-green-800">Created</div>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{importResults.updated || 0}</div>
                    <div className="text-sm text-blue-800">Updated</div>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{importResults.errors?.length || 0}</div>
                    <div className="text-sm text-red-800">Errors</div>
                  </div>
                </div>
              </div>

              {importResults.errors && importResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h5 className="text-sm font-medium text-red-800 mb-2">Import Errors</h5>
                  <div className="max-h-40 overflow-y-auto">
                    {importResults.errors.map((error: any, index: number) => (
                      <div key={index} className="text-sm text-red-700">
                        Row {error.row} ({error.email}): {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            {step === 'input' && (
              <>
                <ActionButton onClick={handleClose} variant="secondary">
                  Cancel
                </ActionButton>
                <ActionButton 
                  onClick={uploadMethod === 'file' ? handleFileUpload : handleCsvParse} 
                  variant="primary"
                  disabled={uploadMethod === 'file' ? !selectedFile : !csvText.trim()}
                >
                  {uploadMethod === 'file' ? 'Process File' : 'Parse CSV'}
                </ActionButton>
              </>
            )}
            
            {step === 'preview' && (
              <>
                <ActionButton onClick={() => setStep('input')} variant="secondary">
                  Back
                </ActionButton>
                <ActionButton 
                  onClick={handleImport} 
                  variant="primary"
                  loading={importing}
                  disabled={importing}
                >
                  Import {parsedData.length} Attendants
                </ActionButton>
              </>
            )}
            
            {step === 'results' && (
              <ActionButton onClick={handleClose} variant="primary">
                Done
              </ActionButton>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
