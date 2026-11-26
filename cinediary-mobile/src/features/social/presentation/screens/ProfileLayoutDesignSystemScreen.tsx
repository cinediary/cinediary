import { createContext, useContext, useState, type ReactNode } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn } from 'react-native-reanimated';

import { EntryRow } from '@/features/diary/presentation/components/DiaryTimeline';
import { SAMPLE_DIARY } from '@/features/diary/presentation/dev/sampleDiary';
import { ListCard } from '@/features/lists/presentation/components/ListViews';
import { SAMPLE_LISTS } from '@/features/lists/presentation/dev/sampleLists';
import { StatCards } from '@/features/stats/presentation/components/StatCards';
import { fonts, radius, space, makeStyles } from '@/shared/theme';
import { Button, PosterCard, Screen, SectionHeader, SegmentedControl, Text, UnderlineTabs, useGridItemWidth } from '@/shared/ui';
import { ProfileHeader } from '../components/ProfileHeader';

type Layout = 'scroll' | 'tabs' | 'hybrid';

const LAYOUTS = [
  { value: 'scroll', label: 'A · Rolagem' },
  { value: 'tabs', label: 'B · Abas' },
  { value: 'hybrid', label: 'C · Resumo + abas' },
] as const;

const HINTS: Record<Layout, string> = {
  scroll:
    'Tudo numa rolagem só, uma seção depois da outra: favoritos, números, recentes, listas, marcados e tags. Simples, mas o perfil fica comprido.',
  tabs: 'Abas logo abaixo do topo (Perfil · Diário · Listas · Marcados). Cada aba mostra uma coisa; o perfil fica curto e organizado.',
  hybrid: 'O que te define fica sempre à vista (favoritos e números). Embaixo, abas para as coleções: Listas · Marcados · Tags.',
};

type Viewer = 'me' | 'other';

const VIEWERS = [
  { value: 'me', label: 'Meu perfil' },
  { value: 'other', label: 'Perfil de outra pessoa' },
] as const;

/** Quem é o dono do perfil na prévia: você (Editar perfil) ou outra pessoa (Seguir, "Segue você"). */
const PEOPLE = {
  me: {
    name: 'Edu Dantas',
    username: 'edu',
    pronouns: 'he',
    cover: 'https://image.tmdb.org/t/p/w780/1esAE8sLJRWWFsLLeh5r3g2WanI.jpg',
    bio: 'Cinéfilo de fim de semana. Terror, drama e tudo que a Greta Gerwig fizer.',
  },
  other: {
    name: 'Maria Lima',
    username: 'maria',
    pronouns: 'she',
    cover: 'https://image.tmdb.org/t/p/w780/nlPCdZlHtRNcF6C9hzUH4ebmV1w.jpg',
    bio: 'Musicais, romance e qualquer coisa com o Ryan Gosling. Sempre no cinema de rua.',
  },
} as const;

const ViewerContext = createContext<Viewer>('me');
const STATS = { totalMoviesWatched: 1998, totalSeriesWatched: 42, averageRating: 3.9, topGenres: [], moviesPerMonth: [] };
const FAVORITES = SAMPLE_LISTS[1].items.slice(0, 4).map((i) => i.title);
const TAGS = [
  { name: 'cinema-em-casa', count: 18 },
  { name: 'com-a-família', count: 9 },
  { name: 'maratona', count: 6 },
  { name: 'festival', count: 4 },
  { name: 'chorei', count: 3 },
];
/** Registros em que um amigo te marcou ("Vi com…"). */
const TAGGED = SAMPLE_DIARY.slice(1, 4).map((entry, i) => ({ entry, i }));
/** Quem marcou: no seu perfil, amigos te marcaram; no da Maria, você e outros amigos marcaram ela. */
const TAGGERS: Record<Viewer, string[]> = { me: ['Maria Lima', 'João', 'Ana Paula'], other: ['Você', 'João', 'Ana Paula'] };

