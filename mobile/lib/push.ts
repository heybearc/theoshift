import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { apiRequest } from './api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function registerChatPush(apiBase: string, token: string) {
  if (!Device.isDevice) return
  const current = await Notifications.getPermissionsAsync()
  let status = current.status
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status
  }
  if (status !== 'granted') return

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  const expoToken = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
  await apiRequest(apiBase, '/api/chat/push/native', {
    method: 'POST',
    token,
    body: { expoPushToken: expoToken.data, platform: Platform.OS },
  })
}
