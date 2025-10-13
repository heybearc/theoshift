import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../../../src/lib/prisma'
import fs from 'fs'
import path from 'path'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Document delete API called:', req.method)
    
    const { id: eventId, documentId } = req.query

    if (!eventId || typeof eventId !== 'string' || !documentId || typeof documentId !== 'string') {
      return res.status(400).json({ success: false, error: 'Event ID and Document ID are required' })
    }

    switch (req.method) {
      case 'DELETE':
        return handleDeleteDocument(req, res, eventId, documentId)
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Document API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleDeleteDocument(req: NextApiRequest, res: NextApiResponse, eventId: string, documentId: string) {
  try {
    // Fetch document from database to get file path
    const document = await prisma.event_documents.findUnique({
      where: { id: documentId }
    })

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' })
    }

    // Verify document belongs to this event
    if (document.eventId !== eventId) {
      return res.status(403).json({ success: false, error: 'Document does not belong to this event' })
    }

    // Delete file from filesystem
    try {
      const filePath = path.join(process.cwd(), 'public', document.fileUrl)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log(`Deleted file: ${filePath}`)
      }
    } catch (fileError) {
      console.error('Error deleting file:', fileError)
      // Continue even if file deletion fails
    }

    // Delete related document_publications records
    await prisma.document_publications.deleteMany({
      where: { documentId }
    })

    // Delete document record from database
    await prisma.event_documents.delete({
      where: { id: documentId }
    })

    console.log(`Successfully deleted document ${documentId} from event ${eventId}`)

    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    })
  } catch (error) {
    console.error('Delete document error:', error)
    return res.status(500).json({ success: false, error: 'Failed to delete document' })
  }
}
