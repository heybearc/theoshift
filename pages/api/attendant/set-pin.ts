import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    // Check admin authentication
    const session = await getServerSession(req, res, authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Unauthorized' })
    }

    const { attendantId, pin, autoGenerate } = req.body

    if (!attendantId) {
      return res.status(400).json({ success: false, error: 'Attendant ID is required' })
    }

    let finalPin = pin

    // Auto-generate PIN from phone number if requested
    if (autoGenerate) {
      const attendant = await prisma.attendants.findUnique({
        where: { id: attendantId },
        select: { phone: true }
      })

      if (!attendant?.phone) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot auto-generate PIN: No phone number on file' 
        })
      }

      // Extract last 4 digits from phone number
      const digits = attendant.phone.replace(/\D/g, '')
      if (digits.length < 4) {
        return res.status(400).json({ 
          success: false, 
          error: 'Phone number must have at least 4 digits' 
        })
      }
      finalPin = digits.slice(-4)
    }

    if (!finalPin || finalPin.length !== 4 || !/^\d{4}$/.test(finalPin)) {
      return res.status(400).json({ 
        success: false, 
        error: 'PIN must be exactly 4 digits' 
      })
    }

    // Hash the PIN
    const pinHash = await bcrypt.hash(finalPin, 10)

    // Update attendant with PIN
    await prisma.$executeRaw`
      UPDATE attendants 
      SET "pinHash" = ${pinHash}, "updatedAt" = NOW() 
      WHERE id = ${attendantId}
    `

    return res.status(200).json({
      success: true,
      message: 'PIN set successfully',
      pin: finalPin // Return PIN so admin can communicate it to attendant
    })
  } catch (error) {
    console.error('Set PIN error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to set PIN'
    })
  }
}
