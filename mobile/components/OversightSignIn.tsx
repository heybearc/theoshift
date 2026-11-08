import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput } from 'react-native'
import { theme } from '@/constants/theme'
import { useAuth } from '@/lib/auth'

export default function OversightSignIn({
  beforeSubmit,
  onSuccess,
  showIntro = true,
}: {
  beforeSubmit?: () => void | Promise<void>
  onSuccess?: () => void
  showIntro?: boolean
}) {
  const { signInStaff } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setBusy(true)
    setError('')
    try {
      if (beforeSubmit) await beforeSubmit()
      await signInStaff(email, password)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {showIntro ? (
        <>
          <Text style={styles.heading}>Oversight</Text>
          <Text style={styles.help}>
            Event tools, IVS, positions, volunteers, and system admin use the same email and password as the website.
          </Text>
        </>
      ) : (
        <Text style={styles.help}>Use the same email and password as the website.</Text>
      )}
      <Text style={styles.label}>Email</Text>
      <TextInput
        testID="sign-in-staff-email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="you@example.com"
        style={styles.input}
      />
      <Text style={styles.label}>Password</Text>
      <TextInput
        testID="sign-in-staff-password"
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        placeholder="Website password"
        style={styles.input}
      />
      <Pressable
        testID="sign-in-staff-submit"
        style={[styles.button, (!email.trim() || !password || busy) && styles.buttonDisabled]}
        disabled={!email.trim() || !password || busy}
        onPress={() => void submit()}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in as oversight</Text>}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>
  )
}

const styles = StyleSheet.create({
  heading: { marginTop: 28, fontSize: 22, fontWeight: '700', color: '#0f172a' },
  help: { color: '#475569', marginTop: 8, lineHeight: 22 },
  label: { marginTop: 16, marginBottom: 6, color: '#334155', fontWeight: '600' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    marginTop: 16,
    backgroundColor: theme.navy,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { marginTop: 16, color: '#b91c1c', lineHeight: 22 },
})
