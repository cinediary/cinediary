import { ArrowRight } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { strings } from '@/shared/i18n';
import { palette, space } from '@/shared/theme';
import { Text } from '@/shared/ui';

/**
 * Fim do carrossel de pessoas: um botão redondo menor que as fotos, centrado na altura delas, com
 * "Ver todos" embaixo. Do mesmo tamanho das fotos ele parecia mais uma pessoa (e maior: a foto tem
 * borda da cor do fundo, o círculo não).
 */
export function SeeAllBubble({ width, size = 64, onPress }: { width: number; size?: number; onPress: () => void }) {
  const circle = Math.round(size * 0.66);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.catalog.seeAll}
      onPress={onPress}
      style={({ pressed }) => [styles.item, { width }, pressed && styles.pressed]}
    >
      <View style={[styles.slot, { height: size }]}>
        <View style={[styles.circle, { width: circle, height: circle, borderRadius: circle / 2 }]}>
          <ArrowRight size={18} weight="bold" color={palette.ink700} />
        </View>
      </View>
      <Text variant="caption" style={styles.label}>
        {strings.catalog.seeAll}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { alignItems: 'center', gap: space.xs },
  slot: { justifyContent: 'center' },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceSunken,
    borderWidth: 1,
    borderColor: palette.border,
  },
  label: { textAlign: 'center', fontFamily: 'Nunito_700Bold', color: palette.ink700 },
  pressed: { opacity: 0.7 },
});
