import { useLocalSearchParams } from 'expo-router';
import { CaretRight } from 'phosphor-react-native';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/shared/i18n';
import { space, makeStyles, useColors } from '@/shared/theme';
import { Avatar, ErrorState, SegmentedControl, SkeletonRows, Text } from '@/shared/ui';
import { TopBar } from '@/shared/ui/navigation/TopBar';
import { useTitleCredits, useTitleExtras } from '../../application/catalogQueries';
import type { MediaType } from '../../domain/title';
import { openPerson } from '../navigation';

type Tab = 'cast' | 'crew';
interface Row {
  key: string;
  personId: number;
  name: string;
  role: string | null;
  photoUrl: string | null;
  director: boolean;
}

/** "Ver todos" do elenco e da equipe: a lista inteira, em abas. Tocar abre a filmografia. */
export function TitleCreditsScreen() {
  const styles = useStyles();
  const colors = useColors();
  const t = strings.catalog;
  const params = useLocalSearchParams<{ mediaType: string; tmdbId: string; name?: string; tab?: string }>();
  const mediaType: MediaType = params.mediaType === 'SERIES' ? 'SERIES' : 'MOVIE';
  const tmdbId = Number(params.tmdbId);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>(params.tab === 'crew' ? 'crew' : 'cast');
  const credits = useTitleCredits(mediaType, tmdbId);
  const extras = useTitleExtras(mediaType, tmdbId);
  const [scrolled, setScrolled] = useState(false);

  const query = tab === 'cast' ? credits : extras;
  const rows: Row[] =
    tab === 'cast'
      ? (credits.data ?? []).map((c) => ({ key: `${c.director ? 'd' : 'c'}-${c.personId}`, ...c }))
      : (extras.data?.crew ?? []).map((c) => ({
          key: `${c.job}-${c.personId}`,
          personId: c.personId,
          name: c.name,
          role: t.crewJob[c.job] ?? c.job,
          photoUrl: c.photoUrl,
          director: false,
        }));

  return (
    <View style={styles.root}>
      <TopBar title={params.name || t.creditsTitle} scrolled={scrolled}>
        <SegmentedControl<Tab>
          options={[
            { value: 'cast', label: t.tabCast },
            { value: 'crew', label: t.tabCrew },
          ]}
          value={tab}
          onChange={(v) => {
            setTab(v);
            setScrolled(false);
          }}
        />
      </TopBar>
      <FlatList
        key={tab}
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={[item.name, item.role].filter(Boolean).join(', ')}
            onPress={() => openPerson(item.personId)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Avatar
              name={item.name}
              imageUrl={item.photoUrl}
              size={48}
              background={item.director || tab === 'crew' ? colors.salvia300 : colors.pipoca300}
            />
            <View style={styles.texts}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {item.name}
              </Text>
              {item.role ? (
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {item.role}
                </Text>
              ) : null}
            </View>
            <CaretRight size={16} color={colors.ink500} />
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          query.isPending ? (
            <SkeletonRows count={8} />
          ) : query.isError ? (
            <ErrorState onRetry={() => query.refetch()} />
          ) : (
            <Text tone="muted">{t.castError}</Text>
          )
        }
        onScroll={(e) => {
          const past = e.nativeEvent.contentOffset.y > 4;
          if (past !== scrolled) setScrolled(past);
        }}
        scrollEventThrottle={32}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: space.screenX, paddingTop: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  pressed: { opacity: 0.7 },
  texts: { flex: 1, gap: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: 48 + space.md },
}));
