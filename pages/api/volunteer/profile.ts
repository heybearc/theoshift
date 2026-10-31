import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../src/lib/prisma'
import { normalizePhoneForStorage } from '@/lib/formatPhone'
import { getApiSession } from '@/lib/apiSession'

const STAFF_ROLES = ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'SUPPORT', 'COORDINATOR']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const session = await getApiSession(req, res)
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const { volunteerId, email, phone } = req.body

    if (!volunteerId || typeof volunteerId !== 'string') {
      return res.status(400).json({ success: false, error: 'Volunteer ID is required' })
    }

    const role = (session.user.role || '').toUpperCase()
    const isStaff = STAFF_ROLES.includes(role)
    if (!isStaff && session.user.id !== volunteerId) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this profile' })
    }

    const formattedPhone = phone ? normalizePhoneForStorage(phone) : ''

    await prisma.volunteers.update({
      where: { id: volunteerId },
      data: {
        email: email || '',
        phone: formattedPhone || null,
        profileVerificationRequired: false,
        profileVerifiedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      formattedPhone,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    })
  }
}
