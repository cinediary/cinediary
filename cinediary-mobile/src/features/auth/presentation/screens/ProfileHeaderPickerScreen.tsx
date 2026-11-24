import { Image } from 'expo-image';
import { CaretRight } from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTitleBackdrops } from '@/features/catalog/application/catalogQueries';
import type { TitleBackdrop } from '@/features/catalog/domain/extras';
import type { TitleSummary } from '@/features/catalog/domain/title';
import { CatalogSearchPanel } from '@/features/catalog/presentation/components/CatalogSearchPanel';
import { strings } from '@/shared/i18n';
import { palette, radius, semantic, space } from '@/shared/theme';
import { ErrorState, Screen, Skeleton, Text, Title, useToast } from '@/shared/ui';
import { FloatingBackButton, FLOATING_BACK_SPACE } from '@/shared/ui/navigation/FloatingBackButton';
import { nav } from '@/shared/ui/navigation/nav';
import { useProfileHeader } from '../../application/profileHeader';

type SetHeader = ReturnType<typeof useProfileHeader>['set'];

/**
 * Escolher a capa do perfil, como no Letterboxd: busca um filme ou série e escolhe uma das cenas dele
 * (backdrops sem texto do TMDB). Tocar numa cena salva na hora e volta para Editar perfil.
 * A gravação fica aqui (e não em cada lista de cenas): enquanto uma está em andamento, nem outra cena nem
 * "outro título" respondem, então só uma gravação acontece por vez e a última escolha é a que fica.
 */
export function ProfileHeaderPickerScreen() {
  const a = strings.account;
  const [title, setTitle] = useState<TitleSummary | null>(null);
  const { set } = useProfileHeader();

  const header = (
    <View style={styles.header}>
      <Title parts={a.coverPickerTitle} />
      <Text tone="secondary">{a.coverPickerHint}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      {title ? (
        <Scenes title={title} header={header} set={set} onOtherTitle={() => setTitle(null)} />
      ) : (
        <Screen scroll edges={['top', 'bottom']} contentStyle={styles.content}>
          {header}
          <CatalogSearchPanel
            context="profile_header"
            onOpen={setTitle}
            onAction={setTitle}
            placeholder={a.coverSearch}
            actionIcon={<CaretRight size={20} color={palette.ink500} />}
            actionLabel={(t) => a.coverPickScene(t.title)}
            autoFocus
          />
        </Screen>
      )}
      <FloatingBackButton />
    </View>
  );
}

/** As cenas do título numa lista virtualizada (até 30 imagens grandes): só as visíveis são montadas. */
function Scenes({
  title,
  header,
  set,
  onOtherTitle,
}: {
  title: TitleSummary;
  header: ReactNode;
  set: SetHeader;
  onOtherTitle: () => void;
}) {
  const a = strings.account;
  const toast = useToast();
  const backdrops = useTitleBackdrops(title);
  const saving = set.isPending ? set.variables?.backdropPath : null;

  const choose = (path: string) => {
    if (set.isPending) return;
    set.mutate(
      { titleId: title.id, backdropPath: path },
      {
        onSuccess: () => {
          toast(a.coverSaved);
          nav.back();
        },
        onError: () => toast(a.coverError),
      },
    );
  };

  const listHeader = (
    <View style={styles.listHeader}>
      {header}
      <View style={styles.scenesHeader}>
        <Text variant="bodyStrong" style={styles.flex} numberOfLines={2}>
          {a.coverPickScene(title.title)}
        </Text>
        <Pressable accessibilityRole="button" onPress={onOtherTitle} disabled={set.isPending} hitSlop={8}>
          <Text variant="caption" tone={set.isPending ? 'muted' : 'link'}>
            {a.coverOtherTitle}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const empty = backdrops.isPending ? (
    <View style={styles.list}>
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} width="100%" height={180} radius={radius.md} />
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
        ListHeaderComponent={listHeader}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Separator}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={a.coverSceneLabel(index + 1, title.title)}
            accessibilityHint={a.coverUseScene}
            disabled={set.isPending}
            onPress={() => choose(item.path)}
            style={({ pressed }) => [styles.scene, pressed && styles.pressed]}
          >
            <Image source={{ uri: item.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
            {saving === item.path ? (
              <View style={styles.saving}>
                <ActivityIndicator color={semantic.onPrimary} />
              </View>
            ) : null}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  content: { paddingTop: FLOATING_BACK_SPACE, gap: space.xl },
  listContent: { paddingHorizontal: space.screenX, paddingTop: FLOATING_BACK_SPACE, paddingBottom: space.xl },
  listHeader: { gap: space.xl, marginBottom: space.md },
  header: { gap: space.sm },
  flex: { flex: 1 },
  list: { gap: space.md },
  separator: { height: space.md },
  scenesHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  scene: {
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: palette.surfaceSunken,
  },
  pressed: { opacity: 0.8 },
  saving: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42,33,28,0.45)',
  },
});
