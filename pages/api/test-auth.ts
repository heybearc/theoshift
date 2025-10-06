import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth/[...nextauth]"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Testing getServerSession...')
    
    const session = await getServerSession(req, res, authOptions)
    
    if (session) {
      console.log('Session found:', session.user?.email)
      return res.status(200).json({ 
        success: true, 
        authenticated: true,
        user: session.user,
        message: 'Session working correctly'
      })
    } else {
      console.log('No session found')
      return res.status(401).json({ 
        success: false, 
        authenticated: false,
        message: 'No session found'
      })
    }
  } catch (error) {
    console.error('Auth test error:', error)
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
}
