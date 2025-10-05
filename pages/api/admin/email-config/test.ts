import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'

// LXC SMTP Relay Service Configuration
const SMTP_RELAY_API = 'http://10.92.3.136:3000'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  
  if (!session || session.user?.role !== 'ADMIN') {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const { to, subject, message } = req.body

  if (!to || !subject || !message) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: to, subject, message' 
    })
  }

  // SMTP Relay disabled for stability
  const USE_LXC_SMTP = process.env.USE_LXC_SMTP === 'true'
  
  if (!USE_LXC_SMTP) {
    console.log('EMAIL TEST (SMTP DISABLED):', { to, subject, message })
    return res.status(200).json({
      success: true,
      message: 'Email test completed (SMTP relay disabled)',
      data: { to, subject, status: 'logged' }
    })
  }

  try {
    // Test LXC SMTP Relay (only when enabled)
    const response = await fetch(SMTP_RELAY_API + '/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    })
    console.log('Email test request received:', { requestData: { ...req.body, gmailAppPassword: '***', smtpPassword: '***', password: '***' } })

    // Extract configuration from request body (handle different formats)
    const authType = req.body.authType || (req.body.smtpHost === 'smtp.gmail.com' ? 'gmail' : 'smtp')
    const config = req.body.config || req.body
    // Validate configuration based on the actual form data structure
    if (authType === 'gmail' || config.smtpHost === 'smtp.gmail.com') {
      const gmailEmail = config.gmailEmail || config.username || config.smtpUser
      const gmailPassword = config.gmailAppPassword || config.password || config.smtpPassword
      const fromEmail = config.fromEmail || gmailEmail
      const fromName = config.fromName || 'JW Attendant Scheduler'
      
      if (!gmailEmail || !gmailPassword) {
        return res.status(400).json({ success: false, error: 'Gmail email and app password are required' })
      }
      if (!fromEmail) {
        return res.status(400).json({ success: false, error: 'From email is required' })
      }
    } else {
      if (!config.smtpServer || !config.smtpUser || !config.smtpPassword) {
        return res.status(400).json({ success: false, error: 'SMTP configuration incomplete' })
      }
      if (!config.fromEmail) {
        return res.status(400).json({ success: false, error: 'From email is required' })
      }
    }

    // Prepare configuration for LXC SMTP relay
    let smtpConfig
    if (authType === 'gmail' || config.smtpHost === 'smtp.gmail.com') {
      const gmailEmail = config.gmailEmail || config.username || config.smtpUser
      const gmailPassword = config.gmailAppPassword || config.password || config.smtpPassword
      const fromEmail = config.fromEmail || gmailEmail
      const fromName = config.fromName || 'JW Attendant Scheduler'
      
      smtpConfig = {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: gmailEmail,
        smtpPassword: gmailPassword,
        fromEmail: fromEmail,
        fromName: fromName
      }
    } else {
      smtpConfig = {
        smtpHost: config.smtpServer || config.smtpHost,
        smtpPort: parseInt(config.smtpPort || '587'),
        smtpUser: config.smtpUser || config.username,
        smtpPassword: config.smtpPassword || config.password,
        fromEmail: config.fromEmail,
        fromName: config.fromName || 'JW Attendant Scheduler'
      }
    }

    console.log('Configuring LXC SMTP relay...')
    
    // Configure the LXC SMTP relay service
    const configResponse = await fetch(`${SMTP_RELAY_API}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(smtpConfig)
    })

    if (!configResponse.ok) {
      const configError = await configResponse.json()
      throw new Error(`SMTP relay configuration failed: ${configError.error}`)
    }

    console.log('SMTP relay configured, sending test email...')

    // Send test email via LXC SMTP relay
    const testResponse = await fetch(`${SMTP_RELAY_API}/api/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        testEmail: session.user.email || config.gmailEmail || config.smtpUser 
      })
    })

    if (!testResponse.ok) {
      const testError = await testResponse.json()
      throw new Error(`Test email failed: ${testError.error}`)
    }

    const result = await testResponse.json()
    console.log('Test email sent successfully:', result)

    return res.json({ 
      success: true, 
      message: `✅ Test email sent successfully via LXC SMTP Relay (Container 136)!`,
      details: {
        service: 'LXC SMTP Relay',
        container: '136',
        ip: '10.92.3.136',
        to: session.user.email || config.gmailEmail || config.smtpUser,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error sending test email:', error)
    return res.status(500).json({ 
      success: false, 
      error: `Failed to send test email via LXC SMTP relay: ${error.message}` 
    })
  }
}
