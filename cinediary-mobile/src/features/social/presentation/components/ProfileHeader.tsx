import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { LockSimple } from 'phosphor-react-native';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { formatNumber, strings } from '@/shared/i18n';
import { fonts, palette, radius, shadow, space } from '@/shared/theme';
import { Avatar, markImageBroken, Text, useWorkingImageUrl } from '@/shared/ui';
import type { FollowList } from '../../domain/social';
import { openFollowList } from '../navigation';

export interface ProfileHeaderProps {
  name: string;
  username: string;
  avatarUrl: string | null;
  /** Capa (um backdrop do TMDB); null = sem capa, o topo fica como antes. */
  headerUrl?: string | null;
  /**
   * Quanto a capa sobe para encostar no topo da tela (o espaço que a tela deixa acima do perfil). Sem isso,
   * ela começaria abaixo desse espaço, com uma faixa vazia em cima.
   */
  coverBleedTop?: number;
  pronouns: string | null;
  bio: string | null;
  isPrivate: boolean;
  followsYou?: boolean;
  /** null = escondido (perfil privado que você não segue). */
  titles: number | null;
  followers: number;
  following: number;
  /** Seguidores/seguindo abrem as listas (não num perfil privado que você não segue). */
  canOpenLists: boolean;
  /** Botões embaixo (Editar perfil + engrenagem, ou Seguir). */
  actions: ReactNode;
}

const BIO_LINES = 4;
const COVER_HEIGHT = 200;
const AVATAR = 96;
/** Quanto o perfil (foto, nome, bio…) sobe por cima da capa, além do que a foto já entra nela. */
const LIFT = 60;
/** O desfoque no fim da capa: os detalhes da foto se dissolvem antes de ela sumir no fundo. */
const BLUR_FADE = 70;
const BLUR_STEPS = 12;
const BLUR = 28;
/** Sombra no topo da capa (barra de status clara por cima). */
const SCRIM = 0.38;
/** O fundo do tema (palette.bg, "#rrggbb") com transparência, para a capa sumir nele aos poucos. */
const BG_RGB = [1, 3, 5].map((i) => parseInt(palette.bg.slice(i, i + 2), 16)).join(',');
const bg = (alpha: number) => `rgba(${BG_RGB},${alpha})`;
/** O degradê no fim da capa (sobre a foto). */
const FADE_HEIGHT = 110;
/**
 * Continuação do degradê abaixo da capa (uma cauda, com a capa espelhada e desfocada por baixo): a capa não
 * termina já no fundo cheio, o que numa foto escura parecia um corte.
 */
const FADE_TAIL = 120;
/** Quanto de fundo já tem na borda da capa; a cauda vai daí até o fundo cheio. */
const FADE_AT_EDGE = 0.6;
/** Curva em S (suave no começo e no fim): sem a virada brusca do final. */
const smooth = (t: number) => t * t * (3 - 2 * t);
type Stops<T> = readonly [T, T, ...T[]];
const FADE_AT = Array.from({ length: 10 }, (_, i) => i / 9) as unknown as Stops<number>;
const FADE_COVER = FADE_AT.map((t) => bg(smooth(t) * FADE_AT_EDGE)) as unknown as Stops<string>;
const FADE_REST = FADE_AT.map((t) => bg(FADE_AT_EDGE + smooth(t) * (1 - FADE_AT_EDGE))) as unknown as Stops<string>;
/**
 * Topo do perfil, igual para o seu e para o de outra pessoa, todo centralizado num eixo só:
 * - a foto, com um aro suave;
 * - o nome; embaixo, @, pronomes e cadeado (perfil privado) numa linha; "Segue você" quando for o caso;
 * - a bio (até 4 linhas; toque para ler tudo);
 * - os números (títulos, seguidores, seguindo) num cartão, no mesmo estilo dos outros cartões do app;
 * - os botões, na largura toda.
 * Antes a foto ficava à esquerda com os números ao lado e o resto da tela seguia outro alinhamento: a tela
 * parecia "torta".
 * Com capa, ela ocupa a largura toda e encosta no topo da tela (barra de status clara por cima de uma sombra
 * leve), e a foto e o nome sobem para cima da parte de baixo dela, que some num degradê suave (ver Cover).
 */
