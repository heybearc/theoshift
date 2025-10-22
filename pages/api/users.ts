import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { prisma } from '../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session || !session.user?.email) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    if (req.method === 'GET') {
      const { email, search } = req.query

      // Search by email (exact match)
      if (email && typeof email === 'string') {
        const user = await prisma.users.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        })

        if (!user) {
          return res.status(404).json({ 
            success: false, 
            error: 'User not found' 
          })
        }

        return res.status(200).json({
          success: true,
          data: user
        })
      }

      // Search users (partial match on name or email)
      if (search && typeof search === 'string') {
        const users = await prisma.users.findMany({
          where: {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } }
            ]
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          },
          take: 10,
          orderBy: [
            { firstName: 'asc' },
            { lastName: 'asc' }
          ]
        })

        return res.status(200).json({
          success: true,
          data: users
        })
      }

      // List all users (admin only)
      const currentUser = await prisma.users.findUnique({
        where: { email: session.user.email }
      })

      if (currentUser?.role !== 'ADMIN') {
        return res.status(403).json({ 
          success: false, 
          error: 'Admin access required' 
        })
      }

      const users = await prisma.users.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true
        },
        orderBy: [
          { firstName: 'asc' },
          { lastName: 'asc' }
        ]
      })

      return res.status(200).json({
        success: true,
        data: users
      })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('Users API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
