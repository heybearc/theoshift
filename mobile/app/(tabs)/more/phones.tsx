import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { phonePlatform } from '@/lib/platform'
import { theme } from '@/constants/theme'

type SigninRow = {
  id: string
  label: string
  createdAt: string
  lastSeenAt: string
  current: boolean
}

function when(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function PhonesScreen() {
  const { token, apiBase, replaceToken, signOut } = useAuth()
  const [rows, setRows] = useState<SigninRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async (accessToken?: string) => {
    const current = accessToken || token
    if (!current) return
    setLoading(true)
    setError('')
    try {
      const result = await apiRequest<{ data: { signins: SigninRow[] } }>(apiBase, '/api/volunteer/sessions', {
        token: current,
      })
      setRows(result.data.signins || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sign-ins')
    } finally {
      setLoading(false)
    }
  }, [apiBase, token])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  async function revoke(id: string, current: boolean) {
    if (!token) return
    setBusy(id)
    setError('')
    setMessage('')
    try {
      const result = await apiRequest<{ data?: { signedOut?: boolean } }>(apiBase, '/api/volunteer/sessions', {
        method: 'POST',
        token,
        body: { action: 'revoke', id },
      })
      if (current || result.data?.signedOut) {
        await signOut()
        return
      }
      setMessage('That sign-in is ended.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign that phone out')
    } finally {
      setBusy(null)
    }
  }

  async function revokeOthers() {
    if (!token) return
    setBusy('others')
    setError('')
    setMessage('')
    try {
      const result = await apiRequest<{ data?: { accessToken?: string } }>(apiBase, '/api/volunteer/sessions', {
        method: 'POST',
        token,
        body: { action: 'revoke-others', platform: phonePlatform() },
      })
      const nextToken = result.data?.accessToken
      if (nextToken) await replaceToken(nextToken)
      setMessage('Other sign-ins are ended.')
      await load(nextToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign out the other phones')
    } finally {
      setBusy(null)
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.help}>
        If you lost a phone, sign it out here. It stops working the next time it reaches TheoShift. Sign out every
        other sign-in also ends phones that signed in before this list existed.
      </Text>
      {loading ? <ActivityIndicator style={styles.spinner} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {rows.map((row) => (
        <View key={row.id} style={styles.card}>
          <Text style={styles.title}>
            {row.label}
            {row.current ? ' · This phone' : ''}
          </Text>
          <Text style={styles.meta}>
            Signed in {when(row.createdAt)} · Last used {when(row.lastSeenAt)}
          </Text>
          <Pressable disabled={!!busy} onPress={() => void revoke(row.id, row.current)} style={styles.signOut}>
            <Text style={styles.signOutText}>{busy === row.id ? 'Signing out…' : 'Sign out'}</Text>
          </Pressable>
        </View>
      ))}
      {!loading && rows.length === 0 ? (
        <Text style={styles.meta}>No phones are listed yet. Sign out and sign in again, then this phone will show up.</Text>
      ) : null}
      <Pressable style={styles.button} disabled={!!busy} onPress={() => void revokeOthers()}>
        <Text style={styles.buttonText}>{busy === 'others' ? 'Signing out…' : 'Sign out every other sign-in'}</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.canvas },
  content: { padding: 16, paddingBottom: 32 },
  help: { color: theme.muted, lineHeight: 22 },
  spinner: { marginTop: 16 },
  error: { marginTop: 12, color: '#b91c1c' },
  success: { marginTop: 12, color: '#166534', fontWeight: '600' },
  card: {
    marginTop: 12,
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 14,
  },
  title: { fontWeight: '700', color: theme.ink, fontSize: 16 },
  meta: { marginTop: 4, color: theme.muted, lineHeight: 20 },
  signOut: { marginTop: 8, minHeight: 44, justifyContent: 'center' },
  signOutText: { color: '#b91c1c', fontWeight: '700' },
  button: {
    marginTop: 20,
    backgroundColor: theme.button,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
})