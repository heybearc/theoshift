import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { getReviewSignInForAdmin, reviewSignInInstructions, saveReviewSignIn } from '@/lib/reviewSignIn'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    const data = await getReviewSignInForAdmin()
    return res.status(200).json({
      success: true,
      data: {
        ...data,
        instructions: data.configured ? reviewSignInInstructions(data.email, data.code) : '',
      },
    })
  }

  if (req.method === 'POST') {
    const email = typeof req.body?.email === 'string' ? req.body.email : ''
    const code = typeof req.body?.code === 'string' ? req.body.code : ''
    const saved = await saveReviewSignIn(email, code, session.user.id)
    if (!saved.ok) return res.status(400).json({ success: false, error: saved.error })
    const data = await getReviewSignInForAdmin()
    return res.status(200).json({
      success: true,
      data: {
        ...data,
        instructions: reviewSignInInstructions(saved.email, saved.code),
      },
    })
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
