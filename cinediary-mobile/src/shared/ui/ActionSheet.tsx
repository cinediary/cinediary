import * as Haptics from 'expo-haptics';
import { Check } from 'phosphor-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { strings } from '@/shared/i18n';
import { fonts, radius, space, useColors, makeStyles } from '@/shared/theme';
import { Text } from './Text';

export interface ActionSheetOption {
  key: string;
  label: string;
  /** Linha de apoio embaixo (ex.: o que a opção faz). */
  hint?: string;
  icon?: ReactNode;
  destructive?: boolean;
  /** Mostra o ✓ (escolha atual, num seletor). */
  selected?: boolean;
  onPress: () => void;
}

/**
 * Menu de ações desenhado pelo app (no lugar do Alert/ActionSheet do sistema): um cartão sobe de baixo com as
 * opções em linhas grandes (ícone, texto, apoio, ✓ da escolha atual, vermelho para o destrutivo) e um
 * "Cancelar" separado, como no iOS, com respiro dos lados e entre as linhas. Fundo escurecido; tocar fora fecha.
 * Serve para o "⋯" de uma entrada e para seletores (ex.: quem pode responder).
 */
export function ActionSheet({
  visible,
  title,
  message,
  options,
  onClose,
}: {
  visible: boolean;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  onClose: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const progress = useSharedValue(0);
  // Fica montado até a animação de saída terminar.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      void Haptics.selectionAsync();
      progress.set(withTiming(1, { duration: reduce ? 0 : 260, easing: Easing.out(Easing.cubic) }));
    } else if (mounted) {
      progress.set(
        withTiming(0, { duration: reduce ? 0 : 200, easing: Easing.in(Easing.cubic) }, (done) => {
          if (done) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, mounted, progress, reduce]);

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * height }] }));

  // Fecha primeiro e só então executa (a ação pode abrir outra tela ou outro menu).
  const choose = (o: ActionSheetOption) => {
    onClose();
    setTimeout(o.onPress, reduce ? 0 : 220);
  };

  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}>
        <Pressable accessibilityRole="button" accessibilityLabel={strings.common.close} style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.wrap, { paddingBottom: insets.bottom + space.md }, sheet]} accessibilityViewIsModal>
        <View style={styles.card}>
          {title || message ? (
            <View style={styles.head}>
              {title ? (
                <Text variant="bodyStrong" style={styles.center}>
                  {title}
                </Text>
              ) : null}
              {message ? (
                <Text variant="caption" tone="muted" style={styles.center}>
                  {message}
                </Text>
              ) : null}
            </View>
          ) : null}
          {options.map((o, i) => (
            <Pressable
              key={o.key}
              accessibilityRole="button"
              accessibilityState={{ selected: !!o.selected }}
              onPress={() => choose(o)}
              style={({ pressed }) => [styles.row, (i > 0 || !!title || !!message) && styles.divider, pressed && styles.pressed]}
            >
              {o.icon ? <View style={styles.icon}>{o.icon}</View> : null}
              <View style={styles.texts}>
                <Text variant="bodyStrong" style={[styles.label, o.destructive && styles.danger]}>
                  {o.label}
                </Text>
                {o.hint ? (
                  <Text variant="caption" tone="muted">
                    {o.hint}
                  </Text>
                ) : null}
              </View>
              {o.selected ? <Check size={20} weight="bold" color={colors.primary} /> : null}
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.card, styles.cancel, pressed && styles.pressed]}
        >
          <Text variant="bodyStrong" style={styles.cancelText}>
            {strings.common.cancel}
          </Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { backgroundColor: c.backdrop },
  // Cartões flutuando acima da borda, com respiro dos lados e entre eles.
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, gap: space.md },
  card: { borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: c.surface, overflow: 'hidden' },
  head: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.md, gap: space.xs },
  center: { textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 60,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  pressed: { backgroundColor: c.surfaceSunken },
  icon: { width: 24, alignItems: 'center' },
  texts: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.bodyBold, color: c.ink900 },
  danger: { color: c.danger },
  cancel: { minHeight: 60, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: fonts.bodyHeavy, color: c.ink900 },
}));
