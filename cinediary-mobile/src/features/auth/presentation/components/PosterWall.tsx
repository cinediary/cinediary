import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors, alpha } from '@/shared/theme';
import { PosterArt } from '@/shared/ui';

export type WallPoster = { title: string; posterUrl: string | null };

const GAP = 10;
/** Velocidade das faixas: devagar, para ser fundo e não distração. */
const PX_PER_SECOND = 14;

/**
 * Parede de pôsteres da tela de boas-vindas: três faixas inclinadas deslizando em sentidos opostos, em
 * loop sem emenda (cada faixa é desenhada duas vezes e volta ao início quando anda uma volta inteira).
 * Embaixo, um degradê dissolve os pôsteres no creme antes de o texto começar (ocupa só a área dela). Com "Reduzir
 * movimento" ligado, as faixas ficam paradas.
 */
export function PosterWall({ posters, posterWidth }: { posters: WallPoster[]; posterWidth: number }) {
  const themeColors = useColors();
  const insets = useSafeAreaInsets();
  // Cada faixa começa num ponto diferente da lista, para os mesmos pôsteres não ficarem empilhados.
  const rows = [0, 1, 2].map((r) => posters.map((_, i) => posters[(i + r * 3) % posters.length]!));
  return (
    <View style={styles.root} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.tilt}>
        {rows.map((items, r) => (
          <PosterRow key={r} items={items} width={posterWidth} reverse={r % 2 === 1} speed={PX_PER_SECOND * (1 + r * 0.25)} />
        ))}
      </View>
      {/* Topo: some atrás da barra de status. Base: dissolve no fundo creme. */}
      <LinearGradient
        colors={[themeColors.background, alpha(themeColors.background, 0)]}
        style={[styles.top, { height: insets.top + 40 }]}
      />
      <LinearGradient
        colors={[alpha(themeColors.background, 0), alpha(themeColors.background, 0.7), themeColors.background, themeColors.background]}
        locations={[0, 0.45, 0.85, 1]}
        style={styles.bottom}
      />
    </View>
  );
}

function PosterRow({ items, width, reverse, speed }: { items: WallPoster[]; width: number; reverse: boolean; speed: number }) {
  const reduce = useReducedMotion();
  const loop = items.length * (width + GAP);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduce || loop === 0) return;
    progress.set(0);
    progress.set(withRepeat(withTiming(1, { duration: (loop / speed) * 1000, easing: Easing.linear }), -1, false));
  }, [reduce, loop, speed, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: reverse ? -loop + progress.value * loop : -progress.value * loop }],
  }));

  return (
    <Animated.View style={[styles.row, style]}>
      {[...items, ...items].map((p, i) => (
        <PosterArt key={`${i}-${p.title}`} title={p.title} posterUrl={p.posterUrl} width={width} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  // Inclinada e um pouco maior que a tela: as bordas das faixas nunca aparecem.
  tilt: { position: 'absolute', top: -40, left: -80, right: -80, gap: GAP, transform: [{ rotate: '-7deg' }] },
  row: { flexDirection: 'row', gap: GAP },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
});
