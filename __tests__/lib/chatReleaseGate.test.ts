import { isReleaseGateChatProbe } from '../../src/lib/chatReleaseGate'

describe('isReleaseGateChatProbe', () => {
  it('matches only the release-gate header and pin-test body', () => {
    expect(isReleaseGateChatProbe('1', 'Pin test 1710000000000')).toBe(true)
    expect(isReleaseGateChatProbe(['1'], 'Pin test 1710000000000')).toBe(true)
    expect(isReleaseGateChatProbe(undefined, 'Pin test 1710000000000')).toBe(false)
    expect(isReleaseGateChatProbe('1', 'Hello everyone')).toBe(false)
    expect(isReleaseGateChatProbe('1', 'Pin test')).toBe(false)
  })
})