/**
 * Design System da estrutura do perfil (#17), só em desenvolvimento: três jeitos de organizar o perfil com tudo
 * o que ele vai ter (favoritos, números, diário recente, listas, marcados e, mais para frente, tags).
 */
export function ProfileLayoutDesignSystemScreen() {
  const styles = useStyles();
  const [layout, setLayout] = useState<Layout>('hybrid');
  const [viewer, setViewer] = useState<Viewer>('me');
  const [following, setFollowing] = useState(false);
  const person = PEOPLE[viewer];

  return (
    <Screen scroll edges={[]}>
      <SegmentedControl options={LAYOUTS} value={layout} onChange={setLayout} />
      <SegmentedControl options={VIEWERS} value={viewer} onChange={setViewer} />
      <Text variant="caption" tone="muted">
        {HINTS[layout]}
      </Text>
      <ViewerContext.Provider value={viewer}>
        {/* key: trocar de pessoa redesenha a prévia (a capa é outra). */}
        <View key={viewer} style={styles.device}>
          <ProfileHeader
            name={person.name}
            username={person.username}
            avatarUrl={null}
            headerUrl={person.cover}
            pronouns={person.pronouns}
            bio={person.bio}
            isPrivate={false}
            followsYou={viewer === 'other'}
            titles={viewer === 'me' ? 2040 : 612}
            followers={viewer === 'me' ? 128 : 341}
            following={viewer === 'me' ? 96 : 180}
            canOpenLists={false}
            actions={
              viewer === 'me' ? (
                <Button label="Editar perfil" variant="secondary" onPress={() => {}} />
              ) : (
                <View style={styles.flex}>
                  <Button
                    label={following ? 'Seguindo' : 'Seguir'}
                    variant={following ? 'secondary' : 'primary'}
                    onPress={() => setFollowing((f) => !f)}
                  />
                </View>
              )
            }
          />
          {layout === 'scroll' ? <ScrollLayout /> : layout === 'tabs' ? <TabsLayout /> : <HybridLayout />}
        </View>
      </ViewerContext.Provider>
    </Screen>
  );
}

function ScrollLayout() {
  const styles = useStyles();
  return (
    <View style={styles.sections}>
      <Favorites />
      <StatCards stats={STATS} />
      <Recent />
      <Section title="Listas">
        <ListsRail />
      </Section>
      <Section title="Marcados">
        <Tagged />
      </Section>
      <Section title="Tags">
        <Tags />
      </Section>
    </View>
  );
}

