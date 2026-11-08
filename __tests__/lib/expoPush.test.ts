import { buildPhoneAlert, PHONE_ALERT_CHANNEL_ID } from '../../src/lib/expoPush'

describe('buildPhoneAlert', () => {
  it('asks for a sound, a high-priority Android channel, and an icon badge', () => {
    const message = buildPhoneAlert({
      to: 'ExponentPushToken[abc]',
      title: 'Saturday',
      body: 'Lobby: Doors are open',
      badge: 4,
      data: { eventId: 'evt', channelId: 'ch' },
    })

    expect(message).toMatchObject({
      sound: 'default',
      badge: 4,
      priority: 'high',
      channelId: PHONE_ALERT_CHANNEL_ID,
      data: { eventId: 'evt', channelId: 'ch', badge: '4' },
    })
  })

  it('keeps a badge of at least 1 when a new alert is sent', () => {
    expect(buildPhoneAlert({ to: 'ExponentPushToken[abc]', title: 'Chat', body: 'Hi', badge: 0 }).badge).toBe(1)
  })
})
