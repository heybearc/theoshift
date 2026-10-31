import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { profileNeedsAttention, useDashboard } from '@/lib/dashboard'
import { useAuth } from '@/lib/auth'

export default function MoreScreen() {
  const { signOut } = useAuth()
  const { data, loading, error, reload } = useDashboard()
  const needsProfile = profileNeedsAttention(data?.volunteer)
  const pendingAnnouncements = data?.announcements?.length || 0

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {loading ? <ActivityIndicator style={styles.spinner} /> : null}
      {error ? (
        <View>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => void reload()}>
            <Text style={styles.link}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {needsProfile ? (
        <Pressable style={styles.banner} onPress={() => router.push('/more/profile')}>
          <Text style={styles.bannerTitle}>Confirm your contact info</Text>
          <Text style={styles.bannerBody}>Your email and phone need a quick check before the event.</Text>
        </Pressable>
      ) : null}

      {data?.announcements?.map((item) => (
        <View key={item.id} style={[styles.card, item.type === 'URGENT' && styles.urgent]}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.meta}>{item.message}</Text>
        </View>
      ))}

      {data?.canViewArrivals ? (
        <MenuRow
          title="My volunteers"
          detail="Your positions, assignments, counts, check-in, and lanyards"
          onPress={() => router.push('/more/arrivals')}
        />
      ) : null}
      <MenuRow
        title="Availability"
        detail="Tell your overseer which days you can serve"
        onPress={() => router.push('/more/availability')}
      />
      <MenuRow
        title="Documents"
        detail={data ? `${data.documents.length} published` : 'Event files shared with you'}
        onPress={() => router.push('/more/documents')}
      />
      <MenuRow
        title="Profile"
        detail={needsProfile ? 'Needs confirmation' : 'Email and phone'}
        onPress={() => router.push('/more/profile')}
      />
      {data?.isIVSTeamMember ? (
        <MenuRow
          title="Early check-in"
          detail="Check in volunteers arriving early"
          onPress={() => router.push('/more/checkin')}
        />
      ) : null}

      {pendingAnnouncements === 0 && !loading && data ? (
        <Text style={styles.empty}>No announcements for this event.</Text>
      ) : null}

      <Pressable onPress={() => void signOut()} style={styles.signOutButton}>
        <Text style={styles.link}>Sign out</Text>
      </Pressable>
    </ScrollView>
  )
}

function MenuRow({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.meta}>{detail}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  card: { marginTop: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  urgent: { borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 4, color: '#475569', lineHeight: 20 },
  banner: { marginTop: 4, backgroundColor: '#eff6ff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#bfdbfe' },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: '#1e3a8a' },
  bannerBody: { marginTop: 4, color: '#1e40af', lineHeight: 20 },
  empty: { marginTop: 20, color: '#475569' },
  error: { marginTop: 16, color: '#b91c1c' },
  link: { color: '#1e40af', fontWeight: '600', marginTop: 8 },
  signOutButton: { marginTop: 24, alignSelf: 'flex-start' },
  spinner: { marginTop: 12 },
})
