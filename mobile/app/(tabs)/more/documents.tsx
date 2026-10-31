import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useDashboard } from '@/lib/dashboard'
import { useAuth } from '@/lib/auth'
import { openProtectedDocument } from '@/lib/openDocument'

export default function DocumentsScreen() {
  const { token, apiBase } = useAuth()
  const { data, loading, error, eventId } = useDashboard()
  const [openingId, setOpeningId] = useState('')
  const [openError, setOpenError] = useState('')

  async function openDocument(documentId: string, fileName: string) {
    if (!token || !eventId) return
    setOpeningId(documentId)
    setOpenError('')
    try {
      await openProtectedDocument({ apiBase, eventId, documentId, fileName, token })
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'Could not open that document')
    } finally {
      setOpeningId('')
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {loading ? <ActivityIndicator style={styles.spinner} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {openError ? <Text style={styles.error}>{openError}</Text> : null}
      {!loading && (data?.documents.length || 0) === 0 ? (
        <Text style={styles.empty}>No documents have been published to you for this event.</Text>
      ) : null}
      {data?.documents.map((document) => (
        <Pressable
          key={document.id}
          style={styles.card}
          disabled={openingId === document.id}
          onPress={() => void openDocument(document.id, document.fileName)}
        >
          <Text style={styles.title}>{document.title}</Text>
          {document.description ? <Text style={styles.meta}>{document.description}</Text> : null}
          <Text style={styles.meta}>{openingId === document.id ? 'Opening…' : document.fileName}</Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  card: { marginTop: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 4, color: '#475569' },
  empty: { color: '#475569', lineHeight: 22 },
  error: { color: '#b91c1c', marginBottom: 8 },
  spinner: { marginTop: 12 },
})
