import { Faders } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { strings } from '@/shared/i18n';
import { fonts, palette, radius, semantic, space } from '@/shared/theme';
import { Button, Chip, OverlaySheet, SearchField, SegmentedControl, Text } from '@/shared/ui';
import {
  clearSheetFilters,
  RATING_STEPS,
  sheetFilterCount,
  type DiaryFilterOptions,
  type DiaryFilters,
} from '../../domain/diaryFilters';

/**
 * Movimento dos filtros: curto e com a mesma curva do resto do app (a do SegmentedControl), sem molas nem
 * exageros. Entrar é um pouco mais lento que sair, como no iOS.
 */
const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);
const SLIDE = { duration: 260, easing: EASE };
export const enter = FadeIn.duration(220).easing(EASE);
export const leave = FadeOut.duration(140).easing(EASE);
export const layout = LinearTransition.duration(240).easing(EASE);

const t = strings.diary.filters;
const monthShort = strings.common.monthsShort;
export const ratingLabel = (r: number) => (r >= 5 ? t.ratingExact : t.ratingFrom(String(r).replace('.', ',')));

type Patch = (p: Partial<DiaryFilters>) => void;
const MAX_QUERY = 100;

/**
 * Topo do "Meu diário" (#147, opção D do Design System): a busca com o botão de filtros no canto e, embaixo,
 * os anos como abas (com os meses do ano escolhido) e o resumo do que está ligado no botão.
 */
