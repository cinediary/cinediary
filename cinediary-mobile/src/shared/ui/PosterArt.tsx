import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { alpha, poster, makeStyles } from '@/shared/theme';
import { Text } from './Text';

/** Degradês de reserva do protótipo (pôster sem imagem). */
const FALLBACK_GRADIENTS = [
  ['#C9A15A', '#6E4B1E'],
  ['#B4532F', '#4A1E14'],
  ['#5E7F6E', '#24392F'],
  ['#5B2A44', '#2A1220'],
  ['#3E5C83', '#1A2840'],
  ['#D08C86', '#7A3B37'],
  ['#8FA685', '#3B4F35'],
  ['#E8B84A', '#8A5A12'],
  ['#6B5B95', '#2E2547'],
  ['#2A211C', '#5A4A40'],
] as const;

function hashIndex(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % FALLBACK_GRADIENTS.length;
}

export interface PosterArtProps {
  title: string;
  posterUrl?: string | null;
  width: number;
  height?: number;
  radius?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}

/** Imagem do pôster ou, sem imagem, o degradê com o título em Fraunces. */
export function PosterArt({ title, posterUrl, width, height, radius = poster.radius, fontSize, style }: PosterArtProps) {
  const styles = useStyles();
  const h = height ?? Math.round(width / poster.ratio);
  const colors = FALLBACK_GRADIENTS[hashIndex(title)] ?? FALLBACK_GRADIENTS[0];
  return (
    <View style={[styles.frame, { width, height: h, borderRadius: radius }, style]}>
      {posterUrl ? (
        // Fundo de areia enquanto carrega (antes era transparente: piscava em branco ao rolar trilhos).
        // recyclingKey: em listas a célula é reaproveitada, e sem ela o pôster anterior aparecia por um instante.
        <Image
          source={posterUrl}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          recyclingKey={posterUrl}
        />
      ) : (
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={styles.fallback}>
          <Text numberOfLines={4} style={[styles.fallbackText, { fontSize: fontSize ?? Math.max(10, Math.round(width / 8)) }]}>
            {title}
          </Text>
        </LinearGradient>
      )}
      {/*
        O contorno fino vai POR CIMA da imagem, na mesma curva do recorte. Antes era a borda do próprio quadro:
        a imagem ficava por dentro dela e, nos cantos, a borda parecia menor que o pôster (pôsteres grandes).
      */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.outline, { borderRadius: radius }]} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  frame: { overflow: 'hidden', backgroundColor: c.surfaceSunken },
  outline: { borderWidth: 1, borderColor: alpha(c.ink900, 0.08) },
  fallback: { flex: 1, padding: 7, justifyContent: 'flex-end' },
  fallbackText: {
    fontFamily: 'Fraunces_600SemiBold',
    color: '#FFFFFF',
    lineHeight: undefined,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },
}));
