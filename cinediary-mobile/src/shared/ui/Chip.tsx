import * as Haptics from 'expo-haptics';
import { Check } from 'phosphor-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { palette, radius, space } from '@/shared/theme';
import { Text } from './Text';

type Accent = 'terracota' | 'pipoca' | 'salvia' | 'rosa';

const accentBg: Record<Accent, string> = {
  terracota: palette.terracota300,
  pipoca: palette.pipoca300,
  salvia: palette.salvia300,
  rosa: palette.rosa300,
};

export interface ChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  accent?: Accent;
  role?: 'checkbox' | 'radio';
  /**
   * Divide a linha com os vizinhos em partes iguais (ex.: os 3 status de série), em vez de quebrar
   * linha. O texto encolhe um pouco se não couber, mas não corta.
   */
  fill?: boolean;
}

/** Ícone ✓ (14) + espaço (4): o chip selecionado tira isso do padding para manter a MESMA largura. */
const CHECK_SPACE = 14 + space.xs;

/**
 * Chip de seleção. Selecionar não muda a largura: o ✓ entra no lugar de parte do padding. Antes o chip
 * crescia ~18 px ao ganhar o ✓ e, numa linha que quebra (gêneros do onboarding), empurrava os vizinhos
 * para a linha de baixo: a lista inteira "pulava" a cada toque.
 */
export function Chip({ label, selected, onToggle, accent = 'terracota', role = 'checkbox', fill = false }: ChipProps) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={() => {
        Haptics.selectionAsync();
        onToggle();
      }}
      style={[
        styles.chip,
        fill && styles.fill,
        !fill && selected && styles.selectedPadding,
        { backgroundColor: selected ? accentBg[accent] : palette.surfaceSunken },
      ]}
    >
      {selected && <Check size={14} weight="bold" color={palette.ink900} />}
      <Text variant="bodyStrong" numberOfLines={1} adjustsFontSizeToFit={fill} minimumFontScale={0.8} style={fill && styles.fillLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    flexDirection: 'row',
    gap: space.xs,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Mesma largura total do chip sem ✓: metade do espaço do ✓ sai de cada lado.
  selectedPadding: { paddingHorizontal: space.lg - CHECK_SPACE / 2 },
  fill: { flex: 1, paddingHorizontal: space.sm },
  fillLabel: { flexShrink: 1 },
});
