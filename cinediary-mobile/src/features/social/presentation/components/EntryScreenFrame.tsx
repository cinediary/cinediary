import { DotsThree } from 'phosphor-react-native';
import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMe } from '@/features/auth/application/profileQueries';
import { queryClient } from '@/shared/api/queryClient';
import { useHidesSpoiler } from '@/features/diary/application/useHidesSpoiler';
import type { DiaryEntry } from '@/features/diary/domain/diary';
import { EntryBody, EntryHero, type EntryAuthor } from '@/features/diary/presentation/components/EntryDetail';
import { strings } from '@/shared/i18n';
import { palette, semantic, space, touch } from '@/shared/theme';
import { FloatingBackButton } from '@/shared/ui/navigation/FloatingBackButton';
import { conversationKeys, useEntryInteractions } from '../../application/entryConversation';
import { EntryActionBar, ReplyComposer, ReplyList } from './EntryConversation';

/**
 * Moldura comum da tela de uma entrada (sua ou de outra pessoa): topo com o pôster, corpo com a review,
 * curtir/respostas e o campo de resposta fixo acima do teclado. Revelar o spoiler da review também abre as
 * respostas (e vice-versa).
 */
export function EntryScreenFrame({
  entry,
  author,
  ownEntry,
  onAuthorPress,
  onAddReview,
  onShare,
  onMore,
  menu,
  onRefresh,
}: {
  entry: DiaryEntry;
  author: EntryAuthor;
  ownEntry: boolean;
  onAuthorPress?: () => void;
  onAddReview?: () => void;
  onShare?: () => void;
  /** Só na sua entrada: o "⋯" do canto (editar, excluir). */
  onMore?: () => void;
  /** O menu do "⋯" (fica por cima de tudo). */
  menu?: ReactNode;
  /** Puxar para atualizar: recarrega a entrada (curtidas e respostas recarregam junto). */
  onRefresh?: () => Promise<unknown>;
}) {
  const insets = useSafeAreaInsets();
  const me = useMe();
  const hides = useHidesSpoiler(entry);
  const [revealed, setRevealed] = useState(false);
  // "Só assistido" (sem review): a tela existe, mas sem curtidas nem respostas. Enquanto não sabe, decide pela
  // review que já está na entrada (não pisca a conversa num registro sem review).
  const interactions = useEntryInteractions(entry.id);
  const interactive = interactions.data?.interactive ?? !!entry.reviewText;
  const scrollRef = useRef<ScrollViewInstance>(null);
  const toEnd = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const [refreshing, setRefreshing] = useState(false);
  // Alguém comentou enquanto a tela estava aberta: puxar para baixo traz a resposta nova.
  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        // Tempo mínimo: com cache a resposta volta em ~100 ms e o "carregando" só piscaria.
        new Promise((r) => setTimeout(r, 700)),
        onRefresh?.(),
        queryClient.refetchQueries({ queryKey: conversationKeys.interactions(entry.id) }),
        queryClient.refetchQueries({ queryKey: conversationKeys.comments(entry.id) }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // O indicador nativo ficaria escondido atrás do fundo que estica: o gesto é o nativo, o "carregando" é o selo abaixo.
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="transparent" />}
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: space.xl }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <EntryHero entry={entry} scrollY={scrollY} />
        <View style={styles.content}>
          <EntryBody
            entry={entry}
            author={author}
            onAuthorPress={onAuthorPress}
            onAddReview={onAddReview}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
          />
          {interactive ? (
            <>
              <EntryActionBar entryId={entry.id} ownEntry={ownEntry} onShare={onShare} />
              <ReplyList entryId={entry.id} meId={me.data?.id} hidden={hides && !revealed} onReveal={() => setRevealed(true)} />
            </>
          ) : onShare ? (
            <EntryActionBar entryId={entry.id} ownEntry={ownEntry} onShare={onShare} shareOnly />
          ) : null}
        </View>
      </Animated.ScrollView>
      {interactive ? (
        <ReplyComposer entryId={entry.id} ownEntry={ownEntry} ownerUsername={author.username} onSent={toEnd} onFocus={toEnd} />
      ) : null}
      <FloatingBackButton />
      {refreshing ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(200)}
          pointerEvents="none"
          style={[styles.refreshing, { top: insets.top + space.sm }]}
          accessibilityLiveRegion="polite"
          accessibilityLabel={strings.common.loading}
        >
          <ActivityIndicator size="small" color={semantic.primary} />
        </Animated.View>
      ) : null}
      {onMore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.social.moreOptions}
          onPress={onMore}
          hitSlop={8}
          style={({ pressed }) => [styles.more, { top: insets.top + space.sm }, pressed && styles.pressed]}
        >
          <DotsThree size={24} weight="bold" color={palette.ink900} />
        </Pressable>
      ) : null}
      {menu}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: space.screenX, paddingTop: space.lg, gap: space.xl },
  more: {
    position: 'absolute',
    right: space.screenX,
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: touch.minTarget / 2,
    backgroundColor: 'rgba(255,253,249,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  refreshing: {
    position: 'absolute',
    alignSelf: 'center',
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: touch.minTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,253,249,0.95)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});
