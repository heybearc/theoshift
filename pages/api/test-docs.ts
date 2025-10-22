import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // Get documents
      const docs = await prisma.event_documents.findMany({
        where: { eventId: 'd43d977b-c06e-446f-8c6d-05b407daf459' }
      })
      
      return res.status(200).json({
        success: true,
        data: { documents: docs },
        message: `Found ${docs.length} documents`
      })
    }
    
    if (req.method === 'POST') {
      // Create test document
      const doc = await prisma.event_documents.create({
        data: {
          eventId: 'd43d977b-c06e-446f-8c6d-05b407daf459',
          title: 'API Test Document',
          fileName: 'api-test.pdf',
          fileUrl: '/uploads/api-test.pdf',
          fileType: 'application/pdf',
          fileSize: 2000,
          uploadedBy: 'API Test'
        }
      })
      
      return res.status(201).json({
        success: true,
        data: { document: doc },
        message: 'Test document created'
      })
    }
    
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('Test API error:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
}
