import { SymbolView } from 'expo-symbols'
import { Tabs } from 'expo-router'

import { EventProvider } from '@/lib/events'

export default function TabLayout() {
  return (
    <EventProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#1e40af',
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Assignments',
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'list.bullet', android: 'list', web: 'list' }} tintColor={color} size={24} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: 'bubble.left.and.bubble.right', android: 'chat', web: 'chat' }}
                tintColor={color}
                size={24}
              />
            ),
          }}
        />
      </Tabs>
    </EventProvider>
  )
}
