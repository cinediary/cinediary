import { ArrowCounterClockwise, ChatCircle, EyeSlash, Heart, PencilSimple, UsersThree } from 'phosphor-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useMe } from '@/features/auth/application/profileQueries';
import { saveEntryCompanions, useEntryCompanions } from '@/features/social/application/companionQueries';
import type { Actor } from '@/features/social/domain/social';
import { CompanionSheet } from '@/features/social/presentation/components/CompanionSheet';
import { formatNumber, strings, toIsoDate } from '@/shared/i18n';
import { palette, semantic, space } from '@/shared/theme';
import {
  ActionSheet,
  Button,
  IconButton,
  ListRow,
  PosterArt,
  StarRating,
  Text,
  TextEditSheet,
  useBottomSheet,
  useOverlay,
  useToast,
} from '@/shared/ui';
import { useUpdateEntry } from '../../application/diaryQueries';
import {
  limitReview,
  REPLY_POLICIES,
  REVIEW_MAX,
  reviewBlocksSave,
  type DiaryEntry,
  type EntryChanges,
  type EntryReplyChoice,
} from '../../domain/diary';
import { WatchedDateField } from './WatchedDateField';
import { scopeLabel } from '../scopeLabel';

/**
 * Editar uma entrada: data, nota, curtida, rever, review e "Contém spoiler". Mesma estrutura do
 * registro rápido: o conteúdo rola e "Salvar alterações" fica fixo embaixo, logo acima do teclado.
 */
