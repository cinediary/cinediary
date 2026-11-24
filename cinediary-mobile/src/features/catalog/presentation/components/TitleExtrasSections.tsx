import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { CaretRight } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { analytics } from '@/shared/analytics/analytics';
import { formatFullDate, parseIsoDate, strings } from '@/shared/i18n';
import { palette, radius, space } from '@/shared/theme';
import { Avatar, Rail, SectionHeader, Text, useRailItemWidth, useToast } from '@/shared/ui';
import { nav } from '@/shared/ui/navigation/nav';
import type { TitleExtras } from '../../domain/extras';
import type { MediaType } from '../../domain/title';
import { openPerson, openTitleCredits } from '../navigation';
import { RAIL_PEOPLE } from './CastSection';
import { SeeAllBubble } from './SeeAllBubble';
import { TitleRail } from './TitleRail';

const PROVIDER_LOGO = 40;
const WATCH_KINDS = ['stream', 'rent', 'buy'] as const;

/**
 * "Onde assistir · <país>": streaming, aluguel e compra no país do aparelho, cada um numa fileira de
 * logos redondos (fileira vazia some), com o crédito ao JustWatch (obrigatório). Tocar abre a página do
 * TMDB com todas as opções. Sem dados, a seção some.
 */
export function WatchProvidersSection({
  extras,
  mediaType,
  tmdbId,
}: {
  extras: TitleExtras;
  mediaType: MediaType;
  tmdbId: number;
}) {
  const t = strings.catalog;
  const toast = useToast();
  const watch = extras.watchProviders;
  // Uma vez por título aberto: uma nova busca dos extras (ex.: voltar ao app depois de 1 h) não conta de novo.
  const tracked = useRef<string | null>(null);
  useEffect(() => {
    const key = `${mediaType}:${tmdbId}`;
    if (watch && tracked.current !== key) {
      tracked.current = key;
      analytics.track('watch_provider_viewed', {
        tmdb_id: tmdbId,
        media_type: mediaType,
        stream_count: watch.stream.length,
        rent_count: watch.rent.length,
        buy_count: watch.buy.length,
      });
    }
  }, [tmdbId, mediaType, watch]);
  if (!watch) return null;

  const rows = WATCH_KINDS.filter((kind) => watch[kind].length > 0);
  if (rows.length === 0) return null;
  const link = watch.link;
  const label = rows.map((kind) => `${t.watchKind[kind]}: ${watch[kind].map((p) => p.name).join(', ')}`).join('. ');
  return (
    <View style={styles.section}>
      <SectionHeader title={t.watchTitle(watch.regionName)} />
      <Pressable
        accessibilityRole={link ? 'link' : undefined}
        accessibilityLabel={label}
        accessibilityHint={link ? t.watchOpen : undefined}
        disabled={!link}
        onPress={() => {
          if (link) WebBrowser.openBrowserAsync(link).catch(() => toast(strings.common.genericError));
        }}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        {rows.map((kind) => (
          <View key={kind} style={styles.watchRow}>
            <Text variant="caption" tone="secondary" style={styles.watchLabel}>
              {t.watchKind[kind]}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providers}>
              {watch[kind].map((p) =>
                p.logoUrl ? (
                  <Image key={p.id} source={{ uri: p.logoUrl }} style={styles.providerLogo} contentFit="cover" />
                ) : (
                  <Avatar key={p.id} name={p.name} size={PROVIDER_LOGO} background={palette.salvia300} />
                ),
              )}
            </ScrollView>
          </View>
        ))}
        <View style={styles.watchFooter}>
          <Text variant="caption" tone="muted">
            {t.watchCredit}
          </Text>
          {link ? <CaretRight size={12} color={palette.ink500} /> : null}
        </View>
      </Pressable>
    </View>
  );
}

