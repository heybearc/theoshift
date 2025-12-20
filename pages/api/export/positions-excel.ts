import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import ExcelJS from 'exceljs'

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

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Event Positions')

    // Set column widths
    worksheet.columns = [
      { width: 12 },  // Position #
      { width: 35 },  // Name
      { width: 20 },  // Area
      { width: 40 },  // Description
      { width: 10 },  // Status
      { width: 25 },  // Overseers
      { width: 25 },  // Keymen
      { width: 25 },  // Shift Name
      { width: 20 },  // Shift Time
      { width: 35 },  // Attendants
    ]

    // Add title row
    const titleRow = worksheet.addRow(['Theocratic Shift Scheduler - Event Positions Export'])
    titleRow.font = { size: 16, bold: true, color: { argb: 'FF1e40af' } }
    worksheet.mergeCells('A1:J1')
    titleRow.alignment = { horizontal: 'center' }

    // Add header info
    worksheet.addRow([`Event: ${eventName}`])
    worksheet.addRow([`Export Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`])
    worksheet.addRow([overseerFilter ? `Filtered by Overseer` : `All Overseers`])
    worksheet.addRow([`Total Positions: ${positions.length}`])
    
    // Add empty row
    worksheet.addRow([])

    // Add column headers
    const headerRow = worksheet.addRow([
      'Position #',
      'Name',
      'Area',
      'Description',
      'Status',
      'Overseers',
      'Keymen',
      'Shift Name',
      'Shift Time',
      'Attendants'
    ])
    
    // Style header row
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3b82f6' }
    }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
    headerRow.height = 25

    // Add data rows
    positions.forEach((p: any) => {
      const overseers = p.oversight?.map((o: any) => 
        o.overseer ? `${o.overseer.firstName} ${o.overseer.lastName}` : ''
      ).filter(Boolean).join('; ') || 'None assigned'
      
      const keymen = p.oversight?.map((o: any) => 
        o.keyman ? `${o.keyman.firstName} ${o.keyman.lastName}` : ''
      ).filter(Boolean).join('; ') || 'None assigned'
      
      // If position has shifts, create a row for each shift
      if (p.shifts && p.shifts.length > 0) {
        p.shifts.forEach((shift: any, shiftIndex: number) => {
          const assignments = p.assignments?.filter((a: any) => 
            a.shift?.id === shift.id && a.role === 'ATTENDANT'
          ) || []
          
          const attendantNames = assignments.length > 0
            ? assignments.map((a: any) => `${a.attendant.firstName} ${a.attendant.lastName}`).join('; ')
            : 'No attendants assigned'
          
          let shiftTime = ''
          if (shift.startTime && shift.endTime) {
            shiftTime = `${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`
          } else if (shift.isAllDay) {
            shiftTime = 'All Day'
          }
          
          // Only include position details on first shift row
          if (shiftIndex === 0) {
            const dataRow = worksheet.addRow([
              p.positionNumber,
              p.name,
              p.area || '',
              p.description || '',
              p.isActive ? 'Active' : 'Inactive',
              overseers,
              keymen,
              shift.name,
              shiftTime,
              attendantNames
            ])
            
            // Style first row of position with light blue background
            dataRow.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFe0f2fe' }
            }
          } else {
            // Subsequent shifts - leave position details empty
            worksheet.addRow([
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              shift.name,
              shiftTime,
              attendantNames
            ])
          }
        })
      } else {
        // Position with no shifts
        const dataRow = worksheet.addRow([
          p.positionNumber,
          p.name,
          p.area || '',
          p.description || '',
          p.isActive ? 'Active' : 'Inactive',
          overseers,
          keymen,
          'No shifts created',
          '',
          ''
        ])
        
        // Style position row with light blue background
        dataRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFe0f2fe' }
        }
      }
    })

    // Add borders to all data cells
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 6) { // Skip header rows
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFe5e7eb' } },
            left: { style: 'thin', color: { argb: 'FFe5e7eb' } },
            bottom: { style: 'thin', color: { argb: 'FFe5e7eb' } },
            right: { style: 'thin', color: { argb: 'FFe5e7eb' } }
          }
        })
      }
    })

    // Generate Excel file buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Set response headers for Excel download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="positions-${eventName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx"`)
    
    res.status(200).send(buffer)
  } catch (error) {
    console.error('Excel export error:', error)
    return res.status(500).json({ error: 'Failed to export Excel' })
  }
}
