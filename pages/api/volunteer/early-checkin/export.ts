import { NextApiRequest, NextApiResponse } from 'next'
import { getApiSession } from '@/lib/apiSession'
import { prisma } from '@/lib/prisma'
import {
  CONVENTION_DAYS,
  conventionDayLabel,
  earlyCheckinInclude,
  earlyEligibilityWhere,
  formatEarlyEntrySummary,
  isCheckedInForDay,
  isEligibleForDay,
  scheduleFromRecord,
} from '@/lib/ivsEarlyCheckin'
import { verifyVolunteerIvsEarlyCheckinAccess } from '@/lib/ivsVolunteerEarlyCheckinAccess'
import ExcelJS from 'exceljs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const session = await getApiSession(req, res)
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const { eventId } = req.query

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ success: false, message: 'Event ID required' })
    }

    const access = await verifyVolunteerIvsEarlyCheckinAccess(
      req,
      session.user.id,
      session.user.role,
      eventId,
    )
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message })
    }

    const event = await prisma.events.findUnique({
      where: { id: eventId },
      select: { name: true },
    })

    const eventVolunteers = await prisma.event_volunteers.findMany({
      where: {
        eventId,
        ...earlyEligibilityWhere(),
      },
      include: earlyCheckinInclude,
      orderBy: [{ volunteer: { lastName: 'asc' } }],
    })

    let totalCheckedIn = 0
    let totalPending = 0

    const data = eventVolunteers.map((ev) => {
      const schedule = scheduleFromRecord(ev)
      const checkIns = Object.fromEntries(ev.earlyCheckins.map((c) => [c.conventionDay, c]))

      const dayColumns: Record<string, string> = {}
      for (const day of CONVENTION_DAYS) {
        const label = conventionDayLabel(day)
        if (!isEligibleForDay(schedule, day)) {
          dayColumns[`${label} status`] = '—'
          dayColumns[`${label} time`] = ''
          dayColumns[`${label} by`] = ''
          continue
        }
        const row = checkIns[day]
        if (row) {
          totalCheckedIn += 1
          dayColumns[`${label} status`] = 'Checked In'
          dayColumns[`${label} time`] = formatDateTime(row.checkedInAt)
          dayColumns[`${label} by`] = row.checkedInBy || ''
        } else {
          totalPending += 1
          dayColumns[`${label} status`] = 'Pending'
          dayColumns[`${label} time`] = ''
          dayColumns[`${label} by`] = ''
        }
      }

      return {
        NAME: `${ev.volunteer?.firstName || ''} ${ev.volunteer?.lastName || ''}`.trim(),
        CONGREGATION: ev.volunteer?.congregation || '',
        'EARLY ENTRY DAYS': formatEarlyEntrySummary(schedule),
        ...dayColumns,
      }
    })

    const summaryRows = [
      {
        NAME: `IVS Early Check-In Report - ${event?.name || 'Event'}`,
        CONGREGATION: '',
        'EARLY ENTRY DAYS': '',
      },
      {
        NAME: 'Total Early Entry Eligible',
        CONGREGATION: eventVolunteers.length.toString(),
        'EARLY ENTRY DAYS': '',
      },
      {
        NAME: 'Day check-ins (eligible rows)',
        CONGREGATION: totalCheckedIn.toString(),
        'EARLY ENTRY DAYS': '',
      },
      {
        NAME: 'Day pending (eligible rows)',
        CONGREGATION: totalPending.toString(),
        'EARLY ENTRY DAYS': '',
      },
      { NAME: '', CONGREGATION: '', 'EARLY ENTRY DAYS': '' },
    ]

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Early Check-In')
    const allRows = [...summaryRows, ...data]
    if (allRows.length > 0) {
      worksheet.columns = Object.keys(allRows[0]).map((key) => ({ header: key, key }))
      allRows.forEach((row) => worksheet.addRow(row))
    }
    const buffer = await workbook.xlsx.writeBuffer()

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader('Content-Disposition', 'attachment; filename="IVS_Early_CheckIn_Report.xlsx"')
    res.send(buffer)
  } catch (error: unknown) {
    console.error('Error exporting check-in report:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ success: false, message })
  }
}

function formatDateTime(date: Date): string {
  const d = new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}/${day}/${year} ${hours}:${minutes}`
}
