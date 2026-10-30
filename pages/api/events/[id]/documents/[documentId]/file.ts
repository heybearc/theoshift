import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]'
import { prisma } from '../../../../../../src/lib/prisma'
import fs from 'fs'
import path from 'path'
import { getDocumentAbsolutePath } from '@/lib/documentFileStorage'
import { tryPipeUploadFromPeers } from '@/lib/uploadPeerFallback'

const STAFF_ROLES = ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'SUPPORT'] as const

const EXT_TO_CONTENT_TYPE: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) {
    return res.status(401).send('Unauthorized')
  }

  const { id: eventId, documentId } = req.query
  if (typeof eventId !== 'string' || typeof documentId !== 'string') {
    return res.status(400).send('Bad request')
  }

  try {
    const document = await prisma.event_documents.findFirst({
      where: { id: documentId, eventId, isActive: true },
    })

    if (!document) {
      return res.status(404).send('Not found')
    }

    const role = session.user.role || ''
    let allowed = false

    if (STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])) {
      allowed = true
    } else if (role === 'VOLUNTEER') {
      const pub = await prisma.document_publications.findUnique({
        where: {
          documentId_volunteerId: {
            documentId,
            volunteerId: session.user.id,
          },
        },
      })
      allowed = !!pub
    }

    if (!allowed) {
      return res.status(403).send('Forbidden')
    }

    const absPath = getDocumentAbsolutePath(document.fileUrl)
    const filename = path.basename(document.fileUrl.split('?')[0] || '')
    const safeName =
      document.fileName.replace(/[^\w.\- ]+/g, '_') || 'document'

    if (!absPath || !fs.existsSync(absPath)) {
      const extGuess = path.extname(filename).toLowerCase()
      const hint =
        EXT_TO_CONTENT_TYPE[extGuess] ||
        document.fileType ||
        'application/octet-stream'
      if (
        filename &&
        (await tryPipeUploadFromPeers(['documents', filename], res, {
          contentTypeHint: hint,
          contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(safeName)}`,
          cacheControl: 'private, max-age=3600'
        }))
      ) {
        return
      }
      return res.status(404).send('File not found')
    }

    const ext = path.extname(absPath).toLowerCase()

    const stat = fs.statSync(absPath)
    res.setHeader('Content-Type', EXT_TO_CONTENT_TYPE[ext] || 'application/octet-stream')
    res.setHeader('Content-Length', stat.size)
    res.setHeader('Cache-Control', 'private, max-age=3600')

    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(safeName)}`
    )

    const stream = fs.createReadStream(absPath)
    stream.pipe(res)
  } catch (e) {
    console.error('Document file GET error:', e)
    return res.status(500).send('Internal server error')
  }
}
