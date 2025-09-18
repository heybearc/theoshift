import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../utils/auth'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Simple encryption for email passwords (in production, use proper key management)
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'default-key-change-in-production'

function encrypt(text: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

function decrypt(encryptedText: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export async function GET() {
  try {
    const user = await AuthService.getCurrentUser()
    
    if (!user || !['ADMIN', 'OVERSEER'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await prisma.email_configurations.findFirst({
      where: { isActive: true }
    })

    if (!config) {
      return NextResponse.json({ error: 'No email configuration found' }, { status: 404 })
    }

    // Don't return the encrypted password
    const { smtpPassword, ...safeConfig } = config
    return NextResponse.json(safeConfig)
  } catch (error) {
    console.error('Failed to fetch email config:', error)
    return NextResponse.json({ error: 'Failed to fetch email configuration' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      smtpServer,
      smtpPort,
      smtpUser,
      smtpPassword,
      fromEmail,
      fromName,
      replyToEmail,
      inviteTemplate,
      assignmentTemplate,
      reminderTemplate
    } = body

    if (!smtpServer || !smtpPort || !smtpUser || !smtpPassword || !fromEmail || !fromName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Deactivate existing configurations
    await prisma.email_configurations.updateMany({
      where: { isActive: true },
      data: { isActive: false, updatedAt: new Date() }
    })

    // Create new configuration
    const config = await prisma.email_configurations.create({
      data: {
        id: crypto.randomUUID(),
        smtpServer,
        smtpPort: parseInt(smtpPort),
        smtpUser,
        smtpPassword: encrypt(smtpPassword),
        fromEmail,
        fromName,
        replyToEmail,
        inviteTemplate,
        assignmentTemplate,
        reminderTemplate,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    const { smtpPassword: _, ...safeConfig } = config
    return NextResponse.json(safeConfig, { status: 201 })
  } catch (error) {
    console.error('Failed to create email config:', error)
    return NextResponse.json({ error: 'Failed to create email configuration' }, { status: 500 })
  }
}
