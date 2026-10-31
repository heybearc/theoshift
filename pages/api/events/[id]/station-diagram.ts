import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { getStationDiagram, isDiagramFile, setStationDiagram } from '@/lib/stationDiagram'

const EDITORS = ['ADMIN', 'OVERSEER']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const eventId = typeof req.query.id === 'string' ? req.query.id : ''
  if (!eventId) {
    return res.status(400).json({ success: false, error: 'Event is required' })
  }

  if (req.method === 'GET') {
    const diagram = await getStationDiagram(eventId)
    return res.status(200).json({ success: true, diagram })
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  if (!EDITORS.includes(session.user.role || '')) {
    return res.status(403).json({ success: false, error: 'Only an admin or overseer can choose the diagram' })
  }

  const documentId = typeof req.body?.documentId === 'string' ? req.body.documentId.trim() : ''
  if (!documentId) {
    await setStationDiagram(eventId, null)
    return res.status(200).json({ success: true, diagram: null })
  }

  const document = await prisma.event_documents.findFirst({
    where: { id: documentId, eventId, isActive: true },
    select: { id: true, fileType: true, fileName: true },
  })
  if (!document || !isDiagramFile(document.fileType || '', document.fileName)) {
    return res.status(400).json({ success: false, error: 'Choose a PDF or image uploaded for this event' })
  }

  await setStationDiagram(eventId, document.id)
  const diagram = await getStationDiagram(eventId)
  return res.status(200).json({ success: true, diagram })
}
