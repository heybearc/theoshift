import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { attendantId } = req.body

  if (!attendantId) {
    return res.status(400).json({ success: false, error: 'Missing attendantId' })
  }

  try {
    // Update Paul Lewis's verification status
    await prisma.$executeRaw`
      UPDATE attendants 
      SET "profileVerifiedAt" = NOW(),
          "profileVerificationRequired" = false
      WHERE id = ${attendantId}
    `

    return res.status(200).json({
      success: true,
      message: 'Verification status updated successfully'
    })
  } catch (error) {
    console.error('Update verification error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
