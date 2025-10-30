import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import PDFDocument from 'pdfkit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { eventName, positions, overseerFilter } = req.body

    // Helper function to format time
    const formatTime = (time24: string) => {
      if (!time24) return '';
      const [hours, minutes] = time24.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${hour12}:${minutes} ${ampm}`;
    }

    // Create PDF document with better margins
    const doc = new PDFDocument({ margin: 40, size: 'LETTER' })
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="positions-${eventName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf"`)
    
    // Pipe PDF to response
    doc.pipe(res)

    // Title with better styling
    doc.fontSize(24).fillColor('#1e40af').font('Helvetica-Bold')
    doc.text('Event Positions Export', { align: 'center' })
    doc.moveDown(0.8)
    
    // Header info box with background
    const headerY = doc.y
    doc.rect(40, headerY, 532, 70).fill('#f0f9ff')
    
    doc.fontSize(11).fillColor('#1e40af').font('Helvetica-Bold')
    doc.text('Event Information', 50, headerY + 10)
    
    doc.fontSize(10).fillColor('#000000').font('Helvetica')
    doc.text(`Event: ${eventName}`, 50, headerY + 28)
    doc.text(`Export Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 50, headerY + 42)
    doc.text(`Filter: ${overseerFilter ? 'Filtered by Overseer' : 'All Overseers'}  |  Total Positions: ${positions.length}`, 50, headerY + 56)
    
    doc.y = headerY + 80
    doc.moveDown(0.5)

    // Draw positions
    positions.forEach((p: any, index: number) => {
      // Estimate space needed for this position
      const estimatedHeight = 200 + (p.shifts?.length || 0) * 70
      
      // Check if we need a new page (leave more room at bottom)
      if (doc.y > 720 - estimatedHeight || doc.y > 650) {
        doc.addPage()
      }

      const startY = doc.y
      
      // Position header with gradient effect (darker blue)
      doc.rect(40, startY, 532, 40).fill('#2563eb')
      
      // Position number badge
      doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold')
      doc.text(`POSITION #${p.positionNumber}`, 50, startY + 8)
      
      // Position name (larger, bold)
      doc.fontSize(16).fillColor('#ffffff').font('Helvetica-Bold')
      doc.text(p.name, 50, startY + 22)
      
      doc.y = startY + 50
      doc.fillColor('#000000').font('Helvetica')
      
      // Position details section with better spacing
      const detailsY = doc.y
      
      // Left column - Basic Info
      doc.fontSize(11).fillColor('#1e40af').font('Helvetica-Bold')
      doc.text('Basic Information', 50, detailsY)
      doc.fontSize(10).fillColor('#000000').font('Helvetica')
      
      let leftY = detailsY + 18
      
      if (p.area) {
        doc.text(`Area:`, 50, leftY, { continued: true, width: 80 })
        doc.fillColor('#374151').text(` ${p.area}`, { continued: false })
        leftY += 16
      }
      
      if (p.description) {
        doc.fillColor('#000000').text(`Description:`, 50, leftY, { continued: true, width: 80 })
        doc.fillColor('#374151').text(` ${p.description}`, { continued: false, width: 450 })
        leftY += 16
      }
      
      doc.fillColor('#000000').text(`Status:`, 50, leftY, { continued: true, width: 80 })
      const statusColor = p.isActive ? '#059669' : '#dc2626'
      doc.fillColor(statusColor).font('Helvetica-Bold').text(` ${p.isActive ? 'Active' : 'Inactive'}`, { continued: false })
      doc.font('Helvetica')
      leftY += 20
      
      // Position Oversight section
      doc.fontSize(11).fillColor('#1e40af').font('Helvetica-Bold')
      doc.text('Position Oversight', 50, leftY)
      doc.fontSize(10).fillColor('#000000').font('Helvetica')
      leftY += 18
      
      const overseers = p.oversight?.map((o: any) => 
        o.overseer ? `${o.overseer.firstName} ${o.overseer.lastName}` : ''
      ).filter(Boolean).join(', ') || 'None assigned'
      doc.font('Helvetica-Bold').text('Overseers:', 50, leftY)
      doc.font('Helvetica').fillColor('#374151').text(overseers, 130, leftY, { width: 420 })
      doc.fillColor('#000000')
      leftY += 16
      
      const keymen = p.oversight?.map((o: any) => 
        o.keyman ? `${o.keyman.firstName} ${o.keyman.lastName}` : ''
      ).filter(Boolean).join(', ')
      if (keymen) {
        doc.font('Helvetica-Bold').text('Keymen:', 50, leftY)
        doc.font('Helvetica').fillColor('#374151').text(keymen, 130, leftY, { width: 420 })
        doc.fillColor('#000000')
        leftY += 16
      }
      
      doc.y = leftY + 5
      
      // Shifts & Assignments section
      if (p.shifts && p.shifts.length > 0) {
        doc.fontSize(11).fillColor('#1e40af').font('Helvetica-Bold')
        doc.text('Shifts & Assignments', 50, doc.y)
        doc.moveDown(0.5)
        
        p.shifts.forEach((shift: any, shiftIndex: number) => {
          const assignments = p.assignments?.filter((a: any) => 
            a.shift?.id === shift.id && a.role === 'ATTENDANT'
          ) || []
          
          const boxHeight = assignments.length > 0 ? 55 : 45
          
          // Check if shift box will fit on current page
          if (doc.y + boxHeight + 20 > 720) {
            doc.addPage()
            // Re-add section header on new page
            doc.fontSize(11).fillColor('#1e40af').font('Helvetica-Bold')
            doc.text('Shifts & Assignments (continued)', 50, doc.y)
            doc.moveDown(0.5)
          }
          
          const shiftY = doc.y
          
          // Shift box with light background
          doc.rect(50, shiftY, 500, boxHeight).fillAndStroke('#f9fafb', '#e5e7eb')
          
          // Shift name (bold, larger)
          doc.fontSize(11).fillColor('#1e40af').font('Helvetica-Bold')
          doc.text(shift.name, 60, shiftY + 8)
          
          // Shift time
          doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
          let timeText = ''
          if (shift.startTime && shift.endTime) {
            timeText = `${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`
          } else if (shift.isAllDay) {
            timeText = 'All Day'
          }
          if (timeText) {
            doc.text(timeText, 60, shiftY + 24)
          }
          
          // Attendants
          if (assignments.length > 0) {
            doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold')
            doc.text('Attendants:', 60, shiftY + 38, { continued: true })
            doc.font('Helvetica').fillColor('#374151')
            const attendantNames = assignments.map((a: any) => 
              `${a.attendant.firstName} ${a.attendant.lastName}`
            ).join(', ')
            doc.text(` ${attendantNames}`, { continued: false, width: 420 })
          } else {
            doc.fontSize(10).fillColor('#dc2626').font('Helvetica-BoldOblique')
            doc.text('⚠ No attendants assigned', 60, shiftY + 38)
          }
          
          doc.y = shiftY + boxHeight + 8
        })
      } else {
        doc.fontSize(11).fillColor('#1e40af').font('Helvetica-Bold')
        doc.text('Shifts & Assignments', 50, doc.y)
        doc.moveDown(0.3)
        doc.fontSize(10).fillColor('#6b7280').font('Helvetica-Oblique')
        doc.text('No shifts created for this position', 50, doc.y)
      }
      
      doc.moveDown(1.5)
      
      // Separator line with better styling
      if (index < positions.length - 1) {
        doc.strokeColor('#cbd5e1').lineWidth(2)
        doc.moveTo(40, doc.y).lineTo(572, doc.y).stroke()
        doc.moveDown(1.5)
      }
    })

    // Finalize PDF
    doc.end()
  } catch (error) {
    console.error('PDF export error:', error)
    return res.status(500).json({ error: 'Failed to export PDF' })
  }
}
