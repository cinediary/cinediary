import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowCounterClockwise, Heart, PencilSimple } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openTitle } from '@/features/catalog/presentation/navigation';
import { formatFullDate, parseIsoDate, strings } from '@/shared/i18n';
import { fonts, palette, radius, semantic, shadow, space } from '@/shared/theme';
import { Avatar, PosterArt, Skeleton, StarRating, Text } from '@/shared/ui';
import type { DiaryEntry } from '../../domain/diary';
import { scopeLabel } from '../scopeLabel';
import { SpoilerReview } from './SpoilerReview';

export type EntryAuthor = { username: string; name: string; avatarUrl: string | null };

const HERO_HEIGHT = 250;

/** Review longa na tela da entrada: corta aqui, com "mais" para ler inteira (antes ocupava a tela toda). */
const REVIEW_LINES = 8;

/**
 * Topo da entrada, de ponta a ponta: o pôster desfocado de fundo dissolvendo no creme (como na página do
 * título) e, por cima, o pôster, o nome, o ano (ou temporada/episódio) e a data em que assistiu. Pôster e nome
 * abrem o título.
 * `scrollY`: puxando para baixo além do topo, o fundo cresce para cima e cobre o espaço (antes aparecia um
 * retângulo creme acima dele, como acontecia na página do título).
 */
