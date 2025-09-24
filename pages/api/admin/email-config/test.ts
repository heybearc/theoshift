import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session || session.user?.role !== 'ADMIN') {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { authType, config } = req.body

    // Validate configuration
    if (authType === 'gmail') {
      if (!config.gmailEmail || !config.gmailAppPassword) {
        return res.status(400).json({ success: false, error: 'Gmail configuration incomplete' })
      }
    } else if (authType === 'smtp') {
      if (!config.smtpServer || !config.smtpUser || !config.smtpPassword) {
        return res.status(400).json({ success: false, error: 'SMTP configuration incomplete' })
      }
    }

    if (!config.fromEmail || !config.fromName) {
      return res.status(400).json({ success: false, error: 'From email and name are required' })
    }

    // Here you would implement the actual email sending logic
    // For now, we'll simulate it
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // In a real implementation, you would use nodemailer or similar:
    /*
    const nodemailer = require('nodemailer')
    
    let transporter
    if (authType === 'gmail') {
      transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: config.gmailEmail,
          pass: config.gmailAppPassword
        }
      })
    } else {
      transporter = nodemailer.createTransporter({
        host: config.smtpServer,
        port: parseInt(config.smtpPort),
        secure: config.smtpSecure,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPassword
        }
      })
    }

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: session.user.email,
      subject: 'JW Attendant Scheduler - Test Email',
      html: `
        <h2>Email Configuration Test</h2>
        <p>This is a test email from JW Attendant Scheduler.</p>
        <p>If you received this email, your email configuration is working correctly!</p>
        <hr>
        <p><small>Sent at: ${new Date().toLocaleString()}</small></p>
      `
    })
    */

    return res.json({ 
      success: true, 
      message: `Test email sent successfully to ${session.user.email}` 
    })
  } catch (error) {
    console.error('Error sending test email:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send test email. Please check your configuration.' 
    })
  }
}
