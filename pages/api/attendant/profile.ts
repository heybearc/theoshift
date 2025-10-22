import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../src/lib/prisma'
import bcrypt from 'bcryptjs'

// Format phone number to (XXX) XXX-XXXX
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone // Return as-is if not 10 digits
}

// Get last 4 digits of phone number
function getLastFourDigits(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.slice(-4)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { attendantId, email, phone } = req.body

    if (!attendantId) {
      return res.status(400).json({ success: false, error: 'Attendant ID is required' })
    }

    // Format phone number
    const formattedPhone = phone ? formatPhoneNumber(phone) : ''
    
    // Get last 4 digits for new PIN
    const newPin = phone ? getLastFourDigits(phone) : null
    
    // Hash the new PIN if we have one
    let pinHash = null
    if (newPin) {
      pinHash = await bcrypt.hash(newPin, 10)
    }

    // Update attendant profile, clear verification requirement, and update PIN
    if (pinHash) {
      await prisma.$executeRaw`
        UPDATE attendants 
        SET email = ${email || ''}, 
            phone = ${formattedPhone}, 
            "pinHash" = ${pinHash},
            "profileVerificationRequired" = false,
            "profileVerifiedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE id = ${attendantId}
      `
    } else {
      await prisma.$executeRaw`
        UPDATE attendants 
        SET email = ${email || ''}, 
            phone = ${formattedPhone}, 
            "profileVerificationRequired" = false,
            "profileVerifiedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE id = ${attendantId}
      `
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      newPin: newPin, // Return the new PIN to show the user
      formattedPhone: formattedPhone
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    })
  }
}
