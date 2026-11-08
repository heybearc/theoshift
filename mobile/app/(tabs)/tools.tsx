import { ScrollView, StyleSheet, Text } from 'react-native'
import { router } from 'expo-router'
import MenuRow from '@/components/MenuRow'
import { theme } from '@/constants/theme'
import { useAuth } from '@/lib/auth'
import { isOversightRole } from '@/lib/roles'
import { useVolunteerEvents } from '@/lib/events'
import {
  ADMIN_TOOLS,
  SHARED_TOOLS,
  STAFF_TOOLS,
  VOLUNTEER_TOOLS,
  eventTools,
  withSelectedEvent,
  type SiteTool,
} from '@/lib/siteTools'

function openTool(tool: SiteTool, eventId: string | null) {
  const path = withSelectedEvent(tool.path, eventId)
  router.push({
    pathname: '/site',
    params: { path, title: tool.title, kind: tool.kind },
  })
}

export default function ToolsScreen() {
  const { token, staff } = useAuth()
  const { eventId } = useVolunteerEvents()
  const oversight = Boolean(staff && isOversightRole(staff.role))
  const admin = staff?.role === 'ADMIN'

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>
        These open the same pages as the website, signed in from this phone. Assignments and chat stay on their own tabs.
      </Text>

      {token ? (
        <>
          <Text style={styles.section}>Volunteer</Text>
          {VOLUNTEER_TOOLS.map((tool) => (
            <MenuRow
              key={tool.path}
              title={tool.title}
              detail={tool.detail}
              onPress={() => openTool(tool, eventId)}
            />
          ))}
        </>
      ) : null}

      {oversight ? (
        <>
          <Text style={styles.section}>Events</Text>
          {STAFF_TOOLS.map((tool) => (
            <MenuRow key={tool.path} title={tool.title} detail={tool.detail} onPress={() => openTool(tool, eventId)} />
          ))}
          {eventId ? (
            <>
              <Text style={styles.section}>This event</Text>
              {eventTools(eventId).map((tool) => (
                <MenuRow
                  key={tool.path}
                  title={tool.title}
                  detail={tool.detail}
                  onPress={() => openTool(tool, eventId)}
                />
              ))}
            </>
          ) : null}
        </>
      ) : (
        <MenuRow
          title="Oversight sign-in"
          detail="Positions, volunteers, IVS, counts, lanyards, and admin"
          onPress={() => router.push('/staff-sign-in')}
        />
      )}

      {admin ? (
        <>
          <Text style={styles.section}>System admin</Text>
          {ADMIN_TOOLS.map((tool) => (
            <MenuRow key={tool.path} title={tool.title} detail={tool.detail} onPress={() => openTool(tool, eventId)} />
          ))}
        </>
      ) : null}

      <Text style={styles.section}>Help</Text>
      {SHARED_TOOLS.map((tool) => (
        <MenuRow
          key={tool.path}
          title={tool.title}
          detail={tool.detail}
          onPress={() => openTool({ ...tool, kind: token ? 'volunteer' : 'staff' }, eventId)}
        />
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  lead: { color: '#475569', lineHeight: 22 },
  section: { marginTop: 22, color: theme.navy, fontWeight: '700', fontSize: 13, letterSpacing: 0.4 },
})
