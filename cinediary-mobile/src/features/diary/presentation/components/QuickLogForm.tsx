import { ArrowCounterClockwise, BookmarkSimple, Check, EyeSlash, Heart, PencilSimple, UsersThree } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';

import type { SeriesStatus, TitleDetail } from '@/features/catalog/domain/title';
import { SeasonsSkeleton } from '@/features/catalog/presentation/components/Skeletons';
import { SeriesProgressSection } from '@/features/catalog/presentation/components/SeriesProgressSection';
import type { Actor } from '@/features/social/domain/social';
import { CompanionPicker } from '@/features/social/presentation/components/CompanionPicker';
import { strings } from '@/shared/i18n';
import { palette, radius, semantic, space, type as typeScale } from '@/shared/theme';
import { Button, Chip, IconButton, ListRow, PosterArt, StarRating, Text, useBottomSheet, useToast } from '@/shared/ui';
import { nav } from '@/shared/ui/navigation/nav';
import { useQuickLog } from '../../application/useQuickLog';
import type { EntryScope } from '../../domain/diary';
import { WatchedDateField } from './WatchedDateField';

const STATUSES: SeriesStatus[] = ['WATCHING', 'COMPLETED', 'DROPPED'];

/**
 * BU-02 · Registro rápido. Toque 1 abriu o sheet ("Assistido hoje" já vem marcado),
 * toque 2 é a estrela, toque 3 é "Registrar".
 * Estrutura (dentro do BottomSheet): o conteúdo rola e o botão fica FIXO embaixo, logo acima do
 * teclado. Escrevendo a review, a rolagem acompanha o texto, então dá para ver o que se digita e
 * registrar sem precisar rolar. `scope` (séries): registrar uma temporada ou um episódio.
 */
