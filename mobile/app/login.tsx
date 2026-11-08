import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import OversightSignIn from '@/components/OversightSignIn'
import { theme } from '@/constants/theme'
import { friendlyAuthError } from '@/lib/config'
import { useAuth } from '@/lib/auth'

export default function LoginScreen() {
  const { apiBase, setApiBase, requestLink, completeLink, signInWithCode, linkError, clearLinkError } = useAuth()
  const [serverDraft, setServerDraft] = useState(apiBase)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pastedLink, setPastedLink] = useState('')
  const [busy, setBusy] = useState<'link' | 'paste' | 'code' | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showServer, setShowServer] = useState(__DEV__)
  const [titleTaps, setTitleTaps] = useState(0)

  async function sendLink() {
    setBusy('link')
    setError('')
    setMessage('')
    try {
      await setApiBase(serverDraft)
      clearLinkError()
      await requestLink(email)
      setMessage('Check your email on this phone, then open the link. You can also paste it below.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the sign-in link')
    } finally {
      setBusy(null)
    }
  }

  async function useCode() {
    setBusy('code')
    setError('')
    setMessage('')
    try {
      await setApiBase(serverDraft)
      clearLinkError()
      await signInWithCode(email, code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in with that code')
    } finally {
      setBusy(null)
    }
  }

  async function usePastedLink() {
    setBusy('paste')
    setError('')
    setMessage('')
    try {
      await setApiBase(serverDraft)
      clearLinkError()
      await completeLink(pastedLink.trim())
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : 'Could not sign in with that link'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={require('../assets/images/icon.png')} style={styles.logo} accessibilityLabel="TheoShift" />
        <Text
          style={styles.kicker}
          onPress={() => {
            const next = titleTaps + 1
            setTitleTaps(next)
            if (next >= 7) setShowServer(true)
          }}
        >
          TheoShift
        </Text>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.help}>
          This app is for invited volunteers. Use the email on your volunteer record. We will email a sign-in link to
          this phone. If you were given a sign-in code, enter it instead.
        </Text>

        {showServer ? (
          <>
            <Text style={styles.label}>Server</Text>
            <TextInput
              value={serverDraft}
              onChangeText={setServerDraft}
              onEndEditing={() => void setApiBase(serverDraft)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={styles.input}
            />
          </>
        ) : null}

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

        <Text style={styles.label}>Sign-in code</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder="Only if you were given a code"
          style={styles.input}
        />
        <Pressable
          style={[styles.button, (!email.trim() || !code.trim() || busy) && styles.buttonDisabled]}
          disabled={!email.trim() || !code.trim() || !!busy}
          onPress={() => void useCode()}
        >
          {busy === 'code' ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in with code</Text>}
        </Pressable>
        <Pressable
          style={[styles.secondary, (!email.trim() || busy) && styles.buttonDisabled]}
          disabled={!email.trim() || !!busy}
          onPress={() => void sendLink()}
        >
          {busy === 'link' ? <ActivityIndicator color={theme.button} /> : <Text style={styles.secondaryText}>Email me a sign-in link</Text>}
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
          {busy === 'paste' ? <ActivityIndicator color={theme.button} /> : <Text style={styles.secondaryText}>Sign in with link</Text>}
        </Pressable>

        {message ? <Text style={styles.message}>{message}</Text> : null}
        {error || linkError ? <Text style={styles.error}>{error || linkError}</Text> : null}

        <OversightSignIn beforeSubmit={() => setApiBase(serverDraft)} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, paddingTop: 48 },
  logo: { width: 96, height: 96, borderRadius: 48, marginBottom: 16 },
  kicker: { color: theme.navy, fontWeight: '700', letterSpacing: 0.4 },
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
    backgroundColor: theme.button,
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
    borderColor: theme.button,
    backgroundColor: '#fff',
  },
  secondaryText: { color: theme.button, fontWeight: '700', fontSize: 16 },
  message: { marginTop: 16, color: '#166534', lineHeight: 22 },
  error: { marginTop: 16, color: '#b91c1c', lineHeight: 22 },
})
