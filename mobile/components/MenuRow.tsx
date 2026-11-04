import { Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '@/constants/theme'

export default function MenuRow({
  title,
  detail,
  onPress,
}: {
  title: string
  detail: string
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      android_ripple={{ color: '#dbeafe' }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    marginTop: 12,
    minHeight: 64,
    backgroundColor: theme.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.line,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: { backgroundColor: '#eff6ff' },
  copy: { flex: 1, marginRight: 12 },
  title: { fontSize: 17, fontWeight: '700', color: theme.ink },
  detail: { marginTop: 4, color: theme.muted, lineHeight: 20 },
  chevron: { color: theme.navy, fontSize: 28, fontWeight: '400', lineHeight: 28 },
})
