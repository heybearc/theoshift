import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

export type StationDiagram = {
  documentId: string
  title: string
  fileType: string
  fileName: string
}

export function readStationDiagramId(settings: unknown): string | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null
  const id = (settings as { stationDiagram?: { documentId?: unknown } }).stationDiagram?.documentId
  return typeof id === 'string' && id.trim() ? id : null
}

export function isDiagramFile(fileType: string, fileName: string): boolean {
  const type = fileType.toLowerCase()
  const name = fileName.toLowerCase()
  return (
    type.includes('pdf') ||
    type.includes('image') ||
    /\.(pdf|png|jpe?g|gif|webp)$/.test(name)
  )
}

export async function getStationDiagram(eventId: string): Promise<StationDiagram | null> {
  const event = await prisma.events.findUnique({
    where: { id: eventId },
    select: { settings: true },
  })
  const documentId = readStationDiagramId(event?.settings)
  if (!documentId) return null
  const document = await prisma.event_documents.findFirst({
    where: { id: documentId, eventId, isActive: true },
    select: { id: true, title: true, fileType: true, fileName: true },
  })
  if (!document || !isDiagramFile(document.fileType || '', document.fileName)) return null
  return {
    documentId: document.id,
    title: document.title,
    fileType: document.fileType || '',
    fileName: document.fileName,
  }
}

export async function setStationDiagram(eventId: string, documentId: string | null): Promise<void> {
  const event = await prisma.events.findUnique({
    where: { id: eventId },
    select: { settings: true },
  })
  const current =
    event?.settings && typeof event.settings === 'object' && !Array.isArray(event.settings)
      ? { ...(event.settings as Record<string, unknown>) }
      : {}
  if (documentId) current.stationDiagram = { documentId }
  else delete current.stationDiagram
  await prisma.events.update({
    where: { id: eventId },
    data: { settings: current as Prisma.InputJsonValue, updatedAt: new Date() },
  })
}

/** A volunteer on this event may open the diagram without it being in their documents list. */
export async function volunteerMayViewStationDiagram(
  eventId: string,
  sessionUserId: string,
  viewAsVolunteerId: string | null
): Promise<boolean> {
  const ids = new Set<string>([sessionUserId])
  if (viewAsVolunteerId) ids.add(viewAsVolunteerId)
  const linked = await prisma.volunteers.findFirst({
    where: { userId: sessionUserId },
    select: { id: true },
  })
  if (linked) ids.add(linked.id)
  const membership = await prisma.event_volunteers.findFirst({
    where: { eventId, isActive: true, volunteerId: { in: [...ids] } },
    select: { id: true },
  })
  return !!membership
}
