import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    return res.status(200).json({ 
      success: true, 
      message: 'Simple API test working',
      timestamp: new Date().toISOString(),
      method: req.method
    })
  } catch (error) {
    console.error('Simple API error:', error)
    return res.status(500).json({ success: false, error: 'Simple API failed' })
  }
}
