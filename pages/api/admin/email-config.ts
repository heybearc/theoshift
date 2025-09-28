import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session || session.user?.role !== 'ADMIN') {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      // Get email configuration from database
      const config = await prisma.system_settings.findFirst({
        where: { key: 'email_config' }
      })

      if (config) {
        return res.json({
          success: true,
          data: JSON.parse(config.value)
        })
      } else {
        // Return default configuration
        return res.json({
          success: true,
          data: {
            authType: 'gmail',
            config: {
              gmailEmail: '',
              gmailAppPassword: '',
              smtpServer: 'smtp.gmail.com',
              smtpPort: '587',
              smtpUser: '',
              smtpPassword: '',
              smtpSecure: true,
              fromEmail: '',
              fromName: 'JW Attendant Scheduler',
              replyToEmail: ''
            }
          }
        })
      }
    } catch (error) {
      console.error('Error fetching email config:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch configuration' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { authType, config } = req.body

      // Validate required fields
      if (authType === 'gmail') {
        if (!config.gmailEmail || !config.gmailAppPassword) {
          return res.status(400).json({ success: false, error: 'Gmail email and app password are required' })
        }
      } else if (authType === 'smtp') {
        if (!config.smtpServer || !config.smtpUser || !config.smtpPassword) {
          return res.status(400).json({ success: false, error: 'SMTP server, username, and password are required' })
        }
      }

      if (!config.fromEmail || !config.fromName) {
        return res.status(400).json({ success: false, error: 'From email and name are required' })
      }

      // Save or update email configuration
      await prisma.system_settings.upsert({
        where: { key: 'email_config' },
        update: {
          value: JSON.stringify({ authType, config }),
          updatedBy: session.user.id
        },
        create: {
          key: 'email_config',
          value: JSON.stringify({ authType, config }),
          createdBy: session.user.id,
          updatedBy: session.user.id
        }
      })

      return res.json({ success: true, message: 'Email configuration saved successfully' })
    } catch (error) {
      console.error('Error saving email config:', error)
      return res.status(500).json({ success: false, error: 'Failed to save configuration' })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
