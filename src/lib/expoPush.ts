export function isExpoPushToken(endpoint: string) {
  return endpoint.startsWith('ExponentPushToken[') || endpoint.startsWith('ExpoPushToken[')
}

type ExpoPushMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, string>
}

export async function sendExpoPushes(messages: ExpoPushMessage[]) {
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
