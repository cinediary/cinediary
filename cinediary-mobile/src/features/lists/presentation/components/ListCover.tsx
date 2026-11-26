import { View } from 'react-native';

import { radius, shadow, makeStyles } from '@/shared/theme';
import { PosterArt } from '@/shared/ui';

/**
 * Capa de uma lista, feita dos primeiros pôsteres (#17). Três jeitos, para escolher no Design System:
 * - fan: até 5 pôsteres sobrepostos em leque, o primeiro na frente (como no Letterboxd);
 * - mosaic: os 4 primeiros num quadrado 2×2 (como as playlists do Apple Music);
 * - strip: até 4 pôsteres lado a lado, sem sobrepor, num cartão.
 */
export type ListCoverStyle = 'fan' | 'mosaic' | 'strip';

const POSTER_RATIO = 3 / 2;

export function ListCover({
  posters,
  name,
  style,
  width,
}: {
  posters: (string | null)[];
  name: string;
  style: ListCoverStyle;
  /** Largura total da capa. */
  width: number;
}) {
  const styles = useStyles();
  if (style === 'mosaic') {
    const cell = width / 2;
    const four = Array.from({ length: 4 }, (_, i) => posters[i] ?? null);
    return (
      <View style={[styles.mosaic, { width, height: width }]}>
        {four.map((p, i) => (
          <PosterArt key={i} title={`${name} ${i}`} posterUrl={p} width={cell} height={cell} radius={0} />
        ))}
      </View>
    );
  }

  if (style === 'strip') {
    const n = 4;
    const gap = 3;
    const w = (width - gap * (n - 1)) / n;
    return (
      <View style={[styles.strip, { width, gap }]}>
        {Array.from({ length: n }, (_, i) => (
          <PosterArt
            key={i}
            title={`${name} ${i}`}
            posterUrl={posters[i] ?? null}
            width={w}
            height={w * POSTER_RATIO}
            radius={6}
          />
        ))}
      </View>
    );
  }

  // fan: cada pôster entra um pouco por baixo do anterior, e o primeiro fica por cima.
  const n = Math.max(1, Math.min(5, posters.length));
  const posterW = width / (1 + (n - 1) * 0.42);
  const step = posterW * 0.42;
  return (
    <View style={{ width, height: posterW * POSTER_RATIO }}>
      {Array.from({ length: n }, (_, i) => n - 1 - i).map((i) => (
        <View key={i} style={[styles.fanItem, { left: i * step, zIndex: n - i }]}>
          <PosterArt
            title={`${name} ${i}`}
            posterUrl={posters[i] ?? null}
            width={posterW}
            height={posterW * POSTER_RATIO}
            radius={8}
          />
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  mosaic: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: c.surfaceSunken,
  },
  strip: { flexDirection: 'row' },
  fanItem: { position: 'absolute', top: 0, borderRadius: 8, ...shadow.e1 },
}));
