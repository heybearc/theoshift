import { randomUUID } from 'crypto'
import { prisma } from './prisma'
import { sendDocumentPublishEmail, isEmailConfigured } from './email'

/**
 * Documents published to the whole roster are a snapshot. A brother assigned
 * later does not have a publication row until this runs.
 */
export async function grantAllPublishedDocuments(
  eventId: string,
  volunteerId: string,
  options?: { notify?: boolean }
): Promise<number> {
  const [docs, event, volunteer] = await Promise.all([
    prisma.event_documents.findMany({
      where: { eventId, isActive: true, publishedTo: 'all' },
      select: { id: true, title: true },
    }),
    prisma.events.findUnique({ where: { id: eventId }, select: { name: true } }),
    prisma.volunteers.findUnique({
      where: { id: volunteerId },
      select: { firstName: true, email: true },
    }),
  ])

  if (docs.length === 0) return 0

  const existing = await prisma.document_publications.findMany({
    where: { volunteerId, documentId: { in: docs.map((doc) => doc.id) } },
    select: { documentId: true },
  })
  const already = new Set(existing.map((row) => row.documentId))
  const missing = docs.filter((doc) => !already.has(doc.id))
  if (missing.length === 0) return 0

  await prisma.document_publications.createMany({
    data: missing.map((doc) => ({
      id: randomUUID(),
      documentId: doc.id,
      volunteerId,
      publishedAt: new Date(),
    })),
    skipDuplicates: true,
  })

  await Promise.all(
    missing.map((doc) =>
      prisma.event_documents.update({
        where: { id: doc.id },
        data: { publishedCount: { increment: 1 } },
      })
    )
  )

  const email = volunteer?.email?.trim()
  if (options?.notify !== false && email && event) {
    void notifyGrantedDocuments({
      eventId,
      eventName: event.name,
      firstName: volunteer?.firstName || 'Volunteer',
      email,
      titles: missing.map((doc) => doc.title),
    }).catch((error) => {
      console.error('Failed to email newly granted documents', error)
    })
  }

  return missing.length
}

async function notifyGrantedDocuments(input: {
  eventId: string
  eventName: string
  firstName: string
  email: string
  titles: string[]
}) {
  if (!(await isEmailConfigured())) return
  const baseUrl = process.env.NEXTAUTH_URL || 'https://theoshift.com'
  const documentUrl = `${baseUrl}/volunteer/dashboard?eventId=${input.eventId}`
  for (const title of input.titles) {
    await sendDocumentPublishEmail({
      firstName: input.firstName,
      email: input.email,
      documentTitle: title,
      eventName: input.eventName,
      documentUrl,
    })
  }
}
