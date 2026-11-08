export const PHONE_ALERT_CHANNEL_ID = 'chat-alerts'

export function isExpoPushToken(endpoint: string) {
  return endpoint.startsWith('ExponentPushToken[') || endpoint.startsWith('ExpoPushToken[')
}

export type PhoneAlertMessage = {
  to: string
  title: string
  body: string
  sound: 'default'
  badge: number
  priority: 'high'
  channelId: string
  data?: Record<string, string>
}

export function buildPhoneAlert(input: {
  to: string
  title: string
  body: string
  badge: number
  data?: Record<string, string>
}): PhoneAlertMessage {
  const badge = Math.max(1, Math.min(999, Math.floor(input.badge) || 1))
  return {
    to: input.to,
    title: input.title,
    body: input.body,
    sound: 'default',
    badge,
    priority: 'high',
    channelId: PHONE_ALERT_CHANNEL_ID,
    data: input.data ? { ...input.data, badge: String(badge) } : { badge: String(badge) },
  }
}

export async function sendExpoPushes(messages: PhoneAlertMessage[]) {
  if (messages.length === 0) return
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  })
  if (!response.ok) return
  const json = (await response.json().catch(() => null)) as { data?: Array<{ status?: string; details?: { error?: string } }> } | null
  const tickets = json?.data || []
  return tickets
    .map((ticket, index) => ({ ticket, token: messages[index]?.to }))
    .filter((row) => row.ticket?.details?.error === 'DeviceNotRegistered' && row.token)
    .map((row) => row.token as string)
}
