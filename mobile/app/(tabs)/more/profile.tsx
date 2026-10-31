import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { profileNeedsAttention, useDashboard } from '@/lib/dashboard'

export default function ProfileScreen() {
  const { token, volunteer, apiBase, updateVolunteer } = useAuth()
  const { data, loading, error, reload } = useDashboard()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!data?.volunteer) return
    setEmail(data.volunteer.email || '')
    setPhone(data.volunteer.phone || '')
  }, [data?.volunteer])

  async function save() {
    if (!token || !volunteer) return
    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 10) {
      setSaveError('Enter a 10-digit phone number.')
      return
    }
    if (!email.trim()) {
      setSaveError('Email is required.')
      return
    }
    setSaving(true)
    setSaveError('')
    setMessage('')
    try {
      const result = await apiRequest<{ formattedPhone?: string }>(apiBase, '/api/volunteer/profile', {
        method: 'PUT',
        token,
        body: { volunteerId: volunteer.id, email: email.trim(), phone },
      })
      await updateVolunteer({ email: email.trim() })
      if (result.formattedPhone) setPhone(result.formattedPhone)
      setMessage('Profile saved.')
      await reload()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  const needsAttention = profileNeedsAttention(data?.volunteer)

  return (
    <View style={styles.screen}>
      {loading ? <ActivityIndicator style={styles.spinner} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {needsAttention ? (
        <Text style={styles.notice}>Confirm the email and phone your overseer should use to reach you.</Text>
      ) : null}
      <Text style={styles.label}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <Text style={styles.label}>Phone</Text>
      <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />
      {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}
      <Pressable style={styles.button} disabled={saving} onPress={() => void save()}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  label: { marginTop: 12, marginBottom: 6, fontWeight: '600', color: '#334155' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  notice: { color: '#1e40af', lineHeight: 20 },
  button: { marginTop: 20, backgroundColor: '#1e40af', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { marginTop: 12, color: '#b91c1c' },
  success: { marginTop: 12, color: '#166534', fontWeight: '600' },
  spinner: { marginBottom: 12 },
})
