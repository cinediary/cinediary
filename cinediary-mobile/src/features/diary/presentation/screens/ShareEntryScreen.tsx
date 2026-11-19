import { router, useLocalSearchParams } from 'expo-router';
import { InstagramLogo, X } from 'phosphor-react-native';
import { useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMe } from '@/features/auth/application/profileQueries';
import { strings } from '@/shared/i18n';
import { palette, space, story, touch } from '@/shared/theme';
import { Button, ErrorState, Text, useToast } from '@/shared/ui';
import { useEntry } from '../../application/diaryQueries';
import { useShareEntry } from '../../application/useShareEntry';
import { EntryStoryCard } from '../components/EntryStoryCard';

/**
 * Prévia do card dos Stories: a pessoa vê como vai sair e toca em "Compartilhar nos Stories" (no Instagram, o
 * cartão chega como sticker e dá para mover). As capturas são feitas desta prévia visível (com o pôster já carregado).
 */
export function ShareEntryScreen() {
  const t = strings.diary;
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const toast = useToast();
  const me = useMe();
  const entry = useEntry(entryId);
  const { share, sharing } = useShareEntry(entry.data);
  const cardRef = useRef<ComponentRef<typeof View>>(null);
  const backgroundRef = useRef<ComponentRef<typeof View>>(null);
  const stickerRef = useRef<ComponentRef<typeof View>>(null);

  // A maior prévia 9:16 que cabe entre o fechar e o botão.
  const available = height - insets.top - insets.bottom - touch.minTarget - touch.buttonHeight - space.xl * 3;
  const cardWidth = Math.min(width - space.screenX * 2, (available * story.exportWidth) / story.exportHeight);

  const onShare = async () => {
    const status = await share({ full: cardRef, background: backgroundRef, sticker: stickerRef });
    if (status === 'error') toast(t.entryShareError);
    if (status === 'unavailable') toast(t.entryShareUnavailable);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.md }]}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.common.close}
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.close}
        >
          <X size={22} color={palette.surface} />
        </Pressable>
      </View>
      <View style={styles.stage}>
        {entry.data ? (
          <View style={styles.cardShadow}>
            <EntryStoryCard
              ref={cardRef}
              backgroundRef={backgroundRef}
              stickerRef={stickerRef}
              entry={entry.data}
              author={{ username: me.data?.username ?? '', name: me.data?.displayName ?? '', avatarUrl: me.data?.avatarUrl ?? null }}
              width={cardWidth}
            />
          </View>
        ) : entry.isError ? (
          <ErrorState message={t.entryError} onRetry={() => entry.refetch()} />
        ) : (
          <Text tone="muted">{t.entrySharing}</Text>
        )}
      </View>
      <View style={styles.footer}>
        <Button
          label={sharing ? t.entrySharing : t.entryShareStories}
          loading={sharing}
          disabled={!entry.data}
          icon={<InstagramLogo size={20} color={palette.surface} weight="bold" />}
          onPress={onShare}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink900 },
  top: { paddingHorizontal: space.screenX, alignItems: 'flex-end' },
  close: {
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: touch.minTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,253,249,0.14)',
  },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space.md },
  // Cantos arredondados só na prévia: a imagem exportada sai inteira, retangular.
  cardShadow: { borderRadius: 18, overflow: 'hidden' },
  footer: { paddingHorizontal: space.screenX },
});
