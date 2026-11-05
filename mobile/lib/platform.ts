import { Platform } from 'react-native'

export function phonePlatform(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios'
  if (Platform.OS === 'android') return 'android'
  return 'web'
}
