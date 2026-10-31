import { Stack } from 'expo-router'

export default function ChatLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Chat' }} />
      <Stack.Screen name="[channelId]" options={{ title: 'Messages' }} />
    </Stack>
  )
}
