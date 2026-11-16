import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/shared/i18n';
import { palette, radius, semantic, space, touch } from '@/shared/theme';
import { ErrorState, PosterCard, SectionHeader, Text, useGridItemWidth } from '@/shared/ui';
import { FloatingBackButton } from '@/shared/ui/navigation/FloatingBackButton';
import { useCompany } from '../../application/catalogQueries';
import { CompanySkeleton } from '../components/Skeletons';
import { openTitle } from '../navigation';

/** Produtora (ex.: A24): logo, nome, país e a grade dos filmes dela, os mais populares primeiro. */
export function CompanyScreen() {
  const t = strings.catalog;
  const insets = useSafeAreaInsets();
  const { companyId } = useLocalSearchParams<{ companyId: string }>();
  const company = useCompany(Number(companyId));
  const width = useGridItemWidth(3);

  if (!company.data) {
    return (
      <View style={company.isError ? [styles.root, styles.center] : styles.root}>
        {company.isError ? <ErrorState message={t.companyError} onRetry={() => company.refetch()} /> : <CompanySkeleton />}
        <FloatingBackButton />
      </View>
    );
  }
  const c = company.data;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.sm + touch.minTarget }]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {c.logoUrl ? (
            <View style={styles.logoBox}>
              <Image source={c.logoUrl} style={styles.logo} contentFit="contain" />
            </View>
          ) : null}
          <Text variant="h2" accessibilityRole="header" style={styles.textCenter}>
            {c.name}
          </Text>
          {c.originCountry ? (
            <Text variant="caption" tone="secondary">
              {c.originCountry}
            </Text>
          ) : null}
        </View>
        <SectionHeader title={t.companyTitles(c.titles.length)} />
        <View style={styles.grid}>
          {c.titles.map((item) => (
            <PosterCard
              key={`${item.mediaType}-${item.id}`}
              title={item.title}
              year={item.year}
              posterUrl={item.posterUrl}
              width={width}
              watched={item.state.watched}
              liked={item.state.liked}
              rating={item.state.rating}
              showCaption
              onPress={() => openTitle(item)}
            />
          ))}
        </View>
        <Text variant="caption" tone="muted">
          {strings.common.tmdbCredit}
        </Text>
      </ScrollView>
      <FloatingBackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  center: { justifyContent: 'center' },
  content: { paddingHorizontal: space.screenX, paddingBottom: space['3xl'], gap: space.xl },
  hero: { alignItems: 'center', gap: space.sm },
  // Fundo claro: muitos logos do TMDB são escuros e somem no creme sem uma caixa.
  logoBox: { padding: space.lg, borderRadius: radius.lg, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  logo: { width: 160, height: 64 },
  textCenter: { textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
});
