import { LockSimple } from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatNumber, strings } from '@/shared/i18n';
import { fonts, palette, radius, shadow, space } from '@/shared/theme';
import { Avatar, Text } from '@/shared/ui';
import type { FollowList } from '../../domain/social';
import { openFollowList } from '../navigation';

export interface ProfileHeaderProps {
  name: string;
  username: string;
  avatarUrl: string | null;
  pronouns: string | null;
  bio: string | null;
  isPrivate: boolean;
  followsYou?: boolean;
  /** null = escondido (perfil privado que você não segue). */
  titles: number | null;
  followers: number;
  following: number;
  /** Seguidores/seguindo abrem as listas (não num perfil privado que você não segue). */
  canOpenLists: boolean;
  /** Botões embaixo (Editar perfil + engrenagem, ou Seguir). */
  actions: ReactNode;
}

const BIO_LINES = 4;

/**
 * Topo do perfil, igual para o seu e para o de outra pessoa, todo centralizado num eixo só:
 * - a foto, com um aro suave;
 * - o nome; embaixo, @, pronomes e cadeado (perfil privado) numa linha; "Segue você" quando for o caso;
 * - a bio (até 4 linhas; toque para ler tudo);
 * - os números (títulos, seguidores, seguindo) num cartão, no mesmo estilo dos outros cartões do app;
 * - os botões, na largura toda.
 * Antes a foto ficava à esquerda com os números ao lado e o resto da tela seguia outro alinhamento: a tela
 * parecia "torta".
 */
export function ProfileHeader(p: ProfileHeaderProps) {
  const s = strings.social;
  const [bioOpen, setBioOpen] = useState(false);
  // O perfil guarda o código (ex.: "she"); aqui vira o texto do idioma de quem vê ("ela/dela", "she/her").
  const pronouns = p.pronouns ? (strings.account.pronounOptions[p.pronouns] ?? p.pronouns) : null;

  const counter = (value: number | null, label: string, list?: FollowList) => {
    const body = (
      <>
        <Text style={styles.value}>{value === null ? '–' : formatNumber(value)}</Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {label}
        </Text>
      </>
    );
    return list && p.canOpenLists ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${value ?? 0} ${label}`}
        onPress={() => openFollowList(p.username, list)}
        style={({ pressed }) => [styles.counter, pressed && styles.pressed]}
      >
        {body}
      </Pressable>
    ) : (
      <View style={styles.counter} accessible accessibilityLabel={`${value ?? 0} ${label}`}>
        {body}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.ring}>
        <Avatar name={p.name || p.username} imageUrl={p.avatarUrl} size={96} />
      </View>

      <View style={styles.identity}>
        <Text variant="h2" accessibilityRole="header" style={styles.center}>
          {p.name || p.username}
        </Text>
        <View style={styles.handle}>
          <Text variant="caption" tone="secondary">
            @{p.username}
          </Text>
          {pronouns ? (
            <>
              <Text variant="caption" tone="muted">
                ·
              </Text>
              <Text variant="caption" tone="secondary">
                {pronouns}
              </Text>
            </>
          ) : null}
          {p.isPrivate ? (
            <View accessible accessibilityLabel={strings.stats.privateBadge}>
              <LockSimple size={13} color={palette.ink700} />
            </View>
          ) : null}
        </View>
        {p.followsYou ? (
          <View style={styles.badge}>
            <Text variant="caption" style={styles.badgeText}>
              {s.followsYou}
            </Text>
          </View>
        ) : null}
        {p.bio ? (
          <Pressable accessibilityRole="text" onPress={() => setBioOpen((v) => !v)}>
            <Text tone="secondary" numberOfLines={bioOpen ? undefined : BIO_LINES} style={[styles.bio, styles.center]}>
              {p.bio}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.counters}>
        {counter(p.titles, s.titles)}
        <View style={styles.divider} />
        {counter(p.followers, s.followers, 'followers')}
        <View style={styles.divider} />
        {counter(p.following, s.followingCount, 'following')}
      </View>

      <View style={styles.actions}>{p.actions}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: space.lg },
  ring: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadow.e2,
  },
  identity: { alignItems: 'center', gap: space.xs, alignSelf: 'stretch' },
  center: { textAlign: 'center' },
  handle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: palette.surfaceSunken },
  badgeText: { color: palette.ink700, fontFamily: fonts.bodyHeavy },
  bio: { marginTop: space.xs, lineHeight: 22, paddingHorizontal: space.sm },
  counters: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  counter: { flex: 1, alignItems: 'center', gap: 2 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: palette.border },
  pressed: { opacity: 0.6 },
  value: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: palette.ink900 },
  actions: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
