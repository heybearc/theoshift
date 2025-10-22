import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check user permissions
    const user = await prisma.users.findUnique({
      where: { email: session.user?.email || '' }
    })

    if (!user || !['ADMIN', 'OVERSEER', 'admin', 'overseer'].includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const { id } = req.query
    const eventId = Array.isArray(id) ? id[0] : id

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ error: 'Event ID is required' })
    }

    console.log(`🧹 BULK CLEAR: Starting assignment cleanup for event ${eventId}`)

    // Get all assignments for this event
    const assignments = await prisma.assignments.findMany({
      where: { eventId: eventId }
    })

    console.log(`🧹 Found ${assignments.length} assignments to delete`)

    // Delete all assignments for this event
    const deleteResult = await prisma.assignments.deleteMany({
      where: { eventId: eventId }
    })

    console.log(`✅ BULK CLEAR: Deleted ${deleteResult.count} assignments`)

    return res.status(200).json({
      success: true,
      message: `Successfully cleared ${deleteResult.count} assignments`,
      deletedCount: deleteResult.count
    })

  } catch (error) {
    console.error('❌ Bulk clear assignments error:', error)
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}
