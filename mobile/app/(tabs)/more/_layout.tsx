import { Stack } from 'expo-router'
import { theme } from '@/constants/theme'

export default function MoreLayout() {
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
      <Stack.Screen name="index" options={{ title: 'More' }} />
      <Stack.Screen name="availability" options={{ title: 'Availability' }} />
      <Stack.Screen name="documents" options={{ title: 'Documents' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="phones" options={{ title: 'Phones signed in' }} />
      <Stack.Screen name="checkin" options={{ title: 'Early check-in' }} />
      <Stack.Screen name="arrivals" options={{ title: 'My volunteers' }} />
      <Stack.Screen name="contacts" options={{ title: 'Contacts' }} />
    </Stack>
  )
}
