import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useDashboard } from '@/lib/dashboard'

export default function ContactsScreen() {
  const { data, loading, error } = useDashboard()
  const contacts = data?.oversightContacts || []

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {loading ? <Text style={styles.meta}>Loading…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && contacts.length === 0 ? (
        <Text style={styles.meta}>No overseer or keyman is listed for you on this event.</Text>
      ) : null}
      {contacts.map((contact) => (
        <View key={`${contact.role}-${contact.name}`} style={styles.card}>
          <Text style={styles.role}>{contact.role}</Text>
          <Text style={styles.name}>{contact.name}</Text>
          {contact.phone ? (
            <Pressable onPress={() => void Linking.openURL(`tel:${contact.phone}`)}>
              <Text style={styles.link}>{contact.phone}</Text>
            </Pressable>
          ) : null}
          {contact.email ? (
            <Pressable onPress={() => void Linking.openURL(`mailto:${contact.email}`)}>
              <Text style={styles.link}>{contact.email}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  card: { marginTop: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  role: { color: '#1e40af', fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },
  name: { marginTop: 4, fontSize: 17, fontWeight: '700', color: '#0f172a' },
  link: { marginTop: 8, color: '#1e40af', fontWeight: '600' },
  meta: { color: '#475569' },
  error: { color: '#b91c1c' },
})
