import { useEffect } from 'react';
import { Keyboard, Platform, useWindowDimensions, type KeyboardEvent } from 'react-native';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Altura do teclado na tela (0 fechado), animada como o teclado, a partir dos eventos de teclado do próprio
 * React Native (a posição real do teclado em cada mudança).
 * Antes o cartão usava o `useAnimatedKeyboard` do Reanimated: ao escrever com a Siri, o iOS troca o teclado por
 * outro painel e depois volta, e ele ficava preso em "fechado". O cartão descia e o teclado o cobria até
 * reiniciar o app. Aqui cada mudança de posição (abrir, fechar, trocar de altura, voltar) atualiza o valor.
 */
export function useKeyboardHeight() {
  const { height: windowHeight } = useWindowDimensions();
  const height = useSharedValue(0);

  useEffect(() => {
    const animate = (to: number, duration?: number) =>
      height.set(withTiming(Math.max(0, to), { duration: duration || 250, easing: Easing.out(Easing.cubic) }));
    // iOS: o "will" chega antes do teclado se mexer (anda junto com ele) e o changeFrame cobre trocas de altura
    // (sugestões, ditado, Siri). A altura é o quanto o teclado cobre da janela, pelo topo dele.
    const fromFrame = (e: KeyboardEvent) => animate(windowHeight - e.endCoordinates.screenY, e.duration);
    const subs =
      Platform.OS === 'ios'
        ? [Keyboard.addListener('keyboardWillChangeFrame', fromFrame), Keyboard.addListener('keyboardWillHide', (e) => animate(0, e.duration))]
        : [
            Keyboard.addListener('keyboardDidShow', (e) => animate(e.endCoordinates.height)),
            Keyboard.addListener('keyboardDidHide', () => animate(0)),
          ];
    // O teclado já estava aberto quando o cartão apareceu (ex.: vindo de outro campo).
    const open = Keyboard.metrics();
    if (open) height.set(Platform.OS === 'ios' ? Math.max(0, windowHeight - open.screenY) : open.height);
    return () => subs.forEach((s) => s.remove());
  }, [height, windowHeight]);

  return height;
}
