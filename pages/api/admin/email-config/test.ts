import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import * as nodemailer from 'nodemailer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  
  if (!session || session.user?.role !== 'ADMIN') {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const { authType, config } = req.body

  if (!authType || !config) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing configuration' 
    })
  }

  try {
    // Create transporter based on auth type
    let transporter
    
    if (authType === 'gmail') {
      if (!config.gmailEmail || !config.gmailAppPassword) {
        return res.status(400).json({ 
          success: false, 
          error: 'Gmail email and app password are required' 
        })
      }
      
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: config.gmailEmail,
          pass: config.gmailAppPassword
        }
      })
    } else {
      if (!config.smtpServer || !config.smtpUser || !config.smtpPassword) {
        return res.status(400).json({ 
          success: false, 
          error: 'SMTP configuration incomplete' 
        })
      }
      
      transporter = nodemailer.createTransport({
        host: config.smtpServer,
        port: parseInt(config.smtpPort || '587'),
        secure: config.smtpSecure || false,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPassword
        }
      })
    }

    // Send test email
    const testEmail = session.user.email || config.fromEmail
    
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: testEmail,
      subject: 'Theocratic Shift Scheduler - Test Email',
      text: 'This is a test email from Theocratic Shift Scheduler. If you received this, your email configuration is working correctly!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">✅ Email Configuration Test</h2>
          <p>This is a test email from <strong>Theocratic Shift Scheduler</strong>.</p>
          <p>If you received this message, your email configuration is working correctly!</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            <strong>Configuration Details:</strong><br>
            Provider: ${authType === 'gmail' ? 'Gmail' : 'Custom SMTP'}<br>
            From: ${config.fromName} &lt;${config.fromEmail}&gt;<br>
            Sent: ${new Date().toLocaleString()}
          </p>
        </div>
      `
    })

    console.log('Test email sent successfully:', info.messageId)

    return res.json({ 
      success: true, 
      message: `✅ Test email sent successfully to ${testEmail}!`,
      details: {
        messageId: info.messageId,
        to: testEmail,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error: any) {
    console.error('Error sending test email:', error)
    return res.status(500).json({ 
      success: false, 
      error: `Failed to send test email: ${error.message}` 
    })
  }
}
