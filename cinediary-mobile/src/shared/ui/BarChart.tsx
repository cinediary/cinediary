import { StyleSheet, View } from 'react-native';

import { palette, radius, space } from '@/shared/theme';
import { Text } from './Text';

export interface BarDatum {
  label: string;
  value: number;
  /** Texto lido pelo leitor de tela. */
  a11y?: string;
}

/**
 * Teto da escala: o maior valor, mas nunca menos que `minScale`.
 * Com poucos dados (ex.: 1 filme no mês), a barra não ocupa o gráfico inteiro
 * e o gráfico continua honesto ("1" parece pouco, porque é pouco).
 */
const scaleOf = (data: BarDatum[], minScale: number) => Math.max(1, minScale, ...data.map((d) => d.value));

/** Barras horizontais (top gêneros), preenchimento sálvia. */
export function HorizontalBars({
  data,
  color = palette.salvia500,
  minScale = 0,
}: {
  data: BarDatum[];
  color?: string;
  /** Valor que enche a barra quando os dados são poucos. */
  minScale?: number;
}) {
  const max = scaleOf(data, minScale);
  return (
    <View style={styles.hRoot}>
      {data.map((d) => (
        <View key={d.label} accessible accessibilityLabel={d.a11y ?? `${d.label}: ${d.value}`} style={styles.hRow}>
          <View style={styles.hLabelRow}>
            <Text variant="bodyStrong">{d.label}</Text>
            <Text variant="caption" tone="muted">
              {d.value}
            </Text>
          </View>
          <View style={styles.hTrack}>
            <View style={[styles.hFill, { width: `${Math.max(4, (d.value / max) * 100)}%`, backgroundColor: color }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const MIN_BAR = 8;
const DOT = 6;

/**
 * Barras verticais (filmes por mês) apoiadas numa linha de base, com o valor no topo.
 * Mês vazio vira um ponto discreto na base (não uma barra cinza); o último mês (atual)
 * pode ser destacado para dar referência de tempo.
 */
export function VerticalBars({
  data,
  color = palette.terracota500,
  height = 120,
  minScale = 0,
  highlightLast = false,
}: {
  data: BarDatum[];
  color?: string;
  height?: number;
  /** Valor que enche a altura quando os dados são poucos. */
  minScale?: number;
  highlightLast?: boolean;
}) {
  const max = scaleOf(data, minScale);
  const lastIndex = data.length - 1;
  return (
    <View>
      <View style={[styles.vBars, { height: height + 16 }]}>
        {data.map((d, i) => (
          <View key={d.label} style={styles.vCol} accessible accessibilityLabel={d.a11y ?? `${d.label}: ${d.value}`}>
            {d.value > 0 ? (
              <>
                <Text variant="caption" tone="muted" style={styles.vValue}>
                  {d.value}
                </Text>
                <View style={[styles.vBar, { height: Math.max(MIN_BAR, (d.value / max) * height), backgroundColor: color }]} />
              </>
            ) : (
              <View style={[styles.vDot, highlightLast && i === lastIndex && styles.vDotCurrent]} />
            )}
          </View>
        ))}
      </View>
      <View style={styles.vLabels}>
        {data.map((d, i) => {
          const current = highlightLast && i === lastIndex;
          return (
            <Text
              key={d.label}
              variant="caption"
              tone={current ? 'secondary' : 'muted'}
              style={[styles.vLabel, current && styles.vLabelCurrent]}
              numberOfLines={1}
              // O leitor de tela já ouve o mês no rótulo da coluna acima.
              importantForAccessibility="no"
              accessibilityElementsHidden
            >
              {d.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hRoot: { gap: space.md },
  hRow: { gap: space.xs },
  hLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  hTrack: { height: 10, borderRadius: radius.pill, backgroundColor: palette.surfaceSunken, overflow: 'hidden' },
  hFill: { height: '100%', borderRadius: radius.pill },
  vBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: palette.border,
  },
  vCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  vValue: { fontSize: 10, lineHeight: 12, marginBottom: 2 },
  vBar: { width: '70%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  vDot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: palette.border, marginBottom: 4 },
  vDotCurrent: { backgroundColor: palette.terracota300 },
  vLabels: { flexDirection: 'row', gap: 4, marginTop: space.xs },
  vLabel: { flex: 1, textAlign: 'center', fontSize: 10, lineHeight: 12 },
  vLabelCurrent: { fontFamily: 'Nunito_800ExtraBold' },
});
