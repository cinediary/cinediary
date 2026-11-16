import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { ChatCircle, Copy, EyeSlash, Heart, InstagramLogo, LockSimple, PaperPlaneRight, Trash } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings, timeAgo } from '@/shared/i18n';
import { fonts, palette, radius, semantic, space, touch, type as typeScale } from '@/shared/theme';
import { ActionSheet, Avatar, SkeletonRows, Text, useToast } from '@/shared/ui';
import {
  useAddReply,
  useDeleteReply,
  useEntryComments,
  useEntryInteractions,
  useToggleEntryLike,
} from '../../application/entryConversation';
import { REPLY_MAX, type EntryComment } from '../../domain/social';
import { openProfile } from '../navigation';

/** Curtir, número de respostas e (na sua entrada) compartilhar nos Stories. */
export function EntryActionBar({
  entryId,
  ownEntry,
  onShare,
  shareOnly = false,
}: {
  entryId: string;
  ownEntry: boolean;
  onShare?: () => void;
  /** Registro sem review: só o botão dos Stories (sem curtir nem respostas). */
  shareOnly?: boolean;
}) {
  const s = strings.social;
  const interactions = useEntryInteractions(entryId);
  const like = useToggleEntryLike(entryId, ownEntry);
  const i = interactions.data;
  const liked = !!i?.likedByMe;

  if (shareOnly) {
    return onShare ? (
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.diary.entryShareStories}
          onPress={onShare}
          style={({ pressed }) => [styles.share, pressed && styles.pressed]}
        >
          <InstagramLogo size={20} color={semantic.onPrimary} weight="bold" />
        </Pressable>
      </View>
    ) : null;
  }

  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={s.like}
        accessibilityState={{ selected: liked }}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          like.mutate(!liked);
        }}
        style={({ pressed }) => [styles.barItem, liked && styles.barItemOn, pressed && styles.pressed]}
      >
        <Heart size={20} weight={liked ? 'fill' : 'regular'} color={liked ? semantic.liked : palette.ink700} />
        <Text variant="bodyStrong" style={styles.barText}>
          {i ? s.likes(i.likes) : s.like}
        </Text>
      </Pressable>
      <View style={styles.barItem} accessible accessibilityLabel={i ? s.repliesCount(i.comments) : s.replies}>
        <ChatCircle size={20} color={palette.ink700} />
        <Text variant="bodyStrong" style={styles.barText}>
          {i ? s.repliesCount(i.comments) : s.replies}
        </Text>
      </View>
      {onShare ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.diary.entryShareStories}
          onPress={onShare}
          style={({ pressed }) => [styles.share, pressed && styles.pressed]}
        >
          <InstagramLogo size={20} color={semantic.onPrimary} weight="bold" />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * As respostas, mais antigas primeiro. `hidden`: a review tem spoiler escondido para quem vê, então as
 * respostas também ficam fechadas até tocar (elas costumam comentar o que a review conta).
 */
export function ReplyList({ entryId, meId, hidden, onReveal }: { entryId: string; meId?: string; hidden: boolean; onReveal: () => void }) {
  const s = strings.social;
  const comments = useEntryComments(entryId);

  return (
    <View style={styles.replies}>
      <Text variant="overline" tone="secondary" accessibilityRole="header">
        {s.replies}
      </Text>
      {hidden && (comments.data?.length ?? 0) > 0 ? (
        <Pressable accessibilityRole="button" onPress={onReveal} style={({ pressed }) => [styles.spoiler, pressed && styles.pressed]}>
          <EyeSlash size={18} color={palette.ink700} />
          <Text variant="bodyStrong" style={styles.flex}>
            {s.repliesSpoiler}
          </Text>
        </Pressable>
      ) : comments.isPending ? (
        <SkeletonRows count={2} />
      ) : (comments.data?.length ?? 0) === 0 ? (
        <Text tone="muted">{s.repliesEmpty}</Text>
      ) : (
        <View style={styles.replyList}>
          {comments.data!.map((c) => (
            <ReplyItem key={c.id} entryId={entryId} comment={c} meId={meId} />
          ))}
        </View>
      )}
    </View>
  );
}

const SWIPE_WIDTH = 92;

/**
 * Uma resposta. Arrastar para a esquerda mostra "Apagar" (só em quem pode: quem escreveu ou o dono do
 * registro). Segurar vibra e abre o menu do app (Copiar texto, Apagar). Tocar abre o perfil de quem escreveu.
 */