export function DiaryFilterBar({
  filters,
  options,
  onChange,
  onOpenSheet,
}: {
  filters: DiaryFilters;
  options: DiaryFilterOptions;
  onChange: Patch;
  onOpenSheet: () => void;
}) {
  const count = sheetFilterCount(filters);
  const summary = [
    filters.type === 'MOVIE' ? t.movies : filters.type === 'SERIES' ? t.series : null,
    filters.genre?.name ?? null,
    filters.minRating !== null ? ratingLabel(filters.minRating) : null,
    filters.rewatch ? t.rewatch : null,
    filters.withReview ? t.withReview : null,
  ].filter(Boolean);

  return (
    <Animated.View layout={layout} style={styles.bar}>
      <View style={styles.searchRow}>
        <View style={styles.flex}>
          {/* O servidor aceita até 100 caracteres na busca (DiaryFilter). */}
          <SearchField
            value={filters.query}
            onChangeText={(query) => onChange({ query })}
            placeholder={t.search}
            maxLength={MAX_QUERY}
          />
        </View>
        <FilterButton count={count} onPress={onOpenSheet} />
      </View>
      {options.years.length ? (
        <YearTabs years={options.years} year={filters.year} onChange={(year) => onChange({ year, month: null })} />
      ) : null}
      {filters.year !== null ? (
        <Animated.View entering={enter} exiting={leave}>
          <MonthPills month={filters.month} onChange={(month) => onChange({ month })} />
        </Animated.View>
      ) : null}
      {summary.length ? (
        <Animated.View entering={enter} exiting={leave} style={styles.summary}>
          <Text variant="caption" style={styles.summaryText} numberOfLines={1}>
            {summary.join(' · ')}
          </Text>
          {/* "Limpar" tira só o que está no botão: o ano escolhido e a busca continuam. */}
          <Pressable accessibilityRole="button" onPress={() => onChange(clearSheetFilters(filters))} hitSlop={10}>
            <Text variant="caption" tone="link">
              {t.clear}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/** Botão de filtros redondo; com filtros ligados, fica em terracota e mostra quantos. */
function FilterButton({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.open(count)}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.filterButton, count > 0 && styles.on, pressed && styles.pressed]}
    >
      <Faders size={20} color={count ? palette.terracota700 : palette.ink900} />
      {count ? (
        <Animated.View entering={enter} exiting={leave} style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

/**
 * Os anos como abas (Tudo · 2026 · 2025…). O traço terracota desliza até a aba tocada (em vez de aparecer
 * seco do outro lado), e a aba escolhida entra na tela se estava escondida na rolagem.
 */
export function YearTabs({
  years,
  year,
  onChange,
}: {
  years: number[];
  year: number | null;
  onChange: (y: number | null) => void;
}) {
  const reduce = useReducedMotion();
  const tabs = [null, ...years];
  const layouts = useRef(new Map<string, { x: number; width: number }>());
  const scroll = useRef<ScrollViewInstance>(null);
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const [measured, setMeasured] = useState(false);
  const key = (y: number | null) => (y === null ? 'all' : String(y));

  const moveTo = (y: number | null, animate: boolean) => {
    const l = layouts.current.get(key(y));
    if (!l) return;
    const timing = animate && !reduce ? SLIDE : { duration: 0 };
    x.set(withTiming(l.x, timing));
    width.set(withTiming(l.width, timing));
    scroll.current?.scrollTo({ x: Math.max(0, l.x - space.xl), animated: animate });
  };

  useEffect(() => {
    moveTo(year, true);
    // moveTo lê só refs e shared values; roda quando o ano muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const onTabLayout = (y: number | null) => (e: LayoutChangeEvent) => {
    layouts.current.set(key(y), { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width });
    if (y === year) {
      moveTo(y, false);
      setMeasured(true);
    }
  };

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: width.value }));

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bleed}
      contentContainerStyle={styles.years}
    >
      <View style={styles.yearsInner}>
        {tabs.map((y) => {
          const selected = y === year;
          return (
            <Pressable
              key={key(y)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onLayout={onTabLayout(y)}
              onPress={() => onChange(y)}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Text style={[styles.year, selected && styles.yearOn]}>{y ?? t.all}</Text>
            </Pressable>
          );
        })}
        {measured ? <Animated.View pointerEvents="none" style={[styles.indicator, indicator]} /> : null}
      </View>
    </ScrollView>
  );
}

/** Os meses do ano escolhido; tocar de novo no mesmo mês volta para o ano inteiro. */
export function MonthPills({ month, onChange }: { month: number | null; onChange: (m: number | null) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.pills}>
      {monthShort.map((m, i) => {
        const selected = month === i + 1;
        return (
          <Pressable
            key={m}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(selected ? null : i + 1)}
            style={({ pressed }) => [styles.pill, selected && styles.on, pressed && styles.pressed]}
          >
            <Text variant="caption" style={[styles.pillText, selected && styles.pillTextOn]}>
              {m}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/**
 * As opções do botão de filtros numa folha. Mexe num rascunho e mostra quantos registros vão ficar ("Ver 12
 * registros"): a lista só muda ao confirmar. `useCount` conta o rascunho (no app, o servidor; no DS, na hora).
 */
export function DiaryFilterSheet({
  initial,
  options,
  useCount,
  onApply,
  onClose,
}: {
  initial: DiaryFilters;
  options: DiaryFilterOptions;
  useCount: (draft: DiaryFilters) => number | undefined;
  onApply: (f: DiaryFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const set: Patch = (p) => setDraft((d) => ({ ...d, ...p }));
  const count = useCount(draft);
  const both = options.movies > 0 && options.series > 0;

  return (
    <OverlaySheet
      title={t.title}
      onClose={onClose}
      footer={
        <View style={styles.sheetFooter}>
          <Button label={t.clear} variant="ghost" onPress={() => setDraft(clearSheetFilters(draft))} />
          <View style={styles.flex}>
            <Button
              label={count === undefined ? t.apply : count === 0 ? t.showNone : t.show(count)}
              disabled={count === 0}
              onPress={() => {
                onApply(draft);
                onClose();
              }}
            />
          </View>
        </View>
      }
    >
      <View style={styles.sheet}>
        {both ? (
          <Section title={t.type}>
            <SegmentedControl
              options={[
                { value: 'ALL', label: t.typeAll },
                { value: 'MOVIE', label: t.movies },
                { value: 'SERIES', label: t.series },
              ]}
              value={draft.type}
              onChange={(type) => set({ type })}
            />
          </Section>
        ) : null}
        <Section title={t.rating}>
          <View style={styles.wrap}>
            {RATING_STEPS.map((r) => (
              <Chip
                key={r}
                role="radio"
                label={ratingLabel(r)}
                selected={draft.minRating === r}
                onToggle={() => set({ minRating: draft.minRating === r ? null : r })}
              />
            ))}
          </View>
        </Section>
        {options.genres.length ? (
          <Section title={t.genre}>
            <View style={styles.wrap}>
              {options.genres.map((g) => (
                <Chip
                  key={g.id}
                  role="radio"
                  label={g.name}
                  selected={draft.genre?.id === g.id}
                  onToggle={() => set({ genre: draft.genre?.id === g.id ? null : { id: g.id, name: g.name } })}
                />
              ))}
            </View>
          </Section>
        ) : null}
        <Section title={t.more}>
          <View style={styles.wrap}>
            <Chip label={t.rewatch} selected={draft.rewatch} onToggle={() => set({ rewatch: !draft.rewatch })} />
            <Chip label={t.withReview} selected={draft.withReview} onToggle={() => set({ withReview: !draft.withReview })} />
          </View>
        </Section>
      </View>
    </OverlaySheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="overline" tone="secondary">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { gap: space.md },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  on: { backgroundColor: palette.terracota100, borderColor: palette.terracota100 },
  pressed: { opacity: 0.7 },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: semantic.primary,
  },
  badgeText: { color: semantic.onPrimary, fontFamily: fonts.bodyHeavy, fontSize: 11, lineHeight: 14 },
  bleed: { marginHorizontal: -space.screenX },
  years: { paddingHorizontal: space.screenX },
  yearsInner: { flexDirection: 'row', gap: space.lg, paddingBottom: 6 },
  year: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26, color: palette.ink500 },
  yearOn: { color: palette.ink900 },
  indicator: { position: 'absolute', left: 0, bottom: 0, height: 2, borderRadius: 1, backgroundColor: palette.terracota500 },
  pills: { paddingHorizontal: space.screenX, gap: space.sm },
  pill: {
    height: 34,
    paddingHorizontal: space.md,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  pillText: { color: palette.ink900, fontFamily: fonts.bodyHeavy },
  pillTextOn: { color: palette.terracota700 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  summaryText: { flex: 1, color: palette.terracota700, fontFamily: fonts.bodyHeavy },
  sheet: { gap: space.xl },
  section: { gap: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  sheetFooter: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
