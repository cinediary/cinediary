import { CaretRight } from 'phosphor-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { TitleSummary } from '@/features/catalog/domain/title';
import { CatalogSearchPanel } from '@/features/catalog/presentation/components/CatalogSearchPanel';
import { useDiaryEntries } from '@/features/diary/application/diaryQueries';
import { strings } from '@/shared/i18n';
import { palette, space } from '@/shared/theme';
import { PosterArt, PosterCard, Screen, SectionHeader, Text, Title, useGridItemWidth } from '@/shared/ui';
import { FloatingBackButton, FLOATING_BACK_SPACE } from '@/shared/ui/navigation/FloatingBackButton';
import { useMe } from '../../application/profileQueries';
import { openCoverScenes } from '../navigation/coverNavigation';

const RAIL_POSTER = 92;
/** Quantos vistos recentemente entram no trilho. */
const RECENT_MAX = 12;

/**
 * Escolher a capa, passo 1: um filme ou série. Antes de digitar aparecem os títulos da própria pessoa, que
 * são os que ela mais provavelmente quer na capa: os favoritos do perfil e o que ela viu por último. Depois, os
 * populares da busca. Escolher um título abre as cenas dele numa tela própria (o voltar de lá volta para cá).
 */
export function ProfileHeaderPickerScreen() {
  const a = strings.account;
  const me = useMe();
  const diary = useDiaryEntries();

  const favorites = useMemo(() => me.data?.favorites ?? [], [me.data?.favorites]);
  const recent = useMemo(() => {
    const seen = new Set(favorites.map(key));
    const out: TitleSummary[] = [];
    for (const entry of diary.data?.pages.flat() ?? []) {
      const k = key(entry.title);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(entry.title);
      if (out.length === RECENT_MAX) break;
    }
    return out;
  }, [diary.data, favorites]);

  const mine =
    favorites.length || recent.length ? (
      <View style={styles.mine}>
        {favorites.length ? <FavoritesGrid titles={favorites.slice(0, 4)} /> : null}
        {recent.length ? <Rail title={a.coverRecent} titles={recent} /> : null}
      </View>
    ) : null;

  return (
    <View style={styles.root}>
      <Screen scroll edges={['top', 'bottom']} contentStyle={styles.content}>
        <View style={styles.header}>
          <Title parts={a.coverPickerTitle} />
          <Text tone="secondary">{a.coverPickerHint}</Text>
        </View>
        <CatalogSearchPanel
          context="profile_header"
          onOpen={openCoverScenes}
          onAction={openCoverScenes}
          placeholder={a.coverSearch}
          actionIcon={<CaretRight size={20} color={palette.ink500} />}
          actionLabel={(t) => a.coverPickScene(t.title)}
          idleHeader={mine}
        />
      </Screen>
      <FloatingBackButton />
    </View>
  );
}

const key = (t: TitleSummary) => `${t.mediaType}-${t.id}`;

/** Os 4 favoritos lado a lado, sem rolar, como no perfil. */
function FavoritesGrid({ titles }: { titles: TitleSummary[] }) {
  const width = useGridItemWidth(4);
  return (
    <View style={styles.rail}>
      <SectionHeader title={strings.account.coverFavorites} />
      <View style={styles.favorites}>
        {titles.map((t) => (
          <PosterCard key={key(t)} title={t.title} posterUrl={t.posterUrl} width={width} onPress={() => openCoverScenes(t)} />
        ))}
      </View>
    </View>
  );
}

/** Trilho com pôster + nome (o mesmo jeito dos trilhos do app), encostando nas bordas da tela. */
function Rail({ title, titles }: { title: string; titles: TitleSummary[] }) {
  return (
    <View style={styles.rail}>
      <SectionHeader title={title} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
        style={styles.bleed}
      >
        {titles.map((t) => (
          <Pressable
            key={key(t)}
            accessibilityRole="button"
            accessibilityLabel={strings.account.coverPickScene(t.title)}
            onPress={() => openCoverScenes(t)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <PosterArt title={t.title} posterUrl={t.posterUrl} width={RAIL_POSTER} radius={10} />
            <Text variant="caption" numberOfLines={2} style={styles.itemName}>
              {t.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: FLOATING_BACK_SPACE, gap: space.xl },
  header: { gap: space.sm },
  mine: { gap: space.xl },
  rail: { gap: space.md },
  favorites: { flexDirection: 'row', gap: space.md },
  bleed: { marginHorizontal: -space.screenX },
  railContent: { paddingHorizontal: space.screenX, gap: space.md },
  item: { width: RAIL_POSTER, gap: space.xs },
  itemName: { color: palette.ink900 },
  pressed: { opacity: 0.7 },
});
