import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { attendantId, email, phone } = req.body

    if (!attendantId) {
      return res.status(400).json({ success: false, error: 'Attendant ID is required' })
    }

    // Update attendant profile
    await prisma.attendants.update({
      where: { id: attendantId },
      data: {
        email: email || '',
        phone: phone || '',
        updatedAt: new Date()
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully'
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    })
  }
}
