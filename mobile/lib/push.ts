import { AppState, Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import { apiRequest } from './api'

export const PHONE_ALERT_CHANNEL_ID = 'chat-alerts'
const SEEN_ALERT_KEY = 'theoshift.lastNotification'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
})

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(PHONE_ALERT_CHANNEL_ID, {
    name: 'Messages',
    importance: Notifications.AndroidImportance.MAX,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1e40af',
  })
}

export async function registerChatPush(apiBase: string, token: string) {
  if (!Device.isDevice) return
  await ensureAndroidChannel()
  const current = await Notifications.getPermissionsAsync()
  let status = current.status
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    })
    status = requested.status
  }
  if (status !== 'granted') return

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  const expoToken = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
  await apiRequest(apiBase, '/api/chat/push/native', {
    method: 'POST',
    token,
    body: { expoPushToken: expoToken.data, platform: Platform.OS },
  })
}

export async function refreshAppBadge(apiBase: string, token: string) {
  const result = await apiRequest<{ data: { count: number } }>(apiBase, '/api/chat/push/badge', { token })
  await Notifications.setBadgeCountAsync(result.data?.count || 0)
}

export async function clearAppBadge() {
  await Notifications.setBadgeCountAsync(0)
}

const openedAlerts = new Set<string>()

async function alertTarget(response: Notifications.NotificationResponse | null) {
  if (!response) return null
  const id = response.notification.request.identifier
  if (!id || openedAlerts.has(id)) return null
  const seen = await SecureStore.getItemAsync(SEEN_ALERT_KEY)
  if (seen === id) {
    openedAlerts.add(id)
    return null
  }
  const data = response.notification.request.content.data || {}
  const channelId = typeof data.channelId === 'string' ? data.channelId : ''
  if (!channelId) return null
  openedAlerts.add(id)
  await SecureStore.setItemAsync(SEEN_ALERT_KEY, id)
  const eventId = typeof data.eventId === 'string' ? data.eventId : ''
  return { channelId, eventId }
}

function badgeFromNotification(notification: Notifications.Notification) {
  const raw = notification.request.content.data?.badge ?? notification.request.content.badge
  const badge = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
  return Number.isFinite(badge) ? badge : null
}

export function startPhoneAlerts(
  apiBase: string,
  token: string,
  onOpen: (target: { channelId: string; eventId: string }) => void
) {
  let cancelled = false
  const sync = () => {
    if (cancelled) return
    void refreshAppBadge(apiBase, token).catch(() => undefined)
  }
  void registerChatPush(apiBase, token).catch(() => undefined)
  sync()
  const timer = setInterval(sync, 20000)
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') sync()
  })
  const received = Notifications.addNotificationReceivedListener((notification) => {
    const badge = badgeFromNotification(notification)
    if (badge == null) sync()
    else void Notifications.setBadgeCountAsync(badge)
  })
  const open = (response: Notifications.NotificationResponse | null) => {
    void alertTarget(response).then((target) => {
      if (target) onOpen(target)
    })
  }
  const opened = Notifications.addNotificationResponseReceivedListener(open)
  void Notifications.getLastNotificationResponseAsync().then(open)

  return () => {
    cancelled = true
    clearInterval(timer)
    appState.remove()
    received.remove()
    opened.remove()
  }
}
