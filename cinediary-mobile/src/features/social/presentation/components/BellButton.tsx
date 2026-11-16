import { useFocusEffect } from 'expo-router';
import { Bell } from 'phosphor-react-native';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { strings } from '@/shared/i18n';
import { fonts, palette, semantic, touch } from '@/shared/theme';
import { Text } from '@/shared/ui';
import { useUnreadCount } from '../../application/feedQueries';
import { openNotifications } from '../navigation';

/** O sino ao lado da saudação, com o número de novidades (9+ acima de nove). */
export function BellButton() {
  const { data, refetch } = useUnreadCount();
  const n = data ?? 0;
  // Voltou para a Início: confere se chegou algo (o `refetch` é estável, não roda a cada render).
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.social.bell(n)}
      onPress={openNotifications}
      hitSlop={6}
      style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
    >
      <Bell size={22} color={palette.ink900} weight={n > 0 ? 'fill' : 'regular'} />
      {n > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{n > 9 ? '9+' : String(n)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: touch.minTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  pressed: { opacity: 0.7 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: semantic.primary,
    borderWidth: 2,
    borderColor: semantic.background,
  },
  badgeText: { fontFamily: fonts.bodyHeavy, fontSize: 10, lineHeight: 12, color: semantic.onPrimary },
});
