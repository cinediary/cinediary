import { Check } from 'phosphor-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { Easing, ZoomIn } from 'react-native-reanimated';

import { useMe } from '@/features/auth/application/profileQueries';
import type { TitleSummary } from '@/features/catalog/domain/title';
import { strings } from '@/shared/i18n';
import { space, makeStyles, useColors } from '@/shared/theme';
import { PosterArt, PosterCard, SectionHeader, Text, useGridItemWidth } from '@/shared/ui';
import { useDiaryEntries } from '../../application/diaryQueries';

const RAIL_POSTER = 92;
/** Quantos vistos recentemente entram no trilho. */
const RECENT_MAX = 12;

const key = (t: TitleSummary) => `${t.mediaType}-${t.id}`;

/**
 * Os títulos da própria pessoa antes de buscar, que são os que ela mais provavelmente procura: os 4 favoritos do
 * perfil (lado a lado, como no perfil) e o que ela viu por último (trilho, sem repetir os favoritos). Usado na
 * escolha da capa e em "Adicionar títulos" da lista. `isSelected`: o ✓ nos que já foram escolhidos (ex.: já estão
 * na lista). Sem favoritos nem diário, não mostra nada.
 */
export function MyTitlesShortcuts({
  onPick,
  isSelected,
  labelFor,
}: {
  onPick: (title: TitleSummary) => void;
  isSelected?: (title: TitleSummary) => boolean;
  /** O que o leitor de tela diz ao focar um título (ex.: "Adicionar Duna"). */
  labelFor?: (title: TitleSummary) => string;
}) {
  const styles = useStyles();
  const colors = useColors();
  const a = strings.account;
  const me = useMe();
  const diary = useDiaryEntries();
  const width = useGridItemWidth(4);

  const favorites = useMemo(() => (me.data?.favorites ?? []).slice(0, 4), [me.data?.favorites]);
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

  if (!favorites.length && !recent.length) return null;

  return (
    <View style={styles.root}>
      {favorites.length ? (
        <View style={styles.section}>
          <SectionHeader title={a.coverFavorites} />
          <View style={styles.favorites}>
            {favorites.map((t) => (
              <PosterCard
                key={key(t)}
                title={t.title}
                posterUrl={t.posterUrl}
                width={width}
                selected={isSelected ? isSelected(t) : undefined}
                onPress={() => onPick(t)}
              />
            ))}
          </View>
        </View>
      ) : null}
      {recent.length ? (
        <View style={styles.section}>
          <SectionHeader title={a.coverRecent} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railContent}
            style={styles.bleed}
          >
            {recent.map((t) => {
              const selected = isSelected?.(t) ?? false;
              return (
                <Pressable
                  key={key(t)}
                  accessibilityRole="button"
                  accessibilityLabel={labelFor ? labelFor(t) : t.title}
                  accessibilityState={isSelected ? { selected } : undefined}
                  onPress={() => onPick(t)}
                  style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                >
                  <View>
                    <PosterArt title={t.title} posterUrl={t.posterUrl} width={RAIL_POSTER} radius={10} />
                    {selected ? (
                      <Animated.View
                        entering={ZoomIn.duration(180).easing(Easing.bezier(0.25, 0.1, 0.25, 1))}
                        style={styles.check}
                      >
                        <Check size={14} weight="bold" color={colors.onPrimary} />
                      </Animated.View>
                    ) : null}
                  </View>
                  <Text variant="caption" numberOfLines={2} style={styles.itemName}>
                    {t.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { gap: space.xl },
  section: { gap: space.md },
  favorites: { flexDirection: 'row', gap: space.md },
  bleed: { marginHorizontal: -space.screenX },
  railContent: { paddingHorizontal: space.screenX, gap: space.md },
  item: { width: RAIL_POSTER, gap: space.xs },
  itemName: { color: c.ink900 },
  pressed: { opacity: 0.7 },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primary,
    borderWidth: 2,
    borderColor: c.surface,
  },
}));
