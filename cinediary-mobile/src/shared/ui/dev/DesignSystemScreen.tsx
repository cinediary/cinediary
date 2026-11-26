import { PencilSimple, Trash, X } from 'phosphor-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import {
  Button,
  Chip,
  EmptyState,
  LikeButton,
  PosterCard,
  ProgressBar,
  Screen,
  StarRating,
  Text,
  SegmentedControl,
  AvatarPair,
  HorizontalBars,
  ConnectionErrorScreen,
  APP_CONNECTION_ERROR_VARIANT,
  type ConnectionErrorVariant,
  type ConnectionProblem,
  StarSpinner,
  Avatar,
  MoreMenu,
  menuIcons,
  SwipeRow,
  TextEditSheet,
} from '@/shared/ui';
import { alpha, palette, space, useTheme, useColors, makeStyles } from '@/shared/theme';
import { nav } from '../navigation/nav';
import { OfflineBanner } from '../navigation/OfflineBanner';
import { AnimatedSplash } from '../splash/AnimatedSplash';

/** Claro ou escuro (#61): troca o app inteiro na hora, para conferir os componentes nos dois temas. */
function ThemeSwitch() {
  const { scheme, setPreference } = useTheme();
  return (
    <SegmentedControl
      options={[
        { value: 'light', label: 'Claro' },
        { value: 'dark', label: 'Escuro' },
      ]}
      value={scheme}
      onChange={setPreference}
    />
  );
}

