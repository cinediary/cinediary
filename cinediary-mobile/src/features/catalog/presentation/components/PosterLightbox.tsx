import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { strings } from '@/shared/i18n';
import { poster, radius, semantic } from '@/shared/theme';
import { PosterArt } from '@/shared/ui';

/** Onde o pôster está na tela antes de ampliar (medido no toque), para o zoom sair dele. */
export interface PosterOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A borda creme do pôster na página do título (TitleHeader). */
export const PAGE_BORDER = 3;

const OPEN_MS = 300;
const CLOSE_MS = 240;
// Curva de desaceleração suave (sem mola, sem passar do ponto).
const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
const EASE_IN_OUT = Easing.bezier(0.4, 0, 0.2, 1);

/**
 * Pôster em destaque: cresce do lugar onde está na página até o centro, com o fundo desfocado
 * aparecendo junto. Tocar em qualquer lugar faz o caminho de volta e fecha.
 * Antes era um ZoomIn com mola (o pôster quicava) e uma legenda "toque para fechar" embaixo.
 */
export function PosterLightbox({
  origin,
  title,
  posterUrl,
  onShown,
  onClose,
}: {
  /** null = fechado. */
  origin: PosterOrigin | null;
  title: string;
  posterUrl: string | null;
  /** O modal já está na tela (com a cópia por cima do pôster): agora quem chamou pode esconder o original. */
  onShown?: () => void;
  onClose: () => void;
}) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const reduce = useReducedMotion();
  const progress = useSharedValue(0);

  // Tamanho final: o maior que cabe com folga, na proporção do pôster.
  const finalW = Math.min(screenW * 0.78, screenH * 0.7 * poster.ratio, 420);
  const finalH = finalW / poster.ratio;
  const finalX = (screenW - finalW) / 2;
  const finalY = (screenH - finalH) / 2;

  // Começa sempre do pôster da página.
  useEffect(() => {
    if (origin) progress.set(0);
  }, [origin, progress]);

  // A animação e a troca (esconder o pôster da página) só começam quando o modal JÁ está na tela.
  // Antes as duas coisas aconteciam no toque, e o iOS leva um ou dois quadros para mostrar o modal:
  // nesse meio-tempo não havia pôster nenhum (o "glitch" ao abrir).
  const start = () => {
    onShown?.();
    progress.set(withTiming(1, { duration: reduce ? 0 : OPEN_MS, easing: EASE_OUT }));
  };

  const close = () => {
    progress.set(
      withTiming(0, { duration: reduce ? 0 : CLOSE_MS, easing: EASE_IN_OUT }, (finished) => {
        if (finished) scheduleOnRN(onClose);
      }),
    );
  };

  // Sem origem (fechado) o modal não desenha nada: antes, no último quadro do fechamento, a origem sumia
  // e o pôster era desenhado por um instante no centro, já sem o desfoque (o "glitch" ao fechar).
  const from = origin ?? { x: 0, y: 0, width: 0, height: 0 };
  const posterStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      left: interpolate(p, [0, 1], [from.x, finalX]),
      top: interpolate(p, [0, 1], [from.y, finalY]),
      width: interpolate(p, [0, 1], [from.width, finalW]),
      height: interpolate(p, [0, 1], [from.height, finalH]),
      // No começo e no fim, igual ao pôster da página (mesma borda creme e mesmo canto): a troca entre
      // os dois não aparece. Antes a cópia não tinha a borda e dava para ver "outra imagem" no fim.
      borderRadius: interpolate(p, [0, 1], [poster.radius, radius.lg]),
      borderWidth: interpolate(p, [0, 1], [PAGE_BORDER, 0]),
      shadowOpacity: p * 0.35,
    };
  });
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Modal visible={!!origin} transparent animationType="none" statusBarTranslucent onShow={start} onRequestClose={close}>
      {origin ? (
        <Pressable accessibilityRole="button" accessibilityLabel={strings.common.close} onPress={close} style={StyleSheet.absoluteFill}>
          <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
            <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Animated.View style={[styles.poster, posterStyle]}>
            {posterUrl ? (
              // Sem fade: a imagem já está em memória (é a mesma da página) e precisa aparecer no 1º quadro.
              <Image
                source={posterUrl}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={0}
                cachePolicy="memory-disk"
                priority="high"
              />
            ) : (
              <PosterArt title={title} width={finalW} />
            )}
          </Animated.View>
        </Pressable>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  poster: {
    position: 'absolute',
    overflow: 'hidden',
    borderColor: semantic.background,
    backgroundColor: semantic.background,
    shadowColor: '#000',
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
  },
});
