import { Check } from 'phosphor-react-native';
import { View } from 'react-native';

import { radius, space, useColors, makeStyles } from '@/shared/theme';
import { Text } from './Text';

export interface ProgressBarProps {
  current: number;
  total: number;
  /** Ex.: "ep." → "23 de 62 ep." */
  unit?: string;
  /** Texto completo para o leitor de tela. */
  accessibilityLabel?: string;
}

export function ProgressBar({ current, total, unit = '', accessibilityLabel }: ProgressBarProps) {
  const styles = useStyles();
  const colors = useColors();
  const ratio = total > 0 ? Math.min(1, current / total) : 0;
  const done = ratio === 1;
  const label = `${current} de ${total}${unit ? ` ${unit}` : ''}`;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityValue={{ min: 0, max: total, now: current }}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: done ? colors.salvia700 : colors.salvia500 }]} />
      </View>
      <View style={styles.labelRow}>
        {done && <Check size={12} weight="bold" color={colors.salvia700} />}
        <Text variant="caption" tone={done ? 'success' : 'muted'}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  track: { height: 8, borderRadius: radius.pill, backgroundColor: c.surfaceSunken, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
}));
