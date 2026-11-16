import { LockSimple } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { strings } from '@/shared/i18n';
import { palette, space } from '@/shared/theme';
import { Avatar, Text } from '@/shared/ui';
import type { Person } from '../../domain/social';
import { openProfile } from '../navigation';
import { FollowButton } from './FollowButton';

/** Uma pessoa numa lista: foto, nome, @ e, à direita, o botão de seguir (ou outra ação, ex.: aprovar pedido). */
export function PersonRow({ person, action, onOpen }: { person: Person; action?: ReactNode; onOpen?: () => void }) {
  const self = person.relationship === 'SELF';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${person.displayName}, @${person.username}`}
      onPress={() => {
        onOpen?.();
        openProfile(person.username, 'list');
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar name={person.displayName || person.username} imageUrl={person.avatarUrl} size={48} />
      <View style={styles.texts}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {person.displayName || person.username}
        </Text>
        <View style={styles.handle}>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            @{person.username}
            {self ? ` · ${strings.social.you}` : ''}
          </Text>
          {person.isPrivate ? <LockSimple size={12} color={palette.ink500} /> : null}
        </View>
      </View>
      {action ?? <FollowButton person={person} size="sm" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  pressed: { opacity: 0.7 },
  texts: { flex: 1, gap: 2 },
  handle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
