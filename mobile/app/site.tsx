import { useEffect, useRef, useState, type ComponentType, type RefObject } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import * as Linking from 'expo-linking'
import { WebView } from 'react-native-webview'
import type { WebViewNavigation } from 'react-native-webview'
import { theme } from '@/constants/theme'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'

type BrowserHandle = { goBack: () => void }

const Browser = WebView as unknown as ComponentType<Record<string, unknown>>

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || ''
  return value || ''
}

export default function SiteScreen() {
  const params = useLocalSearchParams<{ path?: string; title?: string; kind?: string }>()
  const path = one(params.path) || '/events/select'
  const title = one(params.title) || 'TheoShift'
  const kind = one(params.kind) === 'staff' ? 'staff' : 'volunteer'
  const navigation = useNavigation()
  const { token, staffToken, apiBase } = useAuth()
  const webRef = useRef<BrowserHandle>(null)
  const [uri, setUri] = useState('')
  const [error, setError] = useState('')
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    navigation.setOptions({ title })
  }, [navigation, title])

  useEffect(() => {
    let cancelled = false
    const bearer = kind === 'staff' ? staffToken : token

    async function open() {
      setError('')
      setUri('')
      if (!bearer) {
        if (!cancelled) {
          setError(
            kind === 'staff'
              ? 'Sign in as oversight in the app to open that page.'
              : 'Sign in as a volunteer in the app to open that page.'
          )
        }
        return
      }
      try {
        const result = await apiRequest<{ data: { code: string } }>(apiBase, '/api/auth/mobile/web-handoff', {
          method: 'POST',
          token: bearer,
          body: { path },
        })
        if (!cancelled) {
          setUri(`${apiBase}/api/auth/mobile/web-session?code=${encodeURIComponent(result.data.code)}`)
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not open that page')
      }
    }

    void open()
    return () => {
      cancelled = true
    }
  }, [apiBase, kind, path, staffToken, token])

  function onNavChange(nav: WebViewNavigation) {
    setCanGoBack(nav.canGoBack)
  }

  return (
    <View style={styles.screen}>
      {!uri && !error ? <ActivityIndicator style={styles.spinner} /> : null}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
          {kind === 'staff' && !staffToken ? (
            <Pressable onPress={() => router.push('/staff-sign-in')}>
              <Text style={styles.link}>Oversight sign-in</Text>
            </Pressable>
          ) : null}
          {kind === 'volunteer' && !token && !staffToken ? (
            <Pressable onPress={() => router.push('/login')}>
              <Text style={styles.link}>Volunteer sign-in</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {uri ? (
        <Browser
          ref={webRef as RefObject<BrowserHandle>}
          source={{ uri }}
          style={styles.web}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          originWhitelist={['https://*', 'http://*']}
          onNavigationStateChange={onNavChange}
          onShouldStartLoadWithRequest={(request: { url: string }) => {
            const host = (() => {
              try {
                return new URL(request.url).host
              } catch {
                return ''
              }
            })()
            let apiHost = 'theoshift.com'
            try {
              apiHost = new URL(apiBase).host
            } catch {
              apiHost = 'theoshift.com'
            }
            const allowed = host === 'theoshift.com' || host === apiHost || host === 'localhost'
            if (!allowed) {
              void Linking.openURL(request.url)
              return false
            }
            let pathname = ''
            try {
              pathname = new URL(request.url).pathname
            } catch {
              pathname = ''
            }
            if (pathname === '/auth/signin' || pathname.startsWith('/auth/signin/') || pathname === '/auth/error') {
              setUri('')
              setError('Sign in again in the TheoShift app.')
              return false
            }
            return true
          }}
          onError={() => setError('Could not load that page')}
        />
      ) : null}
      {canGoBack ? (
        <Pressable style={styles.backBar} onPress={() => webRef.current?.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  web: { flex: 1 },
  spinner: { marginTop: 24 },
  errorBox: { padding: 16 },
  error: { color: '#b91c1c', lineHeight: 22 },
  link: { color: theme.navy, fontWeight: '700', marginTop: 12, minHeight: 44 },
  backBar: {
    borderTopWidth: 1,
    borderTopColor: theme.line,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  backText: { color: theme.navy, fontWeight: '700', fontSize: 16 },
})
