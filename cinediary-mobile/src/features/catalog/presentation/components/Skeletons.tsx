import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { poster, radius, semantic, space, touch } from '@/shared/theme';
import { Skeleton, SkeletonGrid, SkeletonLines, SkeletonRail, useRailItemWidth } from '@/shared/ui';

/**
 * Esqueletos das telas do catálogo, no formato do conteúdo que vai chegar (o layout não pula quando
 * os dados entram). Antes essas telas mostravam um spinner com "Carregando…".
 */

const BACKDROP = 220;
const POSTER_W = poster.lg.width * 0.75;

/** Página do título sem nada em cache (ex.: aberta por link). */
export function TitleDetailSkeleton() {
  return (
    <View style={styles.root}>
      <Skeleton width="100%" height={BACKDROP} radius={0} />
      <View style={styles.headerBody}>
        <View style={styles.headerRow}>
          <Skeleton width={POSTER_W} height={POSTER_W / poster.ratio} radius={poster.radius} />
          <View style={styles.headerTexts}>
            <Skeleton width="85%" height={24} />
            <Skeleton width="60%" height={12} />
          </View>
        </View>
        <SkeletonLines lines={3} />
      </View>
      <View style={styles.body}>
        <View style={styles.actions}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} width={52} height={52} round />
          ))}
        </View>
        <Skeleton width="100%" height={touch.buttonHeight} radius={radius.pill} />
      </View>
    </View>
  );
}

/** Temporadas da série enquanto o detalhe completo chega. */
export function SeasonsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.seasons}>
      <Skeleton width="100%" height={8} round />
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.seasonCard}>
          <View style={styles.flex}>
            <Skeleton width="55%" height={16} />
            <Skeleton width="100%" height={4} round />
          </View>
          <Skeleton width={28} height={28} round />
        </View>
      ))}
    </View>
  );
}

/** Equipe e "Sobre" enquanto os extras chegam. */
export function ExtrasSkeleton() {
  const itemWidth = useRailItemWidth(4.4);
  return (
    <View style={styles.seasons}>
      <Skeleton width={90} height={12} />
      <View style={styles.people}>
        {Array.from({ length: 4 }, (_, i) => (
          <View key={i} style={[styles.person, { width: itemWidth }]}>
            <Skeleton width={64} height={64} round />
            <Skeleton width={56} height={10} />
          </View>
        ))}
      </View>
      <Skeleton width={70} height={12} />
      <View style={styles.card}>
        <SkeletonLines lines={3} />
      </View>
      <Skeleton width={110} height={12} />
      <SkeletonRail itemWidth={useRailItemWidth()} />
    </View>
  );
}

/** Pessoa (filmografia): foto, nome e a grade. */
export function PersonSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.page, { paddingTop: insets.top + space.sm + touch.minTarget }]}>
      <View style={styles.hero}>
        <Skeleton width={112} height={112} round />
        <Skeleton width={180} height={24} />
      </View>
      <Skeleton width={120} height={12} />
      <SkeletonGrid columns={3} count={9} />
    </View>
  );
}

/** Produtora: logo, nome, país e a grade. */
export function CompanySkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.page, { paddingTop: insets.top + space.sm + touch.minTarget }]}>
      <View style={styles.hero}>
        <Skeleton width={192} height={96} radius={radius.lg} />
        <Skeleton width={200} height={24} />
        <Skeleton width={100} height={12} />
      </View>
      <Skeleton width={80} height={12} />
      <SkeletonGrid columns={3} count={9} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  flex: { flex: 1, gap: space.sm },
  headerBody: { marginTop: -96, paddingHorizontal: space.screenX, gap: space.lg },
  headerRow: { flexDirection: 'row', gap: space.lg, alignItems: 'flex-end' },
  headerTexts: { flex: 1, gap: space.sm, paddingBottom: space.xs },
  body: { paddingHorizontal: space.screenX, paddingTop: space.xl, gap: space.xl },
  actions: { flexDirection: 'row', gap: space.lg },
  seasons: { gap: space.md },
  seasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#EFE6DA',
  },
  people: { flexDirection: 'row', gap: space.md },
  person: { alignItems: 'center', gap: space.sm },
  card: { padding: space.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: '#EFE6DA' },
  page: { flex: 1, backgroundColor: semantic.background, paddingHorizontal: space.screenX, gap: space.xl },
  hero: { alignItems: 'center', gap: space.md },
});
