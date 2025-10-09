import React, { useState } from 'react'

interface BulkPositionCreatorProps {
  eventId: string
  onClose: () => void
  onSuccess: (result: any) => void
}

export default function BulkPositionCreator({ eventId, onClose, onSuccess }: BulkPositionCreatorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [positionsText, setPositionsText] = useState('')
  const [defaultArea, setDefaultArea] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!positionsText.trim()) {
      alert('Please enter position names')
      return
    }

    try {
      setIsSubmitting(true)
      
      // Parse positions from text (one per line)
      const positionNames = positionsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

      if (positionNames.length === 0) {
        alert('Please enter at least one position name')
        return
      }

      console.log(`🚀 Processing ${positionNames.length} positions for event ${eventId}`)

      // Smart position management: reuse existing, reactivate inactive, create new
      let successCount = 0
      let errorCount = 0
      let reactivatedCount = 0
      let updatedCount = 0

      // Get ALL existing positions (including inactive) for smart matching
      let existingPositions: any[] = []
      try {
        const existingResponse = await fetch(`/api/events/${eventId}/positions?includeInactive=true&limit=1000`)
        if (existingResponse.ok) {
          const existingData = await existingResponse.json()
          existingPositions = existingData.data?.positions || []
          console.log(`📊 Found ${existingPositions.length} existing positions (active + inactive)`)
        }
      } catch (error) {
        console.warn('Could not fetch existing positions, proceeding with creation only')
      }

      // Extract position numbers from names (e.g., "Station 1" -> 1)
      const extractPositionNumber = (name: string): number | null => {
        const match = name.match(/(?:Station|Position)\s+(\d+)/i)
        return match ? parseInt(match[1], 10) : null
      }

      for (let i = 0; i < positionNames.length; i++) {
        const positionName = positionNames[i]
        const desiredNumber = extractPositionNumber(positionName)
        
        try {
          // Check if position with this name already exists
          const existingByName = existingPositions.find(pos => 
            pos.name.toLowerCase().trim() === positionName.toLowerCase().trim()
          )
          
          // Check if position with desired number exists
          const existingByNumber = desiredNumber ? existingPositions.find(pos => 
            pos.positionNumber === desiredNumber
          ) : null

          if (existingByName) {
            // Position with same name exists - reactivate if inactive, update if needed
            if (!existingByName.isActive) {
              console.log(`🔄 Reactivating existing position: ${positionName}`)
              const response = await fetch(`/api/events/${eventId}/positions/${existingByName.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: positionName,
                  area: defaultArea || existingByName.area,
                  isActive: true
                }),
              })
              if (response.ok) {
                reactivatedCount++
              } else {
                errorCount++
              }
            } else {
              console.log(`✅ Position already exists and active: ${positionName}`)
              updatedCount++
            }
          } else if (existingByNumber && !existingByNumber.isActive) {
            // Desired number exists but inactive - reuse it
            console.log(`♻️ Reusing inactive position number ${desiredNumber} for: ${positionName}`)
            const response = await fetch(`/api/events/${eventId}/positions/${existingByNumber.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: positionName,
                area: defaultArea || undefined,
                isActive: true
              }),
            })
            if (response.ok) {
              reactivatedCount++
            } else {
              errorCount++
            }
          } else if (desiredNumber && !existingByNumber) {
            // Create new position with desired number
            console.log(`🆕 Creating new position ${desiredNumber}: ${positionName}`)
            const response = await fetch(`/api/events/${eventId}/positions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                positionNumber: desiredNumber,
                name: positionName,
                area: defaultArea || undefined,
                sequence: desiredNumber
              }),
            })
            if (response.ok) {
              successCount++
            } else {
              errorCount++
              console.error(`Failed to create position: ${positionName}`)
            }
          } else {
            // Fallback: create with next available number
            const maxNumber = existingPositions.reduce((max, pos) => Math.max(max, pos.positionNumber || 0), 0)
            const nextNumber = maxNumber + 1 + i
            console.log(`📝 Creating position with next available number ${nextNumber}: ${positionName}`)
            const response = await fetch(`/api/events/${eventId}/positions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                positionNumber: nextNumber,
                name: positionName,
                area: defaultArea || undefined,
                sequence: nextNumber
              }),
            })
            if (response.ok) {
              successCount++
            } else {
              errorCount++
              console.error(`Failed to create position: ${positionName}`)
            }
          }
        } catch (error) {
          errorCount++
          console.error(`Error processing position ${positionName}:`, error)
        }
      }

      const totalProcessed = successCount + reactivatedCount + updatedCount
      if (totalProcessed > 0) {
        const parts: string[] = []
        if (successCount > 0) parts.push(`${successCount} created`)
        if (reactivatedCount > 0) parts.push(`${reactivatedCount} reactivated`)
        if (updatedCount > 0) parts.push(`${updatedCount} already active`)
        if (errorCount > 0) parts.push(`${errorCount} failed`)
        
        const result = { 
          created: totalProcessed, 
          failed: errorCount,
          message: `Processed ${totalProcessed} positions: ${parts.join(', ')}`
        }
        console.log(`✅ Successfully processed ${totalProcessed} positions`)
        onSuccess(result)
      } else {
        alert('Failed to process positions')
      }
    } catch (error) {
      console.error('Bulk create error:', error)
      alert('Failed to create positions')
    } finally {
      setIsSubmitting(false)
    }
  }

  const exampleText = `Position 1
Position 2
Position 3
Parking Lot Attendant
Information Desk
Sound Booth
Stage Attendant`

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              🚀 Bulk Create Positions
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="defaultArea" className="block text-sm font-medium text-gray-700 mb-1">
                Default Area (Optional)
              </label>
              <input
                type="text"
                id="defaultArea"
                value={defaultArea}
                onChange={(e) => setDefaultArea(e.target.value)}
                placeholder="e.g., Main Auditorium, Parking, Lobby"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                This area will be applied to all positions (can be edited individually later)
              </p>
            </div>

            <div>
              <label htmlFor="positionsText" className="block text-sm font-medium text-gray-700 mb-1">
                Position Names (One per line)
              </label>
              <textarea
                id="positionsText"
                value={positionsText}
                onChange={(e) => setPositionsText(e.target.value)}
                placeholder={exampleText}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter one position name per line. Empty lines will be ignored.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Tips:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Position names will be created exactly as entered</li>
                <li>• Positions will be automatically numbered in sequence</li>
                <li>• All positions will be created as Active by default</li>
                <li>• You can edit individual positions after creation</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !positionsText.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-md transition-colors"
            >
              {isSubmitting ? 'Creating...' : `Create ${positionsText.split('\n').filter(line => line.trim()).length} Positions`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
