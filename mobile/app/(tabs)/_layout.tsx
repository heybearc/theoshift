import { SymbolView } from 'expo-symbols'
import { Tabs } from 'expo-router'

import { theme } from '@/constants/theme'
import { EventProvider } from '@/lib/events'

export default function TabLayout() {
  return (
    <EventProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.navy,
          tabBarInactiveTintColor: '#64748b',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopColor: theme.line,
            borderTopWidth: 1,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
          tabBarItemStyle: { paddingTop: 4 },
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: theme.navy,
          headerTitleStyle: { fontWeight: '700', color: theme.ink },
          headerShadowVisible: false,
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
          name="more"
          options={{
            title: 'More',
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'ellipsis.circle', android: 'more_horiz', web: 'more_horiz' }} tintColor={color} size={24} />
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
