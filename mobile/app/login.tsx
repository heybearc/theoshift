import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useAuth } from '@/lib/auth'

export default function LoginScreen() {
  const { apiBase, setApiBase, requestLink, completeLink } = useAuth()
  const [email, setEmail] = useState('')
  const [pastedLink, setPastedLink] = useState('')
  const [busy, setBusy] = useState<'link' | 'paste' | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function sendLink() {
    setBusy('link')
    setError('')
    setMessage('')
    try {
      await setApiBase(apiBase)
      await requestLink(email)
      setMessage('Check your email on this phone, then open the link. You can also paste it below.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the sign-in link')
    } finally {
      setBusy(null)
    }
  }

  async function usePastedLink() {
    setBusy('paste')
    setError('')
    setMessage('')
    try {
      await setApiBase(apiBase)
      await completeLink(pastedLink.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in with that link')
    } finally {
      setBusy(null)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>TheoShift</Text>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.help}>
          Use the email on your volunteer record. The server address is the TheoShift site this phone should talk to.
          A simulator on this computer can use localhost. A phone needs that computer's address, such as
          http://192.168.1.20:3001.
        </Text>

        <Text style={styles.label}>Server</Text>
        <TextInput
          value={apiBase}
          onChangeText={setApiBase}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          style={styles.input}
        />

        <Pressable
          style={[styles.button, (!email.trim() || busy) && styles.buttonDisabled]}
          disabled={!email.trim() || !!busy}
          onPress={() => void sendLink()}
        >
          {busy === 'link' ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Email me a sign-in link</Text>}
        </Pressable>

        <Text style={styles.label}>Paste the link</Text>
        <TextInput
          value={pastedLink}
          onChangeText={setPastedLink}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="https://…/auth/open-app?token=…"
          style={[styles.input, styles.linkInput]}
          multiline
        />
        <Pressable
          style={[styles.secondary, (!pastedLink.trim() || busy) && styles.buttonDisabled]}
          disabled={!pastedLink.trim() || !!busy}
          onPress={() => void usePastedLink()}
        >
          {busy === 'paste' ? <ActivityIndicator color="#1e40af" /> : <Text style={styles.secondaryText}>Sign in with link</Text>}
        </Pressable>

        {message ? <Text style={styles.message}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, paddingTop: 72 },
  kicker: { color: '#1e40af', fontWeight: '700', letterSpacing: 0.4 },
  title: { fontSize: 32, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  help: { color: '#475569', marginTop: 12, lineHeight: 22 },
  label: { marginTop: 20, marginBottom: 6, color: '#334155', fontWeight: '600' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  linkInput: { minHeight: 88, textAlignVertical: 'top' },
  button: {
    marginTop: 16,
    backgroundColor: '#1e40af',
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: {
    marginTop: 12,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e40af',
    backgroundColor: '#fff',
  },
  secondaryText: { color: '#1e40af', fontWeight: '700', fontSize: 16 },
  message: { marginTop: 16, color: '#166534', lineHeight: 22 },
  error: { marginTop: 16, color: '#b91c1c', lineHeight: 22 },
})
