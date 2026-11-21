import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/shared/i18n';
import { semantic, space } from '@/shared/theme';
import { Avatar, ErrorState, PosterCard, SectionHeader, Text, useGridItemWidth } from '@/shared/ui';
import { usePerson } from '../../application/catalogQueries';
import { directsFirst } from '../../domain/person';
import type { TitleSummary } from '../../domain/title';
import { FloatingBackButton, useFloatingBackInset } from '@/shared/ui/navigation/FloatingBackButton';
import { PersonSkeleton } from '../components/Skeletons';
import { openTitle } from '../navigation';

/** Filmografia de alguém do elenco/direção: foto, nome e grades "Atuou em" / "Dirigiu". */
export function PersonScreen() {
  const t = strings.catalog;
  const insets = useSafeAreaInsets();
  const backInset = useFloatingBackInset();
  const params = useLocalSearchParams<{ personId: string }>();
  const person = usePerson(Number(params.personId));

  if (!person.data) {
    return (
      <View style={styles.root}>
        {person.isError ? (
          <View style={[styles.center, { paddingTop: insets.top + space.sm }]}>
            <ErrorState message={t.personError} onRetry={() => person.refetch()} />
          </View>
        ) : (
          <PersonSkeleton />
        )}
        <FloatingBackButton />
      </View>
    );
  }

  const p = person.data;
  const sections = [
    { key: 'acting', title: t.acted, items: p.acting },
    { key: 'directing', title: t.directed, items: p.directing },
  ].filter((s) => s.items.length > 0);
  if (directsFirst(p)) sections.reverse();

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.root}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: backInset }]}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.hero}>
          <Avatar name={p.name} imageUrl={p.photoUrl} size={112} />
          <Text variant="h2" accessibilityRole="header" style={styles.textCenter}>
            {p.name}
          </Text>
        </View>
        {sections.length === 0 ? (
          <Text tone="muted" style={styles.textCenter}>
            {t.personEmpty}
          </Text>
        ) : null}
        {sections.map((s) => (
          <View key={s.key} style={styles.section}>
            <SectionHeader title={`${s.title} · ${s.items.length}`} />
            <TitleGrid items={s.items} />
          </View>
        ))}
        <Text variant="caption" tone="muted">
          {strings.common.tmdbCredit}
        </Text>
      </ScrollView>
      <FloatingBackButton />
    </View>
  );
}

function TitleGrid({ items }: { items: TitleSummary[] }) {
  const width = useGridItemWidth(3);
  return (
    <View style={styles.grid}>
      {items.map((item) => (
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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: semantic.background,
  },
  content: {
    paddingHorizontal: space.screenX,
    paddingBottom: space['3xl'],
    gap: space.xl,
  },
  hero: { alignItems: 'center', gap: space.md },
  textCenter: { textAlign: 'center' },
  section: { gap: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
});