/** Equipe principal (roteiro, fotografia, trilha; série: criação), tocável como o elenco. */
export function CrewSection({
  extras,
  mediaType,
  tmdbId,
  titleName,
}: {
  extras: TitleExtras;
  mediaType: MediaType;
  tmdbId: number;
  titleName: string;
}) {
  const t = strings.catalog;
  const itemWidth = useRailItemWidth(4.4);
  if (extras.crew.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader title={t.crewTitle} />
      <Rail itemWidth={itemWidth}>
        {extras.crew.slice(0, RAIL_PEOPLE).map((c) => (
          <Pressable
            key={`${c.job}-${c.personId}`}
            accessibilityRole="button"
            accessibilityLabel={`${c.name}, ${t.crewJob[c.job] ?? c.job}`}
            accessibilityHint={t.openPerson(c.name)}
            onPress={() => openPerson(c.personId)}
            style={({ pressed }) => [styles.person, { width: itemWidth }, pressed && styles.pressed]}
          >
            <Avatar name={c.name} imageUrl={c.photoUrl} size={64} background={palette.salvia300} />
            <Text variant="caption" style={styles.personName} numberOfLines={2}>
              {c.name}
            </Text>
            <Text variant="caption" tone="muted" style={styles.center} numberOfLines={1}>
              {t.crewJob[c.job] ?? c.job}
            </Text>
          </Pressable>
        ))}
        {extras.crew.length > RAIL_PEOPLE ? (
          <SeeAllBubble width={itemWidth} onPress={() => openTitleCredits(mediaType, tmdbId, titleName, 'crew')} />
        ) : null}
      </Rail>
    </View>
  );
}

/** "Sobre": lançamento, país e produtoras (cada produtora abre a página com os filmes dela). */
export function AboutSection({ extras, mediaType }: { extras: TitleExtras; mediaType: MediaType }) {
  const t = strings.catalog;
  const rows: [string, string][] = [];
  if (extras.releaseDate)
    rows.push([mediaType === 'SERIES' ? t.premiere : t.releaseDate, formatFullDate(parseIsoDate(extras.releaseDate))]);
  if (extras.originCountries.length > 0) rows.push([t.origin(extras.originCountries.length), extras.originCountries.join(', ')]);
  if (rows.length === 0 && extras.companies.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={t.about} />
      <View style={styles.card}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text variant="caption" tone="secondary" style={styles.label}>
              {label}
            </Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
        {extras.companies.length > 0 ? (
          <View style={styles.companies}>
            <Text variant="caption" tone="secondary">
              {t.production}
            </Text>
            <View style={styles.chips}>
              {extras.companies.map((c) => (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityHint={t.openCompany(c.name)}
                  onPress={() => nav.push({ pathname: '/company/[companyId]', params: { companyId: String(c.id) } })}
                  style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                >
                  <Text variant="caption" style={styles.chipText}>
                    {c.name}
                  </Text>
                  <CaretRight size={12} color={palette.ink500} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Mesma franquia (ex.: Sorria 1, 2, 3) e similares (recomendações do TMDB). */
export function RelatedSections({ extras }: { extras: TitleExtras }) {
  const t = strings.catalog;
  return (
    <>
      {extras.collectionName ? (
        <TitleRail title={t.collectionTitle(extras.collectionName)} items={extras.collection} section="collection" />
      ) : null}
      <TitleRail title={t.similarTitle} items={extras.similar} section="similar" />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md },
  person: { alignItems: 'center', gap: space.xs },
  personName: { textAlign: 'center', fontFamily: 'Nunito_700Bold', color: palette.ink900 },
  center: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
  card: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  row: { flexDirection: 'row', gap: space.md },
  label: { width: 88, paddingTop: 2 },
  value: { flex: 1 },
  companies: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceSunken,
  },
  chipText: { color: palette.ink900, fontFamily: 'Nunito_700Bold' },
  watchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  watchLabel: { width: 72 },
  providers: { gap: space.sm },
  providerLogo: {
    width: PROVIDER_LOGO,
    height: PROVIDER_LOGO,
    borderRadius: PROVIDER_LOGO / 2,
    borderWidth: 1,
    borderColor: palette.border,
  },
  watchFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
