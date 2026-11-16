import { BookmarkSimple, Check, Heart } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatNumber, strings } from '@/shared/i18n';
import { palette, poster, radius, semantic, space } from '@/shared/theme';
import { PosterArt } from './PosterArt';
import { formatRating } from './StarRating';
import { Text } from './Text';

type PosterSize = 'xs' | 'sm' | 'md' | 'lg';

export interface PosterCardProps {
  title: string;
  year?: number | null;
  posterUrl?: string | null;
  size?: PosterSize;
  /** Largura livre (ex.: grade de 4 colunas). Sobrepõe `size`. */
  width?: number;
  watched?: boolean;
  liked?: boolean;
  inWatchlist?: boolean;
  rating?: number | null;
  selected?: boolean;
  showCaption?: boolean;
  /** Elemento extra no canto superior direito (ex.: coração dos favoritos). */
  corner?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityHint?: string;
}

function buildA11yLabel({ title, year, watched, liked, rating }: PosterCardProps) {
  const a = strings.common.a11y;
  return [
    title,
    year ? String(year) : null,
    watched ? a.watched : null,
    liked ? a.liked : null,
    rating ? `${a.ratingPrefix} ${formatRating(rating)}` : null,
  ]
    .filter(Boolean)
    .join(', ');
}

export function PosterCard(props: PosterCardProps) {
  const { title, year, posterUrl, size = 'md', width, watched, liked, inWatchlist, rating, selected, showCaption } = props;
  const w = width ?? poster[size].width;
  const pressable = !!props.onPress || !!props.onLongPress;

  return (
    <Pressable
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      disabled={!pressable}
      accessibilityRole={pressable ? 'button' : 'image'}
      accessibilityLabel={buildA11yLabel(props)}
      accessibilityHint={props.accessibilityHint}
      accessibilityState={selected !== undefined ? { selected } : undefined}
      style={({ pressed }) => [{ width: w, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={styles.frame}>
        <PosterArt title={title} posterUrl={posterUrl} width={w} radius={poster.radius} />
        {/*
          Anel de seleção sobreposto (absoluto), não borda no frame: borda no frame somava 6px
          ao card e empurrava o grid inteiro a cada toque.
        */}
        {selected && <View style={styles.selectedRing} pointerEvents="none" />}
        <View style={styles.badges} pointerEvents="none">
          {watched && (
            <Badge bg={semantic.watched}>
              <Check size={10} weight="bold" color={palette.surface} />
            </Badge>
          )}
          {liked && (
            <Badge bg={semantic.liked}>
              <Heart size={10} weight="fill" color={palette.surface} />
            </Badge>
          )}
          {inWatchlist && !watched && (
            <Badge bg={palette.ink700}>
              <BookmarkSimple size={10} weight="fill" color={palette.surface} />
            </Badge>
          )}
          {rating ? (
            <Badge bg={palette.pipoca300}>
              <Text variant="caption" style={styles.ratingText}>
                {formatNumber(rating, rating % 1 ? 1 : 0)}
              </Text>
            </Badge>
          ) : null}
        </View>
        {/* Com `corner` (ex.: coração dos favoritos), o canto já mostra o estado: sem check por baixo dele. */}
        {selected && !props.corner && (
          <View style={styles.check} pointerEvents="none">
            <Check size={14} weight="bold" color={palette.surface} />
          </View>
        )}
        {props.corner ? <View style={styles.corner}>{props.corner}</View> : null}
      </View>
      {showCaption && (
        <View style={styles.caption}>
          <Text variant="caption" numberOfLines={2}>
            {title}
          </Text>
          {year ? (
            <Text variant="caption" tone="muted">
              {year}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

function Badge({ bg, children }: { bg: string; children: ReactNode }) {
  return <View style={[styles.badge, { backgroundColor: bg }]}>{children}</View>;
}

const styles = StyleSheet.create({
  frame: { borderRadius: poster.radius, overflow: 'hidden' },
  selectedRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: poster.radius,
    borderWidth: 3,
    borderColor: semantic.primary,
  },
  badges: { position: 'absolute', left: 4, bottom: 4, flexDirection: 'row', gap: 3 },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: { fontSize: 10, lineHeight: 12 },
  check: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: semantic.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: { position: 'absolute', top: 2, right: 2 },
  caption: { marginTop: space.xs },
});
