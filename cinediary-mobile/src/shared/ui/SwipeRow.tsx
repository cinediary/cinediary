import * as Haptics from 'expo-haptics';
import type { ComponentType, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { interpolate, useAnimatedReaction, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { fonts, radius, space, useColors, makeStyles } from '@/shared/theme';
import { Text } from './Text';

/** Largura de cada ação revelada pelo arrastar. */
const ACTION_WIDTH = 76;

export interface SwipeRowAction {
  key: string;
  /** Curto, cabe embaixo do ícone (ex.: "Editar", "Apagar"). */
  label: string;
  /** Ícone do Phosphor: a cor vem do `tone`. */
  Icon: ComponentType<{ size?: number; color?: string; weight?: 'bold' }>;
  /** `danger`: rosa claro com ícone e texto vermelhos (apagar). Padrão: creme com cinza. */
  tone?: 'neutral' | 'danger';
  onPress: () => void;
}

/**
 * Linha com ações ao arrastar para a esquerda (ex.: Editar e Apagar uma resposta). Atrás da linha aparecem
 * painéis de cor suave com os cantos arredondados; ícone e rótulo surgem e crescem conforme o dedo arrasta, e
 * vibra de leve quando abre por completo. Tocar numa ação fecha a linha antes de chamar a ação.
 * Sem ações, a linha não arrasta. A linha (children) precisa ter fundo próprio, para cobrir as ações.
 */
export function SwipeRow({ actions, children }: { actions: SwipeRowAction[]; children: ReactNode }) {
  return (
    <Swipeable
      enabled={actions.length > 0}
      friction={1.6}
      rightThreshold={(ACTION_WIDTH * actions.length) / 2}
      overshootRight={false}
      renderRightActions={(progress, _translation, methods) => (
        <Actions
          progress={progress}
          actions={actions.map((a) => ({
            ...a,
            onPress: () => {
              methods.close();
              a.onPress();
            },
          }))}
        />
      )}
    >
      {children}
    </Swipeable>
  );
}

/** `progress` vai de 0 (fechado) a 1 (aberto). */
function Actions({ progress, actions }: { progress: SharedValue<number>; actions: SwipeRowAction[] }) {
  const styles = useStyles();
  const colors = useColors();
  const content = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.15, 0.7], [0, 1], 'clamp'),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1], 'clamp') }],
  }));
  useAnimatedReaction(
    () => progress.value >= 1,
    (open, wasOpen) => {
      if (open && wasOpen === false) scheduleOnRN(Haptics.selectionAsync);
    },
  );

  return (
    <View style={styles.actions}>
      {actions.map(({ key, label, Icon, tone, onPress }) => {
        const danger = tone === 'danger';
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={onPress}
            style={({ pressed }) => [styles.action, danger && styles.actionDanger, pressed && styles.pressed]}
          >
            <Animated.View style={[styles.content, content]}>
              <Icon size={18} color={danger ? colors.danger : colors.ink700} weight="bold" />
              <Text variant="caption" style={[styles.label, danger && styles.labelDanger]}>
                {label}
              </Text>
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  // Sobre o mesmo creme da tela: painéis suaves com os cantos arredondados, sem cor chapada.
  actions: {
    flexDirection: 'row',
    gap: space.xs,
    paddingVertical: space.xs,
    paddingRight: space.screenX,
    paddingLeft: space.xs,
    backgroundColor: c.background,
  },
  action: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: c.surfaceSunken,
  },
  actionDanger: { backgroundColor: c.rosa100 },
  pressed: { opacity: 0.7 },
  content: { alignItems: 'center', gap: 2 },
  label: { color: c.ink700, fontFamily: fonts.bodyHeavy },
  labelDanger: { color: c.danger },
}));