export function ProfileHeader(p: ProfileHeaderProps) {
  const headerUrl = useWorkingImageUrl(p.headerUrl);
  const s = strings.social;
  const [bioOpen, setBioOpen] = useState(false);
  // O perfil guarda o código (ex.: "she"); aqui vira o texto do idioma de quem vê ("ela/dela", "she/her").
  const pronouns = p.pronouns ? (strings.account.pronounOptions[p.pronouns] ?? p.pronouns) : null;

  const counter = (value: number | null, label: string, list?: FollowList) => {
    const body = (
      <>
        <Text style={styles.value}>{value === null ? '–' : formatNumber(value)}</Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {label}
        </Text>
      </>
    );
    return list && p.canOpenLists ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${value ?? 0} ${label}`}
        onPress={() => openFollowList(p.username, list)}
        style={({ pressed }) => [styles.counter, pressed && styles.pressed]}
      >
        {body}
      </Pressable>
    ) : (
      <View style={styles.counter} accessible accessibilityLabel={`${value ?? 0} ${label}`}>
        {body}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {headerUrl ? <Cover url={headerUrl} bleedTop={p.coverBleedTop ?? 0} /> : null}
      <View style={[styles.ring, headerUrl ? styles.ringOnCover : null]}>
        <Avatar name={p.name || p.username} imageUrl={p.avatarUrl} size={AVATAR} />
      </View>

      <View style={styles.identity}>
        <Text variant="h2" accessibilityRole="header" style={styles.center}>
          {p.name || p.username}
        </Text>
        <View style={styles.handle}>
          <Text variant="caption" tone="secondary">
            @{p.username}
          </Text>
          {pronouns ? (
            <>
              <Text variant="caption" tone="muted">
                ·
              </Text>
              <Text variant="caption" tone="secondary">
                {pronouns}
              </Text>
            </>
          ) : null}
          {p.isPrivate ? (
            <View accessible accessibilityLabel={strings.stats.privateBadge}>
              <LockSimple size={13} color={palette.ink700} />
            </View>
          ) : null}
        </View>
        {p.followsYou ? (
          <View style={styles.badge}>
            <Text variant="caption" style={styles.badgeText}>
              {s.followsYou}
            </Text>
          </View>
        ) : null}
        {p.bio ? (
          <Pressable accessibilityRole="text" onPress={() => setBioOpen((v) => !v)}>
            <Text tone="secondary" numberOfLines={bioOpen ? undefined : BIO_LINES} style={[styles.bio, styles.center]}>
              {p.bio}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.counters}>
        {counter(p.titles, s.titles)}
        <View style={styles.divider} />
        {counter(p.followers, s.followers, 'followers')}
        <View style={styles.divider} />
        {counter(p.following, s.followingCount, 'following')}
      </View>

      <View style={styles.actions}>{p.actions}</View>
    </View>
  );
}

/**
 * Barra de status de quem mostra o ProfileHeader: clara enquanto a capa está atrás dela, e a padrão quando
 * a pessoa rola e a capa sai (senão os ícones claros ficariam sobre o fundo claro). Devolve o onScroll da
 * tela. Sem capa (ou com uma que não carregou), sempre a padrão.
 */
export function useCoverStatusBar(headerUrl: string | null | undefined) {
  const hasCover = !!useWorkingImageUrl(headerUrl);
  const overCover = useRef(true);
  const apply = useCallback(() => setStatusBarStyle(hasCover && overCover.current ? 'light' : 'auto'), [hasCover]);
  useFocusEffect(
    useCallback(() => {
      apply();
      return () => setStatusBarStyle('auto');
    }, [apply]),
  );
  return useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentInset } = e.nativeEvent;
      // Rolagem a partir do topo da tela (no iOS o conteúdo começa abaixo do recuo automático).
      const over = contentOffset.y + (contentInset?.top ?? 0) < COVER_HEIGHT;
      if (over !== overCover.current) {
        overCover.current = over;
        apply();
      }
    },
    [apply],
  );
}

/**
 * Capa no topo, que some no fundo sem marcar um corte (mesmo em foto escura):
 * - o fim da foto passa de nítido a desfocado (BlurBands) e, por cima, um degradê em curva em S leva até 60%
 *   do fundo na borda da capa;
 * - abaixo da capa, uma cauda com a foto espelhada e desfocada termina o caminho até o fundo cheio, por trás da
 *   foto do perfil e do nome;
 * - acima da capa (só ao puxar a tela para baixo), o reflexo da parte de cima, com a sombra do topo.
 */
function Cover({ url, bleedTop }: { url: string; bleedTop: number }) {
  const height = COVER_HEIGHT + bleedTop;
  const hidden = {
    pointerEvents: 'none',
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants',
  } as const;
  return (
    <>
      {/* Acima da capa, do mesmo tamanho dela: cobre a distância de um puxar para atualizar. */}
      <View {...hidden} style={[styles.glow, { top: -bleedTop - height, height }]}>
        <Image source={{ uri: url }} style={[styles.mirrorUp, { height }]} contentFit="cover" blurRadius={BLUR} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${SCRIM})` }]} />
      </View>
      <View {...hidden} style={[styles.cover, { marginTop: -bleedTop, height }]}>
        <Image
          source={{ uri: url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          onError={() => markImageBroken(url)}
        />
        <LinearGradient colors={[`rgba(0,0,0,${SCRIM})`, 'rgba(0,0,0,0)']} style={[styles.scrim, { height: bleedTop + 48 }]} />
        <BlurBands url={url} height={height} />
        <LinearGradient colors={FADE_COVER} locations={FADE_AT} style={[styles.coverFade, { height: FADE_HEIGHT }]} />
      </View>
      <View {...hidden} style={[styles.glow, { top: COVER_HEIGHT, height: FADE_TAIL }]}>
        <Image source={{ uri: url }} style={[styles.mirror, { height }]} contentFit="cover" blurRadius={BLUR} />
        <LinearGradient colors={FADE_REST} locations={FADE_AT} style={StyleSheet.absoluteFill} />
      </View>
    </>
  );
}