/** Catálogo vivo (dados de exemplo) dos componentes (UX-01, seção 9). Só existe em desenvolvimento. */
export function DesignSystemScreen() {
  const styles = useStyles();
  const [rating, setRating] = useState(3.5);
  const [liked, setLiked] = useState(false);
  const [segment, setSegment] = useState<'all' | 'movie' | 'series'>('all');
  const [genres, setGenres] = useState<string[]>(['Drama']);

  const toggleGenre = (g: string) => setGenres((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  const [tab, setTab] = useState<'components' | 'screens'>('components');
  // Folha de edição: fica fora do Screen (por cima de tudo), como nas telas de verdade.
  const [editText, setEditText] = useState('Concordo demais! O final é lindo e a trilha também.');
  const [editing, setEditing] = useState(false);

  return (
    <View style={styles.root}>
      <Screen scroll edges={[]}>
        <ThemeSwitch />
        <SegmentedControl
          options={[
            { value: 'components', label: 'Componentes' },
            { value: 'screens', label: 'Telas' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {/* O Match tem o próprio Design System (o shared/ não pode importar das features). */}
        <Button label="Abrir o Design System do Match" variant="secondary" onPress={() => nav.push('/_dev/match')} />
        <Button label="Abrir o Design System do Perfil" variant="secondary" onPress={() => nav.push('/_dev/profile')} />
        <Button label="Abrir os filtros do diário" variant="secondary" onPress={() => nav.push('/_dev/diary')} />
        <Button label="Abrir as tags" variant="secondary" onPress={() => nav.push('/_dev/tags')} />
        <Button label="Abrir as listas" variant="secondary" onPress={() => nav.push('/_dev/lists')} />
        <Button label="Abrir a estrutura do perfil" variant="secondary" onPress={() => nav.push('/_dev/profile-layout')} />
        {tab === 'screens' ? (
          <>
            <SplashSection />
            <TitleLoadingSection />
            <ErrorScreensTab />
            <OfflineBannerSection />
          </>
        ) : (
          <>
            <Section title="Tipografia">
              <Text variant="display">78%</Text>
              <Text variant="h1">
                Seu ano em{' '}
                <Text variant="h1" italic>
                  filmes
                </Text>
              </Text>
              <Text variant="h2">Duna: Parte Dois</Text>
              <Text variant="h3">Continue assistindo</Text>
              <Text>Texto corrido em Nunito 500, 16/24.</Text>
              <Text variant="caption" tone="muted">
                2024 · 2h46 · Ficção científica
              </Text>
              <Text variant="overline" tone="secondary">
                Continue assistindo
              </Text>
            </Section>

            <Section title="Cores">
              <View style={styles.swatches}>
                {Object.entries(palette).map(([name, hex]) => (
                  <View key={name} style={[styles.swatch, { backgroundColor: hex }]} accessibilityLabel={name} />
                ))}
              </View>
            </Section>

            <Section title="Botões">
              <Button label="Registrar filme" />
              <Button label="Secundário" variant="secondary" />
              <Button label="Ghost" variant="ghost" />
              <Button label="Excluir registro" variant="danger" />
              <Button label="Carregando" loading />
              <Button label="Desabilitado" disabled disabledReason="Preencha usuário, e-mail e senha" />
            </Section>

            <Section title="Chips">
              <View style={styles.wrap}>
                {['Drama', 'Comédia', 'Terror', 'Animação'].map((g) => (
                  <Chip key={g} label={g} selected={genres.includes(g)} onToggle={() => toggleGenre(g)} />
                ))}
              </View>
            </Section>

            <Section title="Nota e curtida">
              <StarRating value={rating} onChange={setRating} />
              <StarRating value={4.5} size="mini" />
              <LikeButton liked={liked} onToggle={setLiked} />
            </Section>

            <Section title="Pôsteres">
              <View style={styles.wrap}>
                <PosterCard title="Ainda Estou Aqui" year={2024} size="sm" watched rating={4.5} showCaption />
                <PosterCard title="Bacurau" year={2019} size="sm" liked selected showCaption onPress={() => {}} />
                <PosterCard title="Central do Brasil" size="sm" showCaption />
              </View>
            </Section>

            <Section title="Segmentos, avatares e barras">
              <SegmentedControl
                options={[
                  { value: 'all', label: 'Tudo' },
                  { value: 'movie', label: 'Filmes' },
                  { value: 'series', label: 'Séries' },
                ]}
                value={segment}
                onChange={setSegment}
              />
              <AvatarPair a={{ name: 'Edu' }} b={{ name: 'Ana' }} />
              <HorizontalBars
                data={[
                  { label: 'Drama', value: 42 },
                  { label: 'Terror', value: 30 },
                  { label: 'Comédia', value: 12 },
                ]}
              />
            </Section>

            <Section title="Progresso">
              <ProgressBar current={23} total={62} unit="ep." />
              <ProgressBar current={10} total={10} unit="ep." />
            </Section>

            <Section title="Estado vazio">
              <EmptyState
                title={['O que você viu ', 'ontem', '?'] as const}
                description="Que tal registrar o primeiro filme do seu diário?"
                actionLabel="Buscar um título"
                onAction={() => {}}
              />
            </Section>

            <ActionsSection editText={editText} onEdit={() => setEditing(true)} />
          </>
        )}
      </Screen>
      {editing ? (
        <TextEditSheet
          title="Editar resposta"
          initialText={editText}
          maxLength={1000}
          placeholder="Escreva uma resposta…"
          onSave={setEditText}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </View>
  );
}

/**
 * Ações sobre um item: o arrastar (SwipeRow, usado nas respostas), a folha de edição colada no teclado
 * (TextEditSheet) e o menu "⋯" nativo (MoreMenu: SwiftUI no iOS, Jetpack Compose no Android; sem o @expo/ui no
 * binário, o menu do próprio app).
 */
function ActionsSection({ editText, onEdit }: { editText: string; onEdit: () => void }) {
  const styles = useStyles();
  const themeColors = useColors();
  const [last, setLast] = useState<string | null>(null);
  return (
    <>
      <Section title="Ações ao arrastar (SwipeRow)">
        <Text variant="caption" tone="muted">
          Arraste a linha para a esquerda. Editar abre a folha de edição.
        </Text>
        <View style={styles.swipeDemo}>
          <SwipeRow
            actions={[
              { key: 'edit', label: 'Editar', Icon: PencilSimple, onPress: onEdit },
              { key: 'delete', label: 'Apagar', Icon: Trash, tone: 'danger', onPress: () => setLast('Apagar (arrastar)') },
            ]}
          >
            <View style={styles.swipeItem}>
              <Avatar name="Ana Lima" size={34} />
              <View style={styles.flex}>
                <Text variant="bodyStrong">Ana Lima</Text>
                <Text tone="secondary">{editText}</Text>
              </View>
            </View>
          </SwipeRow>
        </View>
      </Section>

      <Section title="Menu ⋯ nativo (MoreMenu)">
        <View style={styles.menuRow}>
          <MoreMenu
            options={[
              {
                key: 'edit',
                label: 'Editar',
                systemImage: 'pencil',
                androidIcon: menuIcons.edit,
                icon: <PencilSimple size={20} color={themeColors.ink900} />,
                onPress: () => setLast('Editar (menu)'),
              },
              {
                key: 'delete',
                label: 'Apagar',
                destructive: true,
                systemImage: 'trash',
                androidIcon: menuIcons.delete,
                icon: <Trash size={20} color={themeColors.danger} />,
                onPress: () => setLast('Apagar (menu)'),
              },
            ]}
          />
          <Text variant="caption" tone="muted" style={styles.flex}>
            {last ? `Tocou em: ${last}` : 'Toque no ⋯ para abrir o menu.'}
          </Text>
        </View>
      </Section>
    </>
  );
}

/**
 * A splash animada da abertura. "Internet lenta" segura o app como se o perfil demorasse 4 s: dá para ver a
 * splash esperando com o ícone completo antes de sair.
 */
function SplashSection() {
  const styles = useStyles();
  const [run, setRun] = useState(0);
  const [slow, setSlow] = useState(false);
  const [ready, setReady] = useState(true);
  const [finished, setFinished] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const play = (inFullscreen: boolean) => {
    setFinished(false);
    setRun((n) => n + 1);
    setFullscreen(inFullscreen);
    if (slow) {
      setReady(false);
      setTimeout(() => setReady(true), 4000);
    } else {
      setReady(true);
    }
  };

  return (
    <>
      <Section title="Splash">
        <SegmentedControl
          options={[
            { value: 'fast', label: 'Internet boa' },
            { value: 'slow', label: 'Internet lenta' },
          ]}
          value={slow ? 'slow' : 'fast'}
          onChange={(v) => setSlow(v === 'slow')}
        />
        <View style={styles.wrap}>
          <Button label="Ver em tela cheia" onPress={() => play(true)} />
          <Button label="Repetir aqui" variant="secondary" onPress={() => play(false)} />
        </View>
      </Section>
      <View style={styles.previewSplash}>
        {/* Por baixo, o "app" que a splash revela ao sair */}
        <View style={styles.fakeApp}>
          <Text tone="muted">O app aparece aqui</Text>
        </View>
        {!finished && !fullscreen ? (
          <AnimatedSplash key={run} ready={ready} onFinish={() => setFinished(true)} controlsStatusBar={false} />
        ) : null}
      </View>

      <Modal visible={fullscreen} animationType="none" presentationStyle="fullScreen" onRequestClose={() => setFullscreen(false)}>
        <View style={styles.fakeApp}>
          <Text tone="muted">O app aparece aqui</Text>
        </View>
        <AnimatedSplash
          key={`full-${run}`}
          ready={ready}
          onFinish={() => {
            setFinished(true);
            setTimeout(() => setFullscreen(false), 600);
          }}
        />
      </Modal>
    </>
  );
}

/**
 * Propostas da tela de "sem conexão" (abertura sem internet ou com o servidor fora). Compare aqui e escolha:
 * a prévia embaixo é a tela de verdade; "Ver em tela cheia" mostra como fica no app.
 */
/** A faixa "Sem internet" do topo: aparece por cima desta tela enquanto o switch estiver ligado. */
function OfflineBannerSection() {
  const [visible, setVisible] = useState(false);
  return (
    <Section title="Sem internet durante o uso (faixa no topo)">
      <Button
        label={visible ? 'Esconder a faixa' : 'Mostrar a faixa'}
        variant="secondary"
        onPress={() => setVisible((v) => !v)}
      />
      <OfflineBanner visible={visible} />
    </Section>
  );
}

function ErrorScreensTab() {
  const styles = useStyles();
  const themeColors = useColors();
  const [variant, setVariant] = useState<ConnectionErrorVariant>(APP_CONNECTION_ERROR_VARIANT);
  const [problem, setProblem] = useState<ConnectionProblem>('offline');
  const [replay, setReplay] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  // Simula o "Tentar de novo": fica tentando por um instante e volta.
  const retry = () => {
    setRetrying(true);
    setTimeout(() => setRetrying(false), 1500);
  };
  const screen = (
    <ConnectionErrorScreen
      key={`${variant}-${problem}-${replay}`}
      variant={variant}
      problem={problem}
      onRetry={retry}
      retrying={retrying}
      onSignOut={() => {}}
    />
  );

  return (
    <>
      <Section title="Sem conexão (abertura sem internet ou servidor fora)">
        <SegmentedControl
          options={[
            { value: 'light', label: 'Clara (no app)' },
            { value: 'dark', label: 'Terracota' },
          ]}
          value={variant}
          onChange={setVariant}
        />
        <SegmentedControl
          options={[
            { value: 'offline', label: 'Sem internet' },
            { value: 'server', label: 'Servidor fora' },
          ]}
          value={problem}
          onChange={setProblem}
        />
        <View style={styles.wrap}>
          <Button label="Ver em tela cheia" onPress={() => setFullscreen(true)} />
          <Button label="Repetir a animação" variant="secondary" onPress={() => setReplay((n) => n + 1)} />
        </View>
      </Section>
      <View style={styles.preview}>{screen}</View>

      <Modal visible={fullscreen} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setFullscreen(false)}>
        {screen}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={() => setFullscreen(false)}
          style={styles.close}
        >
          <X size={20} color={themeColors.ink900} />
        </Pressable>
      </Modal>
    </>
  );
}

/**
 * Carregamento da página do título: a estrela do logo girando enquanto o essencial chega (por pelo menos uma
 * volta), e a página entra de uma vez. Para ver de verdade, abra um título que ainda não estava em cache.
 */
function TitleLoadingSection() {
  const styles = useStyles();
  return (
    <Section title="Carregando (página do título)">
      <View style={styles.spinnerPreview}>
        <StarSpinner />
      </View>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text variant="overline" tone="muted">
        {title}
      </Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1 },
  flex: { flex: 1 },
  // A linha vai de ponta a ponta (como as respostas): sai da margem do Screen.
  swipeDemo: { marginHorizontal: -space.screenX },
  swipeItem: {
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.screenX,
    paddingVertical: space.sm,
    backgroundColor: c.background,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  section: { gap: space.md, paddingBottom: space.xl, borderBottomWidth: 1, borderBottomColor: c.border },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  swatch: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: c.border },
  spinnerPreview: { height: 120, alignItems: 'center', justifyContent: 'center' },
  preview: { height: 640, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
  previewSplash: { height: 520, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
  fakeApp: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background },
  close: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: alpha(c.surface, 0.92),
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