export function QuickLogForm({
  title,
  seasonsLoading = false,
  undated = false,
  scope = null,
  date,
  fromEntry,
  markedBy,
}: {
  title: TitleDetail;
  /** Data já escolhida (ex.: a do registro de quem te marcou). */
  date?: string;
  /** O registro de quem te marcou: ao registrar, o seu ganha "vi com" essa pessoa. */
  fromEntry?: string;
  /** Quem te marcou: já vem no "Vi com…" (sem precisar aprovar) e dá para tirar. */
  markedBy?: Actor;
  seasonsLoading?: boolean;
  scope?: EntryScope | null;
  /** Filme marcado como visto (onboarding/importação) ganhando a primeira data: o "rever" não liga sozinho. */
  undated?: boolean;
}) {
  const t = strings.diary;
  const c = strings.catalog;
  const toast = useToast();
  const sheet = useBottomSheet();
  const { draft, update, cta, isSeries, companions, setCompanions, submit, isSaving } = useQuickLog(title, { undated, scope, date, fromEntry, markedBy });
  const [showReview, setShowReview] = useState(false);
  const [showCompanions, setShowCompanions] = useState(false);
  const ct = strings.social.companions;
  const scrollRef = useRef<ScrollViewInstance>(null);
  const writing = useRef(false);
  // Teclado abriu para a review: rola até o fim, onde estão o campo e o texto digitado.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      if (writing.current) scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => sub.remove();
  }, []);
  // Parte da série (episódio/temporada) ou o filme: mostra data, rever e review.
  const datedLog = !!scope || (!isSeries && draft.watched);

  const ctaLabel = scope
    ? scope.episode
      ? t.ctaLogEpisode
      : t.ctaLogSeason
    : cta === 'log'
      ? t.ctaLog
      : cta === 'watchlist'
        ? t.ctaWatchlist
        : t.ctaSave;

  const onSubmit = async () => {
    try {
      const { cta: kind, companionsSaved } = await submit();
      // Fecha com a animação de descida do sheet (fora dele, volta normal).
      if (sheet) sheet.close();
      else nav.back();
      if (!companionsSaved) toast(ct.saveError);
      else toast(kind === 'log' ? t.loggedToast : kind === 'watchlist' ? t.watchlistToast : t.savedToast);
    } catch {
      toast(t.saveError, { actionLabel: strings.common.retry, onAction: () => void onSubmit() });
    }
  };

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.root}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          // A review cresce enquanto a pessoa digita: o fim continua à vista.
          if (writing.current) scrollRef.current?.scrollToEnd({ animated: false });
        }}
      >
        <View style={styles.header}>
          <PosterArt title={title.title} posterUrl={title.posterUrl} width={72} />
          <View style={styles.headerTexts}>
            <Text variant="h3" accessibilityRole="header" numberOfLines={3}>
              {title.title}
            </Text>
            {scope ? (
              <Text variant="bodyStrong" tone="secondary">
                {scope.episode ? t.scopeEpisode(scope.season, scope.episode) : t.scopeSeason(scope.season)}
              </Text>
            ) : title.year ? (
              <Text variant="caption" tone="muted">
                {title.year}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          {!isSeries && !scope && (
            <IconButton
              label={t.watched}
              accessibilityLabel={t.watched}
              active={draft.watched}
              variant="filled"
              icon={
                <Check size={22} weight={draft.watched ? 'bold' : 'regular'} color={draft.watched ? semantic.watched : palette.ink700} />
              }
              onPress={() => update({ watched: !draft.watched })}
            />
          )}
          <IconButton
            label={t.like}
            accessibilityLabel={t.like}
            active={draft.liked}
            variant="filled"
            icon={<Heart size={22} weight={draft.liked ? 'fill' : 'regular'} color={draft.liked ? semantic.liked : palette.ink700} />}
            onPress={() => update({ liked: !draft.liked })}
          />
          {!scope ? (
            <IconButton
              label={t.watchlist}
              accessibilityLabel={t.watchlist}
              active={draft.inWatchlist}
              variant="filled"
              icon={<BookmarkSimple size={22} weight={draft.inWatchlist ? 'fill' : 'regular'} color={palette.ink700} />}
              onPress={() => update({ inWatchlist: !draft.inWatchlist })}
            />
          ) : null}
        </View>

        {isSeries && (
          <View style={styles.statusRow}>
            <Text variant="overline" tone="secondary">
              {t.status}
            </Text>
            <View style={styles.chips}>
              {STATUSES.map((s) => (
                <Chip
                  key={s}
                  role="radio"
                  label={c.seriesStatus[s]}
                  accent={s === 'COMPLETED' ? 'salvia' : s === 'DROPPED' ? 'rosa' : 'terracota'}
                  selected={draft.seriesStatus === s}
                  onToggle={() => update({ seriesStatus: s })}
                  fill
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.center}>
          <StarRating value={draft.rating} onChange={(rating) => update({ rating })} />
        </View>

        {datedLog && (
          <>
            <WatchedDateField value={draft.watchedDate} onChange={(watchedDate) => update({ watchedDate })} />
            <ListRow
              icon={<ArrowCounterClockwise size={20} color={palette.ink700} />}
              label={t.rewatch}
              switchValue={draft.isRewatch}
              onSwitchChange={(isRewatch) => update({ isRewatch })}
            />
            {/* "Vi com…": opcional, fechado até tocar (não atrapalha os 3 toques do registro). */}
            <ListRow
              icon={<UsersThree size={20} color={palette.ink700} />}
              label={ct.row}
              hint={companions.length > 0 ? ct.withNames(ct.names(companions.map((c) => c.displayName || c.username))) : undefined}
              onPress={() => setShowCompanions((open) => !open)}
            />
            {showCompanions ? <CompanionPicker selected={companions} onChange={setCompanions} /> : null}
            {showReview ? (
              <TextInput
                style={styles.review}
                value={draft.reviewText}
                onChangeText={(reviewText) => update({ reviewText })}
                placeholder={t.reviewPlaceholder}
                placeholderTextColor={palette.ink500}
                accessibilityLabel={t.writeReview}
                onFocus={() => {
                  writing.current = true;
                }}
                onBlur={() => {
                  writing.current = false;
                }}
                multiline
                autoFocus
              />
            ) : (
              <ListRow icon={<PencilSimple size={20} color={palette.ink700} />} label={t.writeReview} onPress={() => setShowReview(true)} />
            )}
            {/* Só faz sentido com texto: sem review, não há o que esconder. */}
            {draft.reviewText.trim() ? (
              <ListRow
                icon={<EyeSlash size={20} color={palette.ink700} />}
                label={t.spoilerToggle}
                hint={t.spoilerToggleHint}
                switchValue={draft.containsSpoilers}
                onSwitchChange={(containsSpoilers) => update({ containsSpoilers })}
              />
            ) : null}
          </>
        )}

        {/*
        Episódios aqui mesmo, no sheet. Antes era um atalho que fazia nav.back() e logo em seguida
        push da página do título: o push caía durante a animação de fechar o formSheet e era descartado.
        Cada episódio salva na hora (como na página do título); o botão abaixo salva nota, curtida e status.
      */}
        {isSeries && (
          <View style={styles.statusRow}>
            <Text variant="overline" tone="secondary">
              {t.markEpisodes}
            </Text>
            {seasonsLoading ? <SeasonsSkeleton count={2} /> : <SeriesProgressSection title={title} embedded />}
          </View>
        )}
      </ScrollView>
      {/* Fora da rolagem: sempre visível, e logo acima do teclado quando ele abre. */}
      <View style={styles.footer}>
        <Button label={ctaLabel} loading={isSaving} onPress={onSubmit} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Altura do conteúdo, até o máximo do sheet (aí encolhe e rola).
  scroll: { flexGrow: 0, flexShrink: 1 },
  root: { gap: space.lg, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  footer: { paddingHorizontal: space.xl, paddingTop: space.sm },
  header: { flexDirection: 'row', gap: space.lg, alignItems: 'center' },
  headerTexts: { flex: 1, gap: space.xs },
  actions: { flexDirection: 'row', gap: space.sm },
  statusRow: { gap: space.sm },
  chips: { flexDirection: 'row', gap: space.sm },
  center: { alignItems: 'center' },
  review: {
    ...typeScale.body,
    minHeight: 96,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    backgroundColor: palette.surface,
    color: palette.ink900,
    textAlignVertical: 'top',
  },
});
