import { Pressable, StyleSheet, View } from 'react-native';

import { strings } from '@/shared/i18n';
import { palette, space } from '@/shared/theme';
import { Avatar, Rail, SectionHeader, Skeleton, Text, useRailItemWidth } from '@/shared/ui';
import { useTitleCredits } from '../../application/catalogQueries';
import type { MediaType } from '../../domain/title';
import { openPerson, openTitleCredits } from '../navigation';
import { SeeAllBubble } from './SeeAllBubble';

const PHOTO = 64;
/** O carrossel mostra estes; o resto fica em "Ver todos" (antes eram até 20 seguidos). */
export const RAIL_PEOPLE = 10;

/** Elenco e direção em carrossel: um toque abre a filmografia da pessoa. */
export function CastSection({ mediaType, tmdbId, titleName }: { mediaType: MediaType; tmdbId: number; titleName: string }) {
  const t = strings.catalog;
  const credits = useTitleCredits(mediaType, tmdbId);
  const itemWidth = useRailItemWidth(4.4);

  // O elenco é complemento da página: sem dados, a seção some em vez de ocupar espaço com erro.
  if (credits.isSuccess && credits.data.length === 0) return null;

  return (
    <View style={styles.root}>
      <SectionHeader title={t.cast} />
      {credits.isError ? (
        <Text variant="caption" tone="muted">
          {t.castError}
        </Text>
      ) : (
        <Rail itemWidth={itemWidth}>
          {credits.data
            ? [
                ...credits.data.slice(0, RAIL_PEOPLE).map((c) => (
                  <Pressable
                    key={`${c.director ? 'd' : 'c'}-${c.personId}`}
                    accessibilityRole="button"
                    accessibilityLabel={[c.name, c.role].filter(Boolean).join(', ')}
                    accessibilityHint={t.openPerson(c.name)}
                    onPress={() => openPerson(c.personId)}
                    style={({ pressed }) => [styles.item, { width: itemWidth }, pressed && styles.pressed]}
                  >
                    <Avatar
                      name={c.name}
                      imageUrl={c.photoUrl}
                      size={PHOTO}
                      background={c.director ? palette.salvia300 : palette.pipoca300}
                    />
                    <Text variant="caption" style={styles.name} numberOfLines={2}>
                      {c.name}
                    </Text>
                    {c.role ? (
                      <Text variant="caption" tone="muted" style={styles.center} numberOfLines={1}>
                        {c.role}
                      </Text>
                    ) : null}
                  </Pressable>
                )),
                ...(credits.data.length > RAIL_PEOPLE
                  ? [
                      <SeeAllBubble
                        key="all"
                        width={itemWidth}
                        size={PHOTO}
                        onPress={() => openTitleCredits(mediaType, tmdbId, titleName, 'cast')}
                      />,
                    ]
                  : []),
              ]
            : Array.from({ length: 5 }, (_, i) => (
                <View key={i} style={[styles.item, { width: itemWidth }]}>
                  <Skeleton width={PHOTO} height={PHOTO} round />
                  <Skeleton width={60} height={10} />
                </View>
              ))}
        </Rail>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  item: { alignItems: 'center', gap: space.xs },
  pressed: { opacity: 0.7 },
  name: { textAlign: 'center', fontFamily: 'Nunito_700Bold', color: palette.ink900 },
  center: { textAlign: 'center' },
});