function ReplyItem({ entryId, comment: c, meId }: { entryId: string; comment: EntryComment; meId?: string }) {
  const s = strings.social;
  const toast = useToast();
  const remove = useDeleteReply(entryId);
  const [menuOpen, setMenuOpen] = useState(false);
  const own = c.author.id === meId;

  const del = () => remove.mutate({ comment: c, ownReply: own }, { onError: () => toast(strings.common.genericError) });
  const copy = () => {
    void Clipboard.setStringAsync(c.text);
    toast(s.copied);
  };

  const body = (
    <View style={styles.reply}>
      <Avatar name={c.author.displayName || c.author.username} imageUrl={c.author.avatarUrl} size={34} />
      <View style={styles.flex}>
        <View style={styles.replyHead}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.shrink}>
            {c.author.displayName || c.author.username}
          </Text>
          <Text variant="caption" tone="muted">
            {timeAgo(c.createdAt)}
          </Text>
        </View>
        <Text tone="secondary" style={styles.replyText}>
          {c.text}
        </Text>
      </View>
    </View>
  );

  // Segurar: vibra, o item "afunda" um pouco e o menu do app abre. Antes era o menu de contexto nativo, mas a
  // "foto" que o iOS tira do item saía torta dentro da linha de arrastar (glitch ao segurar).
  const content = (
    <Pressable
      onPress={() => openProfile(c.author.username, 'link')}
      onLongPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setMenuOpen(true);
      }}
      delayLongPress={280}
      accessibilityHint={s.moreOptions}
      style={({ pressed }) => pressed && styles.replyPressed}
    >
      {body}
    </Pressable>
  );

  return (
    <>
      <Swipeable
        enabled={c.canDelete}
        friction={1.6}
        rightThreshold={SWIPE_WIDTH / 2}
        overshootRight={false}
        renderRightActions={(_progress, _translation, methods) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={s.deleteReply}
            onPress={() => {
              methods.close();
              del();
            }}
            style={styles.swipeDelete}
          >
            <Trash size={20} color={palette.surface} weight="bold" />
            <Text variant="caption" style={styles.swipeText}>
              {strings.common.remove}
            </Text>
          </Pressable>
        )}
      >
        <View style={styles.replyRow}>{content}</View>
      </Swipeable>
      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        options={[
          { key: 'copy', label: s.copyReply, icon: <Copy size={20} color={palette.ink900} />, onPress: copy },
          ...(c.canDelete
            ? [{ key: 'delete', label: s.deleteReply, destructive: true, icon: <Trash size={20} color={semantic.danger} />, onPress: del }]
            : []),
        ]}
      />
    </>
  );
}

/** Campo de resposta fixo embaixo, logo acima do teclado (o fundo continua por trás dele). */
export function ReplyComposer({
  entryId,
  ownEntry,
  ownerUsername,
  onSent,
  onFocus,
}: {
  entryId: string;
  ownEntry: boolean;
  /** Para o aviso "Só @fulano pode responder". */
  ownerUsername: string;
  onSent?: () => void;
  onFocus?: () => void;
}) {
  const s = strings.social;
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();
  const add = useAddReply(entryId, ownEntry);
  const interactions = useEntryInteractions(entryId);
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0 && !add.isPending;

  const footer = useAnimatedStyle(() => ({ paddingBottom: Math.max(keyboard.height.value, insets.bottom) + space.sm }));

  const send = () => {
    if (!canSend) return;
    add.mutate(text, {
      onSuccess: () => {
        setText('');
        onSent?.();
      },
      onError: () => toast(s.replyError),
    });
  };

  const i = interactions.data;
  if (i && !i.canReply && i.replyPolicy !== 'EVERYONE') {
    return (
      <Animated.View style={[styles.composer, styles.closed, footer]}>
        <LockSimple size={16} color={palette.ink500} />
        <Text variant="caption" tone="muted" style={styles.flex}>
          {s.repliesClosed(i.replyPolicy, ownerUsername)}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.composer, footer]}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={s.replyPlaceholder}
        placeholderTextColor={palette.ink500}
        accessibilityLabel={s.replyPlaceholder}
        maxLength={REPLY_MAX}
        onFocus={onFocus}
        multiline
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={s.send}
        disabled={!canSend}
        onPress={send}
        style={({ pressed }) => [styles.send, !canSend && styles.sendOff, pressed && styles.pressed]}
      >
        {add.isPending ? (
          <ActivityIndicator size="small" color={semantic.onPrimary} />
        ) : (
          <PaperPlaneRight size={18} weight="fill" color={semantic.onPrimary} />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  pressed: { opacity: 0.7 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  barItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  barItemOn: { backgroundColor: palette.rosa100, borderColor: palette.rosa300 },
  barText: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: palette.ink900 },
  share: {
    marginLeft: 'auto',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: semantic.primary,
  },
  replies: { gap: space.md },
  spoiler: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceSunken,
  },
  replyList: { gap: space.xs, marginHorizontal: -space.screenX },
  // A linha ocupa a largura toda (o arraste vai até a borda); o conteúdo volta para dentro da margem.
  replyRow: { paddingHorizontal: space.screenX, paddingVertical: space.sm, backgroundColor: semantic.background },
  reply: { flexDirection: 'row', gap: space.md },
  replyPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  swipeDelete: {
    width: SWIPE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: semantic.danger,
  },
  swipeText: { color: palette.surface, fontFamily: fonts.bodyHeavy },
  closed: { alignItems: 'center', paddingTop: space.md, minHeight: touch.minTarget },
  replyHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  replyText: { lineHeight: 22 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.screenX,
    paddingTop: space.sm,
    backgroundColor: semantic.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  input: {
    ...typeScale.body,
    flex: 1,
    minHeight: touch.minTarget,
    maxHeight: 120,
    paddingHorizontal: space.lg,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 22,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    color: palette.ink900,
  },
  send: {
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: touch.minTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: semantic.primary,
  },
  sendOff: { opacity: 0.4 },
});
