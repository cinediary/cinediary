import { createContext, useCallback, useContext, useEffect, useRef, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { strings } from '@/shared/i18n';
import { palette, semantic, space } from '@/shared/theme';
import { nav } from './navigation/nav';

const RADIUS = 28;
const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 900;

const SheetContext = createContext<{ close: () => void } | null>(null);

/** Fecha o sheet com a animação de descida (ex.: depois de salvar). Fora de um sheet, null. */
export const useBottomSheet = () => useContext(SheetContext);

/**
 * Sheet de baixo, desenhado pelo app (rota com presentation "transparentModal"), sempre preso na borda
 * de baixo com o topo arredondado. Os filhos ficam em coluna: o primeiro pode ser um ScrollView (com
 * flexShrink: 1, encolhe e rola) e o último, um rodapé fixo (ex.: o botão de salvar), sempre visível.
 *
 * Teclado: o sheet NÃO sobe. Ele continua preso embaixo e ganha um espaço do tamanho do teclado no fim,
 * então o fundo creme passa por trás do teclado (sem base reta aparecendo), o rodapé fica logo acima
 * dele e o sheet cresce para cima até o limite. Antes o sheet inteiro era empurrado para cima do
 * teclado: a base reta encostava no teclado arredondado e o conteúdo ficava espremido e cortado.
 *
 * Fecha arrastando pela alça para baixo, tocando no fundo escurecido ou com useBottomSheet().close().
 */
export function BottomSheet({ children, onClosed = () => nav.back() }: PropsWithChildren<{ onClosed?: () => void }>) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const keyboard = useAnimatedKeyboard();
  const offset = useSharedValue(height); // 0 = aberto; height = fora da tela
  const closing = useRef(false);
  const maxHeight = height - insets.top - space.lg;

  useEffect(() => {
    offset.set(withTiming(0, { duration: reduce ? 0 : 320, easing: Easing.out(Easing.cubic) }));
  }, [offset, reduce]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    offset.set(
      withTiming(height, { duration: reduce ? 0 : 240, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(onClosed);
      }),
    );
  }, [offset, height, reduce, onClosed]);

  const drag = usePanGesture({
    runOnJS: true,
    activeOffsetY: 6,
    onUpdate: (e) => offset.set(Math.max(0, e.translationY)),
    onDeactivate: (e) => {
      if (e.translationY > CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY) close();
      else offset.set(withSpring(0, { damping: 20 }));
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
    // Teclado aberto: o espaço dele vira parte do sheet (fundo contínuo por trás do teclado).
    paddingBottom: Math.max(keyboard.height.value, insets.bottom) + space.md,
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: interpolate(offset.value, [0, height], [1, 0]) }));

  return (
    <SheetContext.Provider value={{ close }}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable accessibilityRole="button" accessibilityLabel={strings.common.close} style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>
        <Animated.View style={[styles.sheet, { maxHeight }, sheetStyle]} accessibilityViewIsModal>
          <GestureDetector gesture={drag}>
            <View style={styles.handleArea} accessible accessibilityRole="adjustable" accessibilityLabel={strings.common.close}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </View>
    </SheetContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(42,33,28,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: semantic.background,
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
    borderCurve: 'continuous',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handleArea: { alignItems: 'center', justifyContent: 'center', paddingTop: space.sm, paddingBottom: space.xs },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: palette.border },
});
