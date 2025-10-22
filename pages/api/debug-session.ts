import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth/[...nextauth]"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('=== DEBUG SESSION ===')
    console.log('Headers:', JSON.stringify(req.headers, null, 2))
    
    const session = await getServerSession(req, res, authOptions)
    
    console.log('Session result:', session)
    
    if (session) {
      return res.status(200).json({ 
        success: true, 
        authenticated: true,
        user: session.user,
        session: session
      })
    } else {
      return res.status(200).json({ 
        success: false, 
        authenticated: false,
        message: 'No session found',
        cookies: req.headers.cookie || 'No cookies'
      })
    }
  } catch (error) {
    console.error('Debug session error:', error)
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
}
