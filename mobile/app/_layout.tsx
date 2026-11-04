import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import 'react-native-reanimated'

import { theme } from '@/constants/theme'
import { AuthProvider, useAuth } from '@/lib/auth'
import { registerChatPush } from '@/lib/push'

export { ErrorBoundary } from 'expo-router'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  useEffect(() => {
    if (error) throw error
  }, [error])

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync()
  }, [loaded])

  if (!loaded) return null

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  )
}

function RootNavigator() {
  const { ready, token, apiBase } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!ready || !token) return
    void registerChatPush(apiBase, token).catch(() => undefined)
  }, [ready, token, apiBase])

  useEffect(() => {
    if (!ready) return
    const onLogin = segments[0] === 'login'
    if (!token && !onLogin) router.replace('/login')
    if (token && onLogin) router.replace('/')
  }, [ready, token, segments, router])

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: theme.navy,
        headerTitleStyle: { fontWeight: '700', color: theme.ink },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.canvas },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="count" options={{ title: 'Attendance count', headerBackTitle: 'Back' }} />
    </Stack>
  )
}
