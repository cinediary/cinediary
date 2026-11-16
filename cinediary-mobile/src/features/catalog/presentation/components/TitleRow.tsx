import { BookmarkSimple, Check, Heart, Plus, Star } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatNumber, strings } from '@/shared/i18n';
import { palette, semantic, space, touch } from '@/shared/theme';
import { PosterArt, Text } from '@/shared/ui';
import { showOriginalTitle, type TitleSummary } from '../../domain/title';

export interface TitleRowProps {
  title: TitleSummary;
  onPress: () => void;
  /** Botão "+" de 44pt à direita (registro rápido ou adicionar). */
  onAction?: () => void;
  actionLabel?: string;
  actionIcon?: ReactNode;
  /** Ação já feita (ex.: já está na lista de vocês): mostra `activeActionIcon` e o estado selecionado. */
  actionActive?: boolean;
  activeActionIcon?: ReactNode;
}

/** Linha de resultado da busca (BU-01): pôster xs, título, original, ano · tipo, selos e "+". */
export function TitleRow({ title, onPress, onAction, actionLabel, actionIcon, actionActive, activeActionIcon }: TitleRowProps) {
  const c = strings.common;
  const s = title.state;
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title.title}${title.year ? `, ${title.year}` : ''}`}
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <PosterArt title={title.title} posterUrl={title.posterUrl} width={40} radius={8} />
        <View style={styles.texts}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {title.title}
          </Text>
          {showOriginalTitle(title) ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {title.originalTitle}
            </Text>
          ) : null}
          <View style={styles.meta}>
            <Text variant="caption" tone="muted">
              {[title.year, title.mediaType === 'SERIES' ? c.series : c.movie].filter(Boolean).join(' · ')}
            </Text>
            {s.watched && <Check size={14} weight="bold" color={semantic.watched} />}
            {s.liked && <Heart size={14} weight="fill" color={semantic.liked} />}
            {s.rating ? (
              <View style={styles.rating}>
                <Star size={12} weight="fill" color={semantic.starFill} />
                <Text variant="caption">{formatNumber(s.rating, s.rating % 1 ? 1 : 0)}</Text>
              </View>
            ) : null}
            {s.inWatchlist && <BookmarkSimple size={14} weight="fill" color={palette.ink700} />}
          </View>
        </View>
      </Pressable>
      {onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel ?? strings.catalog.logAction(title.title)}
          accessibilityState={actionActive !== undefined ? { selected: actionActive } : undefined}
          onPress={onAction}
          hitSlop={6}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          {(actionActive ? activeActionIcon : null) ?? actionIcon ?? <Plus size={22} weight="bold" color={semantic.primary} />}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
  texts: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  action: {
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: touch.minTarget / 2,
    backgroundColor: palette.terracota100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
