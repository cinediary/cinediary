import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTitleBackdrops } from '@/features/catalog/application/catalogQueries';
import type { TitleBackdrop } from '@/features/catalog/domain/extras';
import type { MediaType } from '@/features/catalog/domain/title';
import { strings } from '@/shared/i18n';
import { palette, radius, semantic, space } from '@/shared/theme';
import { ErrorState, Skeleton, Text, Title } from '@/shared/ui';
import { FloatingBackButton, FLOATING_BACK_SPACE } from '@/shared/ui/navigation/FloatingBackButton';
import { openCoverPreview } from '../navigation/coverNavigation';

const COLUMNS = 2;

/**
 * Escolher a capa, passo 2: as cenas do título (backdrops sem texto do TMDB), numa grade de 2 colunas.
 * Tocar numa cena abre a prévia no perfil; nada é salvo aqui. O voltar (botão ou gesto) volta para a busca.
 */
export function ProfileHeaderScenesScreen() {
  const a = strings.account;
  const p = useLocalSearchParams<{ mediaType: MediaType; tmdbId: string; titleId: string; name: string }>();
  const { width } = useWindowDimensions();
  const backdrops = useTitleBackdrops({ mediaType: p.mediaType, tmdbId: Number(p.tmdbId) });
  const cell = (width - space.screenX * 2 - space.md * (COLUMNS - 1)) / COLUMNS;
  const cellHeight = (cell * 9) / 16;

  const header = (
    <View style={styles.header}>
      <Title parts={['', a.coverPickScene(p.name), '']} />
      <Text tone="secondary">{a.coverUseScene}</Text>
    </View>
  );

  const empty = backdrops.isPending ? (
    <View style={styles.grid}>
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} width={cell} height={cellHeight} radius={radius.md} />
      ))}
    </View>
  ) : backdrops.isError ? (
    <ErrorState message={a.coverScenesError} onRetry={() => backdrops.refetch()} />
  ) : (
    <Text tone="muted">{a.coverNoScenes}</Text>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <FlatList<TitleBackdrop>
        data={backdrops.data ?? []}
        keyExtractor={(b) => b.path}
        numColumns={COLUMNS}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={a.coverSceneLabel(index + 1, p.name)}
            accessibilityHint={a.coverPreviewHint}
            onPress={() => openCoverPreview({ titleId: Number(p.titleId), name: p.name, path: item.path, url: item.url })}
            style={({ pressed }) => [styles.scene, { width: cell, height: cellHeight }, pressed && styles.pressed]}
          >
            <Image source={{ uri: item.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
          </Pressable>
        )}
      />
      <FloatingBackButton />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  content: { paddingHorizontal: space.screenX, paddingTop: FLOATING_BACK_SPACE, paddingBottom: space.xl, gap: space.md },
  header: { gap: space.sm, marginBottom: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  row: { gap: space.md },
  scene: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: palette.surfaceSunken },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