export function EntryHero({ entry, scrollY }: { entry: DiaryEntry; scrollY?: SharedValue<number> }) {
  const t = strings.diary;
  const insets = useSafeAreaInsets();
  const meta = [entry.scope ? scopeLabel(entry.scope) : null, entry.title.year].filter(Boolean).join(' · ');
  const height = insets.top + HERO_HEIGHT;
  // Mesmo cálculo da página do título: sobe metade e cresce o resto, então a borda de cima acompanha o dedo.
  const stretch = useAnimatedStyle(() => {
    const y = scrollY?.value ?? 0;
    return y < 0 ? { transform: [{ translateY: y / 2 }, { scale: 1 - y / height }] } : { transform: [] };
  });
  return (
    <View style={[styles.hero, { height }]}>
      <Animated.View style={[StyleSheet.absoluteFill, stretch]}>
        {entry.title.posterUrl ? (
          <Image
            source={entry.title.posterUrl}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            blurRadius={28}
            cachePolicy="memory-disk"
          />
        ) : null}
        <LinearGradient
          colors={['rgba(250,246,240,0.15)', 'rgba(250,246,240,0.7)', semantic.background]}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={styles.heroRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={entry.title.title}
          onPress={() => openTitle(entry.title)}
          style={({ pressed }) => [styles.poster, pressed && styles.pressed]}
        >
          <PosterArt title={entry.title.title} posterUrl={entry.title.posterUrl} width={108} />
        </Pressable>
        <View style={styles.heroTexts}>
          <Pressable accessibilityRole="link" onPress={() => openTitle(entry.title)}>
            <Text variant="h2" numberOfLines={3}>
              {entry.title.title}
            </Text>
          </Pressable>
          {meta ? (
            <Text variant="caption" tone="secondary" style={styles.meta}>
              {meta}
            </Text>
          ) : null}
          <Text variant="caption" tone="muted">
            {entry.watchedDate ? t.entryWatchedOn(formatFullDate(parseIsoDate(entry.watchedDate))) : strings.common.noDate}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Corpo da entrada (de quem for): o autor (abre o perfil), a nota grande com curtiu/rever e a review
 * (desfocada se tiver spoiler e quem vê não for o autor nem tiver ligado "Mostrar spoilers").
 */
export function EntryBody({
  entry,
  author,
  onAuthorPress,
  onAddReview,
  revealed,
  onReveal,
}: {
  entry: DiaryEntry;
  author: EntryAuthor;
  onAuthorPress?: () => void;
  /** Só na sua entrada: review vazia vira atalho para escrever. */
  onAddReview?: () => void;
  /** A tela controla o "revelar spoiler" (revela review e respostas juntas). */
  revealed?: boolean;
  onReveal?: () => void;
}) {
  const t = strings.diary;
  return (
    <View style={styles.body}>
      <Pressable
        accessibilityRole={onAuthorPress ? 'button' : undefined}
        disabled={!onAuthorPress}
        onPress={onAuthorPress}
        style={({ pressed }) => [styles.author, pressed && styles.pressed]}
      >
        <Avatar name={author.name || author.username || '?'} imageUrl={author.avatarUrl} size={40} />
        <View style={styles.flex}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {author.name || author.username}
          </Text>
          {author.username ? (
            <Text variant="caption" tone="muted">
              @{author.username}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {entry.rating || entry.liked || entry.isRewatch ? (
        <View style={styles.verdict}>
          {entry.rating ? <StarRating value={entry.rating} /> : null}
          <View style={styles.badges}>
            {entry.liked ? (
              <View style={styles.badge}>
                <Heart size={14} weight="fill" color={semantic.liked} />
                <Text variant="caption" style={styles.badgeText}>
                  {strings.catalog.liked}
                </Text>
              </View>
            ) : null}
            {entry.isRewatch ? (
              <View style={styles.badge}>
                <ArrowCounterClockwise size={13} color={palette.ink700} weight="bold" />
                <Text variant="caption" style={styles.badgeText}>
                  {strings.catalog.rewatchBadge}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {entry.reviewText ? (
        <View style={styles.review}>
          <View style={styles.quote} />
          <View style={styles.flex}>
            <SpoilerReview
              key={`${entry.id}-${entry.containsSpoilers}`}
              entry={entry}
              revealed={revealed}
              onReveal={onReveal}
              expandLines={REVIEW_LINES}
            />
          </View>
        </View>
      ) : onAddReview ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAddReview}
          style={({ pressed }) => [styles.emptyReview, pressed && styles.pressed]}
        >
          <PencilSimple size={18} color={palette.ink500} />
          <Text tone="muted" style={styles.flex}>
            {t.entryNoReview}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EntrySkeleton({ style }: { style?: { paddingTop: number } }) {
  return (
    <View style={[skeleton.root, style]}>
      <View style={skeleton.row}>
        <Skeleton width={108} height={162} radius={12} />
        <View style={skeleton.texts}>
          <Skeleton width="80%" height={22} />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
      <View style={skeleton.row}>
        <Skeleton width={40} height={40} round />
        <Skeleton width="40%" height={14} />
      </View>
      <Skeleton width={180} height={30} />
      <Skeleton width="100%" height={96} radius={20} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  // Sem overflow hidden: o fundo precisa passar para cima ao esticar.
  hero: { justifyContent: 'flex-end' },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.lg, paddingHorizontal: space.screenX },
  // Fundo sólido (coberto pelo pôster): sem ele, o iOS calcula a sombra pixel a pixel (lento, e avisa no console).
  poster: { borderRadius: radius.md, backgroundColor: palette.surfaceSunken, ...shadow.e3 },
  heroTexts: { flex: 1, gap: 4, paddingBottom: space.xs },
  meta: { fontFamily: fonts.bodyHeavy, letterSpacing: 0.4, textTransform: 'uppercase' },
  body: { gap: space.lg },
  author: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  verdict: { gap: space.sm },
  badges: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceSunken,
  },
  badgeText: { fontFamily: fonts.bodyHeavy, color: palette.ink700 },
  // Review como citação: uma barra terracota à esquerda, sem caixa pesada.
  review: { flexDirection: 'row', gap: space.md },
  quote: { width: 3, borderRadius: 2, backgroundColor: palette.terracota300 },
  emptyReview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.borderStrong,
  },
});

const skeleton = StyleSheet.create({
  root: { gap: space.xl, paddingHorizontal: space.screenX },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  texts: { flex: 1, gap: space.sm },
});
