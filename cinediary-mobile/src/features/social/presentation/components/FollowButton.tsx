import * as Haptics from 'expo-haptics';
import { Check, Clock, UserPlus } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';

import { strings } from '@/shared/i18n';
import { fonts, palette, radius, semantic, space, touch } from '@/shared/theme';
import { Text, useToast } from '@/shared/ui';
import { useToggleFollow } from '../../application/socialQueries';
import { nextRelationship, type Person, type Relationship } from '../../domain/social';

/**
 * Botão de seguir, com três estados: "Seguir" (cheio, terracota), "Seguindo" (contorno, ✓) e "Solicitado"
 * (contorno, relógio: pedido a um perfil privado). Desfazer pede confirmação; seguir é na hora.
 *
 * O botão guarda o próprio toque ({@code tapped}): mostra o estado novo na hora, mesmo que a lista em volta
 * ainda não tenha atualizado. Na busca de pessoas a linha não redesenhava e o botão continuava "Seguir"
 * (seguia, mas sem resposta nenhuma). Quando a pessoa que veio por prop muda, vale o que veio.
 */
export function FollowButton({ person, size = 'md' }: { person: Person & { followsYou?: boolean }; size?: 'md' | 'sm' }) {
  const t = strings.social;
  const toast = useToast();
  const [tapped, setTapped] = useState<{ from: Relationship; to: Relationship } | null>(null);
  const r = tapped && tapped.from === person.relationship ? tapped.to : person.relationship;
  const toggle = useToggleFollow(person);
  if (r === 'SELF') return null;

  const run = () => {
    const to = nextRelationship(r, person.isPrivate);
    void (to === 'NONE' ? Haptics.selectionAsync() : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    setTapped({ from: person.relationship, to });
    toggle.mutate(
      { from: r, to },
      {
        onError: () => {
          setTapped(null);
          toast(to !== 'NONE' ? t.followError : r === 'REQUESTED' ? t.cancelRequestError : t.unfollowError);
        },
      },
    );
  };
  const onPress = () => {
    if (r === 'NONE') return run();
    const following = r === 'FOLLOWING';
    Alert.alert(following ? t.unfollowConfirm(person.username) : t.cancelRequestConfirm(person.username), undefined, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: following ? t.unfollow : t.cancelRequest, style: 'destructive', onPress: run },
    ]);
  };

  const filled = r === 'NONE';
  const label = r === 'FOLLOWING' ? t.following : r === 'REQUESTED' ? t.requested : person.followsYou ? t.followBack : t.follow;
  const color = filled ? semantic.onPrimary : palette.ink900;
  const iconSize = size === 'sm' ? 14 : 16;
  const Icon = r === 'FOLLOWING' ? Check : r === 'REQUESTED' ? Clock : UserPlus;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: toggle.isPending }}
      onPress={onPress}
      disabled={toggle.isPending}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        filled ? styles.filled : styles.outline,
        pressed && styles.pressed,
      ]}
    >
      {toggle.isPending ? <ActivityIndicator size="small" color={color} /> : <Icon size={iconSize} weight="bold" color={color} />}
      <Text variant={size === 'sm' ? 'caption' : 'bodyStrong'} style={[styles.label, { color }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, borderRadius: radius.pill },
  md: { minHeight: touch.buttonHeightSm, paddingHorizontal: space.xl },
  sm: { minHeight: 34, minWidth: 108, paddingHorizontal: space.md },
  filled: { backgroundColor: semantic.primary },
  outline: { backgroundColor: palette.surface, borderWidth: 1.5, borderColor: palette.borderStrong },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  label: { fontFamily: fonts.bodyHeavy },
});
