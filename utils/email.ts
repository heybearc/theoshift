import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Encryption key for email passwords (in production, use environment variable)
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'default-key-for-staging-only-32b'

function decrypt(encryptedText: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export interface EmailConfig {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  fromEmail: string
  fromName: string
}

export class EmailService {
  private static async getEmailConfig(): Promise<EmailConfig | null> {
    try {
      const config = await prisma.email_configurations.findFirst({
        where: { isActive: true }
      })

      if (!config) {
        console.error('[EMAIL_SERVICE] No active email configuration found')
        return null
      }

      return {
        smtpHost: config.smtpServer,
        smtpPort: config.smtpPort,
        smtpUser: config.smtpUser,
        smtpPassword: decrypt(config.smtpPassword),
        fromEmail: config.fromEmail,
        fromName: config.fromName
      }
    } catch (error) {
      console.error('[EMAIL_SERVICE] Failed to get email configuration:', error)
      return null
    }
  }

  static async sendInvitationEmail(
    recipientEmail: string,
    recipientName: string,
    inviteToken: string,
    inviterName?: string
  ): Promise<boolean> {
    try {
      const config = await this.getEmailConfig()
      if (!config) {
        console.error('[EMAIL_SERVICE] Cannot send invitation - no email configuration')
        return false
      }

      const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/auth/accept-invite?token=${inviteToken}`
      
      const subject = 'Invitation to JW Attendant Scheduler'
      const htmlBody = this.generateInvitationEmailHTML(recipientName, inviteUrl, inviterName)
      const textBody = this.generateInvitationEmailText(recipientName, inviteUrl, inviterName)

      // TODO: Implement actual email sending using Gmail SMTP
      // For now, log the email details
      console.log('[EMAIL_SERVICE] Invitation email prepared:')
      console.log(`To: ${recipientEmail}`)
      console.log(`Subject: ${subject}`)
      console.log(`Invite URL: ${inviteUrl}`)
      console.log(`SMTP Config: ${config.smtpHost}:${config.smtpPort}`)
      console.log(`From: ${config.fromName} <${config.fromEmail}>`)

      // Simulate successful email sending for staging
      return true
    } catch (error) {
      console.error('[EMAIL_SERVICE] Failed to send invitation email:', error)
      return false
    }
  }

  static async sendTestEmail(recipientEmail: string): Promise<boolean> {
    try {
      const config = await this.getEmailConfig()
      if (!config) {
        console.error('[EMAIL_SERVICE] Cannot send test email - no email configuration')
        return false
      }

      const subject = 'Test Email from JW Attendant Scheduler'
      const htmlBody = this.generateTestEmailHTML()
      const textBody = this.generateTestEmailText()

      // TODO: Implement actual email sending using Gmail SMTP
      console.log('[EMAIL_SERVICE] Test email prepared:')
      console.log(`To: ${recipientEmail}`)
      console.log(`Subject: ${subject}`)
      console.log(`SMTP Config: ${config.smtpHost}:${config.smtpPort}`)
      console.log(`From: ${config.fromName} <${config.fromEmail}>`)

      return true
    } catch (error) {
      console.error('[EMAIL_SERVICE] Failed to send test email:', error)
      return false
    }
  }

  private static generateInvitationEmailHTML(
    recipientName: string,
    inviteUrl: string,
    inviterName?: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation to JW Attendant Scheduler</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>JW Attendant Scheduler</h1>
        </div>
        <div class="content">
            <h2>You're Invited!</h2>
            <p>Hello ${recipientName},</p>
            ${inviterName ? `<p>${inviterName} has invited you to join the JW Attendant Scheduler system.</p>` : '<p>You have been invited to join the JW Attendant Scheduler system.</p>'}
            <p>This system helps manage attendant assignments and scheduling for our congregation.</p>
            <p>To accept your invitation and set up your account, please click the button below:</p>
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${inviteUrl}">${inviteUrl}</a></p>
            <p><strong>Important:</strong> This invitation will expire in 7 days.</p>
        </div>
        <div class="footer">
            <p>This is an automated message from JW Attendant Scheduler.</p>
        </div>
    </div>
</body>
</html>
    `
  }

  private static generateInvitationEmailText(
    recipientName: string,
    inviteUrl: string,
    inviterName?: string
  ): string {
    return `
JW Attendant Scheduler - Invitation

Hello ${recipientName},

${inviterName ? `${inviterName} has invited you to join the JW Attendant Scheduler system.` : 'You have been invited to join the JW Attendant Scheduler system.'}

This system helps manage attendant assignments and scheduling for our congregation.

To accept your invitation and set up your account, please visit:
${inviteUrl}

Important: This invitation will expire in 7 days.

This is an automated message from JW Attendant Scheduler.
    `
  }

  private static generateTestEmailHTML(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Test Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f0f9ff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Email Configuration Test</h1>
        </div>
        <div class="content">
            <h2>Success!</h2>
            <p>This is a test email from JW Attendant Scheduler.</p>
            <p>If you received this email, your email configuration is working correctly.</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
        </div>
    </div>
</body>
</html>
    `
  }

  private static generateTestEmailText(): string {
    return `
JW Attendant Scheduler - Email Configuration Test

Success!

This is a test email from JW Attendant Scheduler.
If you received this email, your email configuration is working correctly.

Timestamp: ${new Date().toISOString()}
    `
  }
}