function TabsLayout() {
  const styles = useStyles();
  const [tab, setTab] = useState<'profile' | 'diary' | 'lists' | 'tagged'>('profile');
  return (
    <View style={styles.sections}>
      <UnderlineTabs
        tabs={[
          { value: 'profile', label: 'Perfil' },
          { value: 'diary', label: 'Diário' },
          { value: 'lists', label: 'Listas' },
          { value: 'tagged', label: 'Marcados' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <Fade key={tab}>
        {tab === 'profile' ? (
          <View style={styles.sections}>
            <Favorites />
            <StatCards stats={STATS} />
            <Section title="Tags">
              <Tags />
            </Section>
          </View>
        ) : tab === 'diary' ? (
          <Recent bare />
        ) : tab === 'lists' ? (
          <ListsGrid />
        ) : (
          <Tagged />
        )}
      </Fade>
    </View>
  );
}

function HybridLayout() {
  const styles = useStyles();
  const [tab, setTab] = useState<'lists' | 'tagged' | 'tags'>('lists');
  return (
    <View style={styles.sections}>
      <Favorites />
      <StatCards stats={STATS} />
      <Recent />
      <UnderlineTabs
        tabs={[
          { value: 'lists', label: 'Listas' },
          { value: 'tagged', label: 'Marcados' },
          { value: 'tags', label: 'Tags' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <Fade key={tab}>{tab === 'lists' ? <ListsGrid /> : tab === 'tagged' ? <Tagged /> : <Tags />}</Fade>
    </View>
  );
}

/** Troca de aba: o conteúdo novo entra com um fade curto (sem deslizar a tela). */
function Fade({ children }: { children: ReactNode }) {
  return <Animated.View entering={FadeIn.duration(200).easing(Easing.bezier(0.25, 0.1, 0.25, 1))}>{children}</Animated.View>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <SectionHeader title={title} actionLabel="Ver tudo" onAction={() => {}} />
      {children}
    </View>
  );
}

function Favorites() {
  const styles = useStyles();
  const width = useGridItemWidth(4);
  return (
    <View style={styles.section}>
      <SectionHeader title="Favoritos" />
      <View style={styles.row}>
        {FAVORITES.map((t) => (
          <PosterCard key={t.id} title={t.title} posterUrl={t.posterUrl} width={width} />
        ))}
      </View>
    </View>
  );
}

function Recent({ bare = false }: { bare?: boolean }) {
  const styles = useStyles();
  const rows = SAMPLE_DIARY.slice(0, bare ? 8 : 3).map((e) => (
    <EntryRow key={e.id} entry={e} day={Number(e.watchedDate!.slice(8, 10))} onOpen={() => {}} />
  ));
  return bare ? (
    <View style={styles.list}>{rows}</View>
  ) : (
    <Section title="Diário recente">{<View style={styles.list}>{rows}</View>}</Section>
  );
}

function ListsRail() {
  const styles = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.rail}>
      {SAMPLE_LISTS.map((l) => (
        <ListCard key={l.id} list={l} cover="mosaic" width={148} />
      ))}
    </ScrollView>
  );
}

function ListsGrid() {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const w = (width - space.screenX * 2 - space.lg) / 2;
  return (
    <View style={[styles.row, styles.wrap, { gap: space.lg }]}>
      {SAMPLE_LISTS.map((l) => (
        <ListCard key={l.id} list={l} cover="mosaic" width={w} />
      ))}
    </View>
  );
}

function Tagged() {
  const styles = useStyles();
  const viewer = useContext(ViewerContext);
  return (
    <View style={styles.list}>
      {TAGGED.map(({ entry, i }) => (
        <View key={entry.id} style={styles.tagged}>
          <Text variant="caption" tone="secondary">
            <Text variant="caption" style={styles.by}>
              {TAGGERS[viewer][i]}
            </Text>{' '}
            {viewer === 'me' ? 'marcou você' : `marcou ${PEOPLE.other.name.split(' ')[0]}`}
          </Text>
          <EntryRow entry={entry} day={Number(entry.watchedDate!.slice(8, 10))} onOpen={() => {}} />
        </View>
      ))}
    </View>
  );
}

function Tags() {
  const styles = useStyles();
  return (
    <View style={[styles.row, styles.wrap]}>
      {TAGS.map((t) => (
        <View key={t.name} style={styles.tag}>
          <Text variant="caption" style={styles.tagText}>
            #{t.name}
          </Text>
          <Text variant="caption" tone="muted">
            {t.count}
          </Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  // overflow: o reflexo da capa (que sobe acima dela, para o puxar para atualizar) cobria o seletor de opções. A
  // caixa ocupa a largura da tela (margem negativa + o mesmo recuo por dentro), para a capa continuar de ponta a ponta.
  device: {
    gap: space.xl,
    paddingTop: space.lg,
    marginHorizontal: -space.screenX,
    paddingHorizontal: space.screenX,
    borderTopWidth: 1,
    borderTopColor: c.border,
    overflow: 'hidden',
  },
  sections: { gap: space.xl },
  flex: { flex: 1 },
  section: { gap: space.md },
  row: { flexDirection: 'row', gap: space.md },
  wrap: { flexWrap: 'wrap' },
  list: { gap: space.md },
  bleed: { marginHorizontal: -space.screenX },
  rail: { paddingHorizontal: space.screenX, gap: space.lg },
  tagged: { gap: space.xs },
  by: { color: c.ink900, fontFamily: fonts.bodyHeavy },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  tagText: { color: c.ink900, fontFamily: fonts.bodyHeavy },
}));