export function EntryEditForm({ entry }: { entry: DiaryEntry }) {
  const t = strings.diary;
  const toast = useToast();
  const sheet = useBottomSheet();
  const update = useUpdateEntry(entry.id);
  const [draft, setDraft] = useState<EntryChanges>(() => ({
    // Entrada sem data (onboarding): editar já dá a primeira data, hoje.
    watchedDate: entry.watchedDate ?? toIsoDate(new Date()),
    rating: entry.rating,
    liked: entry.liked,
    isRewatch: entry.isRewatch,
    reviewText: entry.reviewText ?? '',
    containsSpoilers: entry.containsSpoilers,
    replyPolicy: entry.replyPolicy ?? 'DEFAULT',
  }));
  const me = useMe();
  const [pickingReplies, setPickingReplies] = useState(false);
  const ac = strings.account;
  const accountDefault = me.data?.defaultReplyPolicy ?? 'EVERYONE';
  const replyLabel = (choice: EntryReplyChoice) =>
    choice === 'DEFAULT' ? ac.replyDefault(ac.replyPolicies[accountDefault]) : ac.replyPolicies[choice];
  const set = (patch: Partial<EntryChanges>) => setDraft((d) => ({ ...d, ...patch }));
  // "Vi com…": começa com quem já está marcado (esperando ou aceito); null = a pessoa ainda não mexeu.
  // Só abre depois de carregar quem já está marcado: escolher a partir de uma lista vazia e salvar apagaria as
  // marcações que já existem.
  const ct = strings.social.companions;
  const marked = useEntryCompanions(entry.id);
  const [picked, setPicked] = useState<Actor[] | null>(null);
  const companions: Actor[] = picked ?? marked.data?.companions ?? [];
  const companionsReady = marked.isSuccess;
  const hasReview = !!draft.reviewText?.trim();

  // "Vi com…" e a review abrem em cartões colados no teclado, por cima do sheet (como no registro rápido).
  const overlay = useOverlay();
  const openCompanions = () => overlay.show(<CompanionSheet selected={companions} onDone={setPicked} onClose={overlay.hide} />);
  const openReview = () =>
    overlay.show(
      <TextEditSheet
        title={t.reviewTitle}
        initialText={draft.reviewText ?? ''}
        maxLength={REVIEW_MAX}
        placeholder={t.reviewPlaceholder}
        saveLabel={strings.common.done}
        allowEmpty
        alwaysShowCount
        // Review importada maior que o limite: aparece inteira e só dá para apagar até caber (sem maxLength
        // nativo, que no Android a cortaria ao abrir). "Pronto" só libera quando cabe ou continua igual.
        limit={limitReview}
        canSave={(text) => !reviewBlocksSave(text, entry.reviewText)}
        overLimitHint={t.reviewOverLimit(formatNumber(REVIEW_MAX))}
        onSave={(reviewText) => set({ reviewText })}
        onClose={overlay.hide}
      />,
    );

  const onSave = async () => {
    try {
      const review = draft.reviewText?.trim() || null;
      await update.mutateAsync({ ...draft, reviewText: review, containsSpoilers: !!review && draft.containsSpoilers });
      const companionsSaved = picked === null || (await saveEntryCompanions(entry.id, picked.map((c) => c.username)));
      sheet?.close();
      toast(companionsSaved ? t.entrySaved : ct.saveError);
    } catch {
      toast(t.saveError, { actionLabel: strings.common.retry, onAction: () => void onSave() });
    }
  };

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <PosterArt title={entry.title.title} posterUrl={entry.title.posterUrl} width={56} />
          <View style={styles.flex}>
            <Text variant="overline" tone="secondary">
              {t.entryEditTitle}
            </Text>
            <Text variant="h3" numberOfLines={2}>
              {entry.title.title}
            </Text>
            {entry.scope ? (
              <Text variant="caption" tone="secondary">
                {scopeLabel(entry.scope)}
              </Text>
            ) : null}
          </View>
          <IconButton
            label={t.like}
            accessibilityLabel={t.like}
            active={draft.liked}
            variant="filled"
            icon={<Heart size={22} weight={draft.liked ? 'fill' : 'regular'} color={draft.liked ? semantic.liked : palette.ink700} />}
            onPress={() => set({ liked: !draft.liked })}
          />
        </View>

        <View style={styles.center}>
          <StarRating value={draft.rating ?? 0} onChange={(rating) => set({ rating: rating > 0 ? rating : null })} />
        </View>

        <WatchedDateField value={draft.watchedDate} onChange={(watchedDate) => set({ watchedDate })} />
        <ListRow
          icon={<ArrowCounterClockwise size={20} color={palette.ink700} />}
          label={t.rewatch}
          switchValue={draft.isRewatch}
          onSwitchChange={(isRewatch) => set({ isRewatch })}
        />
        <ListRow
          icon={<UsersThree size={20} color={palette.ink700} />}
          label={ct.row}
          hint={companions.length > 0 ? ct.withNames(ct.names(companions.map((c) => c.displayName || c.username))) : undefined}
          // Só abre depois de carregar quem já está marcado (ver `companionsReady`).
          onPress={companionsReady ? openCompanions : undefined}
        />
        {/* A review numa linha: sem texto, "Escrever review"; com texto, o começo dele. */}
        <ListRow
          icon={<PencilSimple size={20} color={palette.ink700} />}
          label={hasReview ? t.reviewTitle : t.writeReview}
          hint={draft.reviewText?.trim() || undefined}
          hintLines={2}
          onPress={openReview}
        />
        {hasReview ? (
          <ListRow
            icon={<EyeSlash size={20} color={palette.ink700} />}
            label={t.spoilerToggle}
            hint={t.spoilerToggleHint}
            switchValue={draft.containsSpoilers}
            onSwitchChange={(containsSpoilers) => set({ containsSpoilers })}
          />
        ) : null}
        <ListRow
          icon={<ChatCircle size={20} color={palette.ink700} />}
          label={ac.replyPolicy}
          hint={replyLabel(draft.replyPolicy)}
          onPress={() => setPickingReplies(true)}
        />
      </ScrollView>
      <ActionSheet
        visible={pickingReplies}
        title={ac.replyPolicy}
        onClose={() => setPickingReplies(false)}
        options={(['DEFAULT', ...REPLY_POLICIES] as EntryReplyChoice[]).map((choice) => ({
          key: choice,
          label: replyLabel(choice),
          hint: choice === 'DEFAULT' ? ac.replyDefaultHint : ac.replyPolicyHints[choice],
          selected: draft.replyPolicy === choice,
          onPress: () => set({ replyPolicy: choice }),
        }))}
      />
      <View style={styles.footer}>
        <Button
          label={t.entrySave}
          loading={update.isPending}
          disabled={reviewBlocksSave(draft.reviewText ?? '', entry.reviewText)}
          onPress={onSave}
        />
      </View>
      {overlay.node}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 1 },
  root: { gap: space.lg, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  footer: { paddingHorizontal: space.xl, paddingTop: space.sm },
  header: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
  center: { alignItems: 'center' },
});
