import { File, Paths } from 'expo-file-system'

export async function openProtectedDocument(options: {
  apiBase: string
  eventId: string
  documentId: string
  fileName: string
  token: string
}) {
  const safeName = options.fileName.replace(/[^\w.\- ]+/g, '_') || 'document'
  const destination = new File(Paths.cache, safeName)
  const url = `${options.apiBase}/api/events/${options.eventId}/documents/${options.documentId}/file`
  const file = await File.downloadFileAsync(url, destination, {
    headers: { Authorization: `Bearer ${options.token}` },
    idempotent: true,
  })
  await file.preview({ title: options.fileName })
}
