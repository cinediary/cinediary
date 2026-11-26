import { View } from 'react-native';

import { radius, space, makeStyles } from '@/shared/theme';
import { Skeleton, SkeletonGrid, SkeletonLines, SkeletonRail, useRailItemWidth } from '@/shared/ui';
import { useFloatingBackInset } from '@/shared/ui/navigation/FloatingBackButton';

/**
 * Esqueletos das telas do catálogo, no formato do conteúdo que vai chegar (o layout não pula quando
 * os dados entram). Antes essas telas mostravam um spinner com "Carregando…".
 */

/** Temporadas da série enquanto o detalhe completo chega. */
export function SeasonsSkeleton({ count = 3 }: { count?: number }) {
  const styles = useStyles();
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
  const styles = useStyles();
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
  const styles = useStyles();
  const backInset = useFloatingBackInset();
  return (
    <View style={[styles.page, { paddingTop: backInset }]}>
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
  const styles = useStyles();
  const backInset = useFloatingBackInset();
  return (
    <View style={[styles.page, { paddingTop: backInset }]}>
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

const useStyles = makeStyles((c) => ({
  flex: { flex: 1, gap: space.sm },
  seasons: { gap: space.md },
  seasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
  },
  people: { flexDirection: 'row', gap: space.md },
  person: { alignItems: 'center', gap: space.sm },
  card: { padding: space.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border },
  page: { flex: 1, backgroundColor: c.background, paddingHorizontal: space.screenX, gap: space.xl },
  hero: { alignItems: 'center', gap: space.md },
}));