/** A parte de baixo da capa passando de nítida a desfocada, em faixas cada vez mais opacas (sem máscara no RN). */
function BlurBands({ url, height }: { url: string; height: number }) {
  return (
    <>
      {Array.from({ length: BLUR_STEPS }, (_, i) => {
        // Faixas encostadas em pixels inteiros, sem sobrepor: onde duas se sobrepunham (ou sobrava fresta)
        // aparecia uma linha.
        const start = height - BLUR_FADE;
        const top = Math.round(start + (i * BLUR_FADE) / BLUR_STEPS);
        const bottom = Math.round(start + ((i + 1) * BLUR_FADE) / BLUR_STEPS);
        return (
          <View key={i} style={[styles.band, { top, height: bottom - top, opacity: (i + 1) / BLUR_STEPS }]}>
            <Image source={{ uri: url }} style={[styles.bandImage, { top: -top, height }]} contentFit="cover" blurRadius={BLUR} />
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: space.lg },
  cover: { alignSelf: 'stretch', marginHorizontal: -space.screenX, overflow: 'hidden', backgroundColor: palette.surfaceSunken },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  coverFade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  band: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
  bandImage: { position: 'absolute', left: 0, right: 0 },
  mirror: { position: 'absolute', top: 0, left: 0, right: 0, transform: [{ scaleY: -1 }] },
  mirrorUp: { position: 'absolute', bottom: 0, left: 0, right: 0, transform: [{ scaleY: -1 }] },
  glow: { position: 'absolute', left: -space.screenX, right: -space.screenX, overflow: 'hidden' },
  // A foto sobe para cima da parte de baixo da capa (desconta o espaço entre os blocos).
  ringOnCover: { marginTop: -(AVATAR * 0.8 + space.lg + LIFT) },
  ring: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadow.e2,
  },
  identity: { alignItems: 'center', gap: space.xs, alignSelf: 'stretch' },
  center: { textAlign: 'center' },
  handle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: palette.surfaceSunken },
  badgeText: { color: palette.ink700, fontFamily: fonts.bodyHeavy },
  bio: { marginTop: space.xs, lineHeight: 22, paddingHorizontal: space.sm },
  counters: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  counter: { flex: 1, alignItems: 'center', gap: 2 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: palette.border },
  pressed: { opacity: 0.6 },
  value: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: palette.ink900 },
  actions: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
