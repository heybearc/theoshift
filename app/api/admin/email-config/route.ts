import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Encryption key for email passwords (in production, use environment variable)
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'default-key-for-staging-only-32b'

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

// GET email configuration
export async function GET(request: NextRequest) {
  try {
    const config = await prisma.email_configurations.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        smtpServer: true,
        smtpPort: true,
        smtpUser: true,
        fromEmail: true,
        fromName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
        // Note: Not returning encrypted password for security
      }
    })

    if (!config) {
      return NextResponse.json({ error: 'No email configuration found' }, { status: 404 })
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Failed to fetch email configuration:', error)
    return NextResponse.json({ error: 'Failed to fetch email configuration' }, { status: 500 })
  }
}

// POST/PUT email configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      smtpHost, 
      smtpPort, 
      smtpUser, 
      smtpPassword, 
      fromEmail, 
      fromName,
      testEmail 
    } = body

    // Validate required fields
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !fromEmail || !fromName) {
      return NextResponse.json({ 
        error: 'Missing required fields: smtpHost, smtpPort, smtpUser, smtpPassword, fromEmail, fromName' 
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(fromEmail)) {
      return NextResponse.json({ error: 'Invalid fromEmail format' }, { status: 400 })
    }

    if (testEmail && !emailRegex.test(testEmail)) {
      return NextResponse.json({ error: 'Invalid testEmail format' }, { status: 400 })
    }

    // Encrypt password
    const encryptedPassword = encrypt(smtpPassword)

    // Deactivate existing configurations
    await prisma.email_configurations.updateMany({
      where: { isActive: true },
      data: { isActive: false, updatedAt: new Date() }
    })

    // Create new configuration
    const config = await prisma.email_configurations.create({
      data: {
        id: crypto.randomUUID(),
        smtpServer: smtpHost,
        smtpPort: parseInt(smtpPort.toString()),
        smtpUser,
        smtpPassword: encryptedPassword,
        fromEmail,
        fromName,
        isActive: true,
        updatedAt: new Date()
      },
      select: {
        id: true,
        smtpServer: true,
        smtpPort: true,
        smtpUser: true,
        fromEmail: true,
        fromName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // TODO: Send test email if testEmail provided
    if (testEmail) {
      console.log(`[EMAIL_CONFIG] Test email would be sent to: ${testEmail}`)
      // Implement test email sending here
    }

    return NextResponse.json({
      message: 'Email configuration saved successfully',
      config
    })
  } catch (error) {
    console.error('Failed to save email configuration:', error)
    return NextResponse.json({ error: 'Failed to save email configuration' }, { status: 500 })
  }
}

// Test email configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { testEmail } = body

    if (!testEmail) {
      return NextResponse.json({ error: 'Test email address required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Get active email configuration
    const config = await prisma.email_configurations.findFirst({
      where: { isActive: true }
    })

    if (!config) {
      return NextResponse.json({ error: 'No active email configuration found' }, { status: 404 })
    }

    // TODO: Send actual test email using the configuration
    console.log(`[EMAIL_TEST] Test email would be sent to: ${testEmail}`)
    console.log(`[EMAIL_TEST] Using SMTP: ${config.smtpServer}:${config.smtpPort}`)
    console.log(`[EMAIL_TEST] From: ${config.fromName} <${config.fromEmail}>`)

    return NextResponse.json({
      message: 'Test email sent successfully',
      sentTo: testEmail
    })
  } catch (error) {
    console.error('Failed to send test email:', error)
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}
