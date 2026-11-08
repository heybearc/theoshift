import { useEffect, useState } from 'react'
import { SymbolView } from 'expo-symbols'
import { Tabs } from 'expo-router'

import { theme } from '@/constants/theme'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { EventProvider, useVolunteerEvents } from '@/lib/events'

export default function TabLayout() {
  return (
    <EventProvider>
      <AppTabs />
    </EventProvider>
  )
}

function AppTabs() {
  const { token } = useAuth()
  const unread = useChatUnread()
  return (
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
          name="tools"
          options={{
            title: 'Tools',
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' }}
                tintColor={color}
                size={24}
              />
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
            href: token ? undefined : null,
            tabBarBadge: unread > 0 ? unread : undefined,
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
  )
}

function useChatUnread() {
  const { token, apiBase } = useAuth()
  const { eventId } = useVolunteerEvents()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!token || !eventId) {
      setCount(0)
      return
    }
    let cancelled = false
    const load = () => {
      void apiRequest<{ data: { channels: Array<{ unreadCount?: number }> } }>(
        apiBase,
        `/api/events/${eventId}/chat/channels`,
        { token }
      )
        .then((result) => {
          if (cancelled) return
          const total = (result.data?.channels || []).reduce((sum, channel) => sum + (channel.unreadCount || 0), 0)
          setCount(total)
        })
        .catch(() => undefined)
    }
    load()
    const timer = setInterval(load, 20000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [token, apiBase, eventId])

  return count
}
