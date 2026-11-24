import { Image } from 'expo-image';
import { CaretRight } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useTitleBackdrops } from '@/features/catalog/application/catalogQueries';
import type { TitleSummary } from '@/features/catalog/domain/title';
import { CatalogSearchPanel } from '@/features/catalog/presentation/components/CatalogSearchPanel';
import { strings } from '@/shared/i18n';
import { palette, radius, semantic, space } from '@/shared/theme';
import { ErrorState, Screen, Skeleton, Text, Title, useToast } from '@/shared/ui';
import { FloatingBackButton, FLOATING_BACK_SPACE } from '@/shared/ui/navigation/FloatingBackButton';
import { nav } from '@/shared/ui/navigation/nav';
import { useProfileHeader } from '../../application/profileHeader';

/**
 * Escolher a capa do perfil, como no Letterboxd: busca um filme ou série e escolhe uma das cenas dele
 * (backdrops sem texto do TMDB). Tocar numa cena salva na hora e volta para Editar perfil.
 */
export function ProfileHeaderPickerScreen() {
  const a = strings.account;
  const [title, setTitle] = useState<TitleSummary | null>(null);

  return (
    <View style={styles.root}>
      <Screen scroll edges={['top', 'bottom']} contentStyle={styles.content}>
        <View style={styles.header}>
          <Title parts={a.coverPickerTitle} />
          <Text tone="secondary">{a.coverPickerHint}</Text>
        </View>
        {title ? (
          <Scenes title={title} onOtherTitle={() => setTitle(null)} />
        ) : (
          <CatalogSearchPanel
            context="profile_header"
            onOpen={setTitle}
            onAction={setTitle}
            placeholder={a.coverSearch}
            actionIcon={<CaretRight size={20} color={palette.ink500} />}
            actionLabel={(t) => a.coverPickScene(t.title)}
            autoFocus
          />
        )}
      </Screen>
      <FloatingBackButton />
    </View>
  );
}

function Scenes({ title, onOtherTitle }: { title: TitleSummary; onOtherTitle: () => void }) {
  const a = strings.account;
  const toast = useToast();
  const backdrops = useTitleBackdrops(title);
  const { set } = useProfileHeader();
  const [saving, setSaving] = useState<string | null>(null);

  const choose = (path: string) => {
    if (set.isPending) return;
    setSaving(path);
    set.mutate(
      { titleId: title.id, backdropPath: path },
      {
        onSuccess: () => {
          toast(a.coverSaved);
          nav.back();
        },
        onError: () => toast(a.coverError),
        onSettled: () => setSaving(null),
      },
    );
  };

  return (
    <View style={styles.scenes}>
      <View style={styles.scenesHeader}>
        <Text variant="bodyStrong" style={styles.flex} numberOfLines={2}>
          {a.coverPickScene(title.title)}
        </Text>
        <Pressable accessibilityRole="button" onPress={onOtherTitle} hitSlop={8}>
          <Text variant="caption" tone="link">
            {a.coverOtherTitle}
          </Text>
        </Pressable>
      </View>

      {backdrops.isPending ? (
        Array.from({ length: 3 }, (_, i) => <Skeleton key={i} width="100%" height={180} radius={radius.md} />)
      ) : backdrops.isError ? (
        <ErrorState message={a.coverScenesError} onRetry={() => backdrops.refetch()} />
      ) : backdrops.data.length === 0 ? (
        <Text tone="muted">{a.coverNoScenes}</Text>
      ) : (
        backdrops.data.map((b, i) => (
          <Pressable
            key={b.path}
            accessibilityRole="button"
            accessibilityLabel={a.coverSceneLabel(i + 1, title.title)}
            accessibilityHint={a.coverUseScene}
            disabled={set.isPending}
            onPress={() => choose(b.path)}
            style={({ pressed }) => [styles.scene, pressed && styles.pressed]}
          >
            <Image source={{ uri: b.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
            {saving === b.path ? (
              <View style={styles.saving}>
                <ActivityIndicator color={semantic.onPrimary} />
              </View>
            ) : null}
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: FLOATING_BACK_SPACE, gap: space.xl },
  header: { gap: space.sm },
  flex: { flex: 1 },
  scenes: { gap: space.md },
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
