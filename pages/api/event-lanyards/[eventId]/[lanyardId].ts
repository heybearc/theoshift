import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { randomUUID } from 'crypto'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/apiError'

// Validation schema for lanyard updates
const lanyardUpdateSchema = z.object({
  badgeNumber: z.string().min(1).max(50).optional(),
  status: z.enum(['AVAILABLE', 'CHECKED_OUT', 'LOST', 'DAMAGED', 'RETIRED']).optional(),
  notes: z.string().nullable().optional(),
  isCheckedOut: z.boolean().optional(),
  checkedOutTo: z.string().nullable().optional(),
  checkedOutAt: z.string().nullable().optional(),
  checkedInAt: z.string().nullable().optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { eventId, lanyardId } = req.query
    if (!eventId || typeof eventId !== 'string' || !lanyardId || typeof lanyardId !== 'string') {
      return res.status(400).json({ error: 'Event ID and Lanyard ID are required' })
    }

    switch (req.method) {
      case 'GET':
        const lanyard = await prisma.lanyards.findUnique({
          where: { id: lanyardId }
        })

        if (!lanyard) {
          return res.status(404).json({ error: 'Lanyard not found' })
        }

        return res.status(200).json({
          success: true,
          data: lanyard
        })

      case 'PUT':
        const validatedData = lanyardUpdateSchema.parse(req.body)
        const existing = await prisma.lanyards.findUnique({ where: { id: lanyardId } })
        if (!existing) {
          return res.status(404).json({ error: 'Lanyard not found' })
        }

        const returnedAt = validatedData.checkedInAt
          ? new Date(validatedData.checkedInAt)
          : new Date()
        const takenAt = validatedData.checkedOutAt
          ? new Date(validatedData.checkedOutAt)
          : new Date()
        const checkingIn = validatedData.isCheckedOut === false && existing.isCheckedOut
        const checkingOut =
          validatedData.isCheckedOut === true &&
          (!existing.isCheckedOut ||
            (validatedData.checkedOutTo && validatedData.checkedOutTo !== existing.checkedOutTo))

        const updatedLanyard = await prisma.$transaction(async (tx) => {
          if (checkingIn || (checkingOut && existing.isCheckedOut)) {
            const open = await tx.lanyard_checkouts.findFirst({
              where: { lanyardId, checkedInAt: null },
              orderBy: { checkedOutAt: 'desc' },
            })
            if (open) {
              await tx.lanyard_checkouts.update({
                where: { id: open.id },
                data: { checkedInAt: returnedAt },
              })
            } else if (existing.checkedOutTo) {
              await tx.lanyard_checkouts.create({
                data: {
                  id: randomUUID(),
                  lanyardId,
                  checkedOutTo: existing.checkedOutTo,
                  phone: existing.notes,
                  checkedOutAt: existing.checkedOutAt || returnedAt,
                  checkedInAt: returnedAt,
                },
              })
            }
          }

          if (checkingOut && validatedData.checkedOutTo) {
            await tx.lanyard_checkouts.create({
              data: {
                id: randomUUID(),
                lanyardId,
                checkedOutTo: validatedData.checkedOutTo,
                phone: validatedData.notes || null,
                checkedOutAt: takenAt,
              },
            })
          }

          return tx.lanyards.update({
            where: { id: lanyardId },
            data: {
              ...validatedData,
              updatedAt: new Date(),
            },
          })
        })

        return res.status(200).json({
          success: true,
          data: updatedLanyard,
          message: 'Lanyard updated successfully'
        })

      case 'DELETE':
        await prisma.lanyards.delete({
          where: { id: lanyardId }
        })

        return res.status(200).json({
          success: true,
          message: 'Lanyard deleted successfully'
        })

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    // Error logged by handleApiError
    return res.status(500).json({ error: 'Internal server error' })
  }
}
