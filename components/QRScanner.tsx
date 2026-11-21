import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

interface QRScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan?: (data: any) => void
}

export default function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string>('')
  const [scanning, setScanning] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      requestCameraPermission()
    }
  }, [isOpen])

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      setHasPermission(true)
      // Stop the stream immediately, we'll restart it when scanning
      stream.getTracks().forEach(track => track.stop())
    } catch (err) {
      console.error('Camera permission error:', err)
      setHasPermission(false)
      setError('Camera access denied. Please enable camera permissions in your browser settings.')
    }
  }

  const startScanning = async () => {
    setScanning(true)
    setError('')

    try {
      // For now, we'll use a simple file input approach
      // In production, you'd use a library like react-qr-reader or jsQR
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.capture = 'environment'
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) {
          setScanning(false)
          return
        }

        // Here you would process the QR code from the image
        // For now, we'll show a placeholder
        setError('QR code scanning from image not yet implemented. Use manual entry below.')
        setScanning(false)
      }

      input.click()
    } catch (err) {
      console.error('Scanning error:', err)
      setError('Failed to scan QR code')
      setScanning(false)
    }
  }

  const handleManualEntry = (eventId: string) => {
    if (eventId.trim()) {
      router.push(`/events/${eventId.trim()}`)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/75"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Scan QR Code</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <span className="text-gray-500 text-xl">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {hasPermission === null && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4" />
              <p className="text-gray-600">Requesting camera access...</p>
            </div>
          )}

          {hasPermission === false && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
              <button
                onClick={requestCameraPermission}
                className="mt-2 text-sm text-red-600 underline"
              >
                Try again
              </button>
            </div>
          )}

          {hasPermission === true && (
            <>
              {/* Scanner Area */}
              <div className="mb-6">
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-4 border-indigo-600 rounded-lg relative">
                      {/* Corner markers */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-600" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-600" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-600" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-600" />
                    </div>
                  </div>
                  <div className="text-center z-10">
                    <span className="text-6xl mb-2 block">📱</span>
                    <p className="text-gray-600 text-sm">Position QR code in frame</p>
                  </div>
                </div>

                <button
                  onClick={startScanning}
                  disabled={scanning}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {scanning ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      Scanning...
                    </span>
                  ) : (
                    '📷 Scan QR Code'
                  )}
                </button>
              </div>

              {error && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-yellow-800 text-sm">{error}</p>
                </div>
              )}

              {/* Manual Entry */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600 mb-2">Or enter Event ID manually:</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const input = e.currentTarget.elements.namedItem('eventId') as HTMLInputElement
                    handleManualEntry(input.value)
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    name="eventId"
                    placeholder="Event ID"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 active:bg-gray-800"
                  >
                    Go
                  </button>
                </form>
              </div>
            </>
          )}
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
