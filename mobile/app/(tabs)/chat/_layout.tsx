import { Stack } from 'expo-router'
import { theme } from '@/constants/theme'

export default function ChatLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Chat' }} />
      <Stack.Screen name="[channelId]" options={{ title: 'Messages' }} />
    </Stack>
  )
}
