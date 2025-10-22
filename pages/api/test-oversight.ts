import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 Testing oversight relation...')
    
    // Test 1: Direct query of position_oversight_assignments
    const directOversight = await prisma.position_oversight_assignments.findMany({
      include: {
        overseer: { select: { firstName: true, lastName: true } },
        keyman: { select: { firstName: true, lastName: true } },
        position: { select: { positionNumber: true, name: true } }
      }
    })
    console.log('✅ Direct oversight query found:', directOversight.length)
    
    // Test 2: Query positions with oversight relation
    const positionsWithOversight = await (prisma as any).positions.findMany({
      where: { eventId: 'd43d977b-c06e-446f-8c6d-05b407daf459' },
      include: {
        oversight: {
          include: {
            overseer: { select: { firstName: true, lastName: true } },
            keyman: { select: { firstName: true, lastName: true } }
          }
        }
      }
    })
    console.log('✅ Positions with oversight relation found:', positionsWithOversight.length)
    
    const positionsWithData = positionsWithOversight.filter((p: any) => p.oversight && p.oversight.length > 0)
    console.log('✅ Positions with oversight data:', positionsWithData.length)
    
    return res.status(200).json({
      success: true,
      directOversight: directOversight.length,
      positionsTotal: positionsWithOversight.length,
      positionsWithOversight: positionsWithData.length,
      sampleData: positionsWithData.slice(0, 2)
    })
  } catch (error) {
    console.error('❌ Test oversight error:', error)
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}
