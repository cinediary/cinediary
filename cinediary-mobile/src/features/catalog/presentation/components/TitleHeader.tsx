import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState, type ComponentRef } from 'react';
import { Play } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeOut, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { strings } from '@/shared/i18n';
import { palette, poster, semantic, space } from '@/shared/theme';
import { PosterArt, Skeleton, Text } from '@/shared/ui';
import type { TitleDetail } from '../../domain/title';
import type { TrailerSlot } from '../trailerPlacement';
import { PAGE_BORDER, PosterLightbox, type PosterOrigin } from './PosterLightbox';

const BACKDROP_HEIGHT = 220;

/**
 * Topo do TI-01/TI-02: backdrop com degradê para creme, pôster lg, título, metadados e sinopse.
 * - Arrastar a página para baixo estica o backdrop (zoom a partir do topo) em vez de descer junto com
 *   o conteúdo e deixar um vão claro em cima; rolando para cima, ele anda mais devagar (parallax).
 * - Tocar no pôster abre ele grande, com o fundo desfocado (PosterLightbox).
 */
export function TitleHeader({
  title,
  scrollY,
  trailer,
  loading = false,
}: {
  title: TitleDetail;
  /**
   * A página ainda é a prévia montada da busca (sem sinopse nem imagem de fundo): a sinopse vira um esqueleto
   * do mesmo tamanho do texto, para nada pular quando o detalhe chegar.
   */
  loading?: boolean;
  scrollY: SharedValue<number>;
  /**
   * Pílula "▶ Trailer" abaixo dos dados (variante "meta" do teste A/B do botão do trailer). Aparece apagada
   * enquanto os extras carregam, para não empurrar a sinopse quando o trailer chega; sem trailer, some.
   */
  trailer?: TrailerSlot;
}) {
  const t = strings.catalog;
  const [expanded, setExpanded] = useState(false);
  const [zoomFrom, setZoomFrom] = useState<PosterOrigin | null>(null);
  // Escondido só depois que o modal já está na tela com a cópia por cima (ver PosterLightbox.onShown).
  const [posterHidden, setPosterHidden] = useState(false);
  const posterRef = useRef<ComponentRef<typeof View>>(null);
  // Mede onde o pôster está na tela para o zoom sair dele.
  const openPoster = () => posterRef.current?.measureInWindow((x, y, width, height) => setZoomFrom({ x, y, width, height }));

  const stretch = useAnimatedStyle(() => {
    const y = scrollY.value;
    if (y < 0) {
      // Cresce o suficiente para cobrir o vão do arraste, com o topo preso no topo da tela.
      return { transform: [{ translateY: y / 2 }, { scale: 1 - y / BACKDROP_HEIGHT }] };
    }
    return { transform: [{ translateY: y * 0.4 }] };
  });

  const meta = [
    title.year,
    title.mediaType === 'SERIES'
      ? title.numberOfSeasons
        ? t.seasonsCount(title.numberOfSeasons)
        : strings.common.series
      : title.runtimeMinutes
        ? t.runtime(title.runtimeMinutes)
        : null,
    title.genres.slice(0, 3).join(', ') || null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View>
      <Animated.View style={[styles.backdrop, stretch]}>
        {/* Entra com fade (antes "piscava" ao chegar); até lá, o fundo areia do próprio quadro. */}
        {title.backdropUrl ? (
          <Image source={title.backdropUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={350} cachePolicy="memory-disk" />
        ) : null}
        <LinearGradient colors={['rgba(250,246,240,0)', palette.bg]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Pressable accessibilityRole="imagebutton" accessibilityLabel={t.posterZoom(title.title)} onPress={openPoster}>
            {/* Escondido enquanto o destaque está aberto: só a cópia animada aparece, sem duas imagens. */}
            <View ref={posterRef} collapsable={false} style={posterHidden ? styles.hidden : undefined}>
              <PosterArt title={title.title} posterUrl={title.posterUrl} width={poster.lg.width * 0.75} style={styles.poster} />
            </View>
          </Pressable>
          <View style={styles.texts}>
            <Text variant="h2" accessibilityRole="header" numberOfLines={3}>
              {title.title}
            </Text>
            {title.originalTitle !== title.title ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {title.originalTitle}
              </Text>
            ) : null}
            <Text variant="caption" tone="secondary">
              {meta}
            </Text>
            {trailer && trailer.status !== 'none' ? (
              <Animated.View exiting={FadeOut.duration(150)} style={styles.pillWrap}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.trailerPlay(title.title)}
                  accessibilityState={{ disabled: trailer.status === 'loading' }}
                  disabled={trailer.status === 'loading'}
                  onPress={trailer.onPress}
                  style={({ pressed }) => [styles.pill, trailer.status === 'loading' && styles.pillLoading, pressed && styles.pressed]}
                >
                  <Play size={14} weight="fill" color={palette.ink900} />
                  <Text variant="caption" style={styles.pillText}>
                    {t.trailer}
                  </Text>
                </Pressable>
              </Animated.View>
            ) : null}
          </View>
        </View>
        {loading ? (
          // 3 linhas de texto + o "Ver mais", na mesma altura (24 por linha) da sinopse de verdade.
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Skeleton width="100%" height={14} style={styles.skeletonLine} />
            <Skeleton width="100%" height={14} style={styles.skeletonLine} />
            <Skeleton width="62%" height={14} style={styles.skeletonLine} />
            <Skeleton width={72} height={14} style={styles.skeletonLine} />
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setExpanded((e) => !e)} disabled={!title.overview}>
            <Text tone="secondary" numberOfLines={expanded ? undefined : 3}>
              {title.overview || t.overviewEmpty}
            </Text>
            {title.overview.length > 160 ? (
              <Text variant="bodyStrong" tone="link">
                {expanded ? strings.common.seeLess : strings.common.seeMore}
              </Text>
            ) : null}
          </Pressable>
        )}
      </View>
      <PosterLightbox
        origin={zoomFrom}
        title={title.title}
        posterUrl={title.posterUrl}
        onShown={() => setPosterHidden(true)}
        onClose={() => {
          setPosterHidden(false);
          setZoomFrom(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { height: BACKDROP_HEIGHT, backgroundColor: palette.surfaceSunken },
  skeletonLine: { marginVertical: 5 },
  body: { marginTop: -96, paddingHorizontal: space.screenX, gap: space.lg },
  row: { flexDirection: 'row', gap: space.lg, alignItems: 'flex-end' },
  poster: { borderWidth: PAGE_BORDER, borderColor: semantic.background },
  hidden: { opacity: 0 },
  texts: { flex: 1, gap: space.xs, paddingBottom: space.xs },
  pressed: { opacity: 0.75 },
  pillWrap: { alignSelf: 'flex-start' },
  pillLoading: { opacity: 0.4 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  pillText: { color: palette.ink900, fontFamily: 'Nunito_800ExtraBold' },
});
