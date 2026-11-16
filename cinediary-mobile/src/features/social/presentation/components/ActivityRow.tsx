import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { fonts, palette, semantic, space } from '@/shared/theme';
import { Avatar, PosterArt, Text } from '@/shared/ui';
import type { Actor } from '../../domain/social';

/**
 * Uma linha do sino, igual nas duas abas: foto(s) à esquerda; no meio a frase (nomes em negrito), o "quando"
 * com um pontinho terracota se é novidade e, opcionalmente, um detalhe (estrelas, o trecho da review/resposta);
 * à direita o pôster do registro ou uma ação (Seguir de volta, Ver).
 */
export function ActivityRow({
  actors,
  sentence,
  time,
  unseen = false,
  detail,
  poster,
  trailing,
  onPress,
  onActorPress,
}: {
  actors: Actor[];
  sentence: ReactNode;
  time: string;
  unseen?: boolean;
  detail?: ReactNode;
  poster?: { title: string; posterUrl: string | null };
  trailing?: ReactNode;
  onPress: () => void;
  onActorPress?: () => void;
}) {
  const [first, second] = actors;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Pressable accessibilityRole="button" disabled={!onActorPress} onPress={onActorPress} hitSlop={4} style={styles.avatars}>
        {first ? <Avatar name={first.displayName || first.username} imageUrl={first.avatarUrl} size={second ? 34 : 42} /> : null}
        {second ? (
          <View style={styles.second}>
            <Avatar name={second.displayName || second.username} imageUrl={second.avatarUrl} size={28} borderColor={semantic.background} />
          </View>
        ) : null}
      </Pressable>
      <View style={styles.texts}>
        <Text variant="caption" style={styles.sentence}>
          {sentence}
        </Text>
        <View style={styles.meta}>
          {unseen ? <View style={styles.dot} accessibilityLabel="novo" /> : null}
          <Text variant="caption" tone="muted">
            {time}
          </Text>
        </View>
        {detail}
      </View>
      {poster ? <PosterArt title={poster.title} posterUrl={poster.posterUrl} width={46} radius={6} /> : trailing}
    </Pressable>
  );
}

/** Nome em negrito dentro da frase. */
export const Bold = ({ children }: { children: ReactNode }) => (
  <Text variant="caption" style={styles.bold}>
    {children}
  </Text>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.md },
  pressed: { opacity: 0.7 },
  avatars: { width: 46, height: 46 },
  second: { position: 'absolute', right: 0, bottom: 0 },
  texts: { flex: 1, gap: 4, paddingTop: 2 },
  sentence: { fontSize: 14, lineHeight: 20, color: palette.ink700 },
  bold: { fontSize: 14, lineHeight: 20, fontFamily: fonts.bodyHeavy, color: palette.ink900 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: semantic.primary },
});
