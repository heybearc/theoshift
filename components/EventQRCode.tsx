import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'

interface EventQRCodeProps {
  eventId: string
  eventName: string
  size?: number
}

export default function EventQRCode({ eventId, eventName, size = 200 }: EventQRCodeProps) {
  const [showModal, setShowModal] = useState(false)

  // Generate QR code data with volunteer login URL
  const qrData = `${typeof window !== 'undefined' ? window.location.origin : ''}/volunteer/login`

  const handleDownload = () => {
    const svg = document.getElementById('event-qr-code')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    canvas.width = size * 2
    canvas.height = size * 2

    img.onload = () => {
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      
      const downloadLink = document.createElement('a')
      downloadLink.download = `${eventName.replace(/\s+/g, '_')}_QR.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${eventName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 40px;
            }
            h1 {
              margin-bottom: 20px;
              font-size: 24px;
            }
            .instructions {
              margin-top: 20px;
              font-size: 14px;
              color: #666;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>${eventName}</h1>
            <div id="qr-code"></div>
            <div class="instructions">
              <p>Scan this QR code to access the event</p>
              <p style="font-size: 12px; margin-top: 10px;">Event ID: ${eventId}</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `)

    const qrElement = printWindow.document.getElementById('qr-code')
    if (qrElement) {
      const svg = document.getElementById('event-qr-code')?.cloneNode(true) as SVGElement
      if (svg) {
        svg.setAttribute('width', '300')
        svg.setAttribute('height', '300')
        qrElement.appendChild(svg)
      }
    }

    printWindow.document.close()
  }

  return (
    <>
      {/* QR Code Button */}
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <span>📱</span>
        <span>Event QR Code</span>
      </button>

      {/* QR Code Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-500/75"
              onClick={() => setShowModal(false)}
            />

            {/* Modal */}
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Event QR Code
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    {eventName}
                  </p>

                  {/* QR Code */}
                  <div className="flex justify-center mb-6 p-4 bg-white border-2 border-gray-200 rounded-lg">
                    <QRCodeSVG
                      id="event-qr-code"
                      value={qrData}
                      size={size}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <p className="text-xs text-gray-500 mb-4">
                    Scan this code to quickly access the event
                  </p>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleDownload}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <span className="mr-2">💾</span>
                      Download
                    </button>
                    <button
                      onClick={handlePrint}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <span className="mr-2">🖨️</span>
                      Print
                    </button>
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
