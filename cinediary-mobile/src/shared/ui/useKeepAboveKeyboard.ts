import { useEffect, useRef, type ComponentRef, type RefObject } from 'react';
import { Keyboard, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance, type View } from 'react-native';

export type KeyboardTargetRef = RefObject<ComponentRef<typeof View> | null>;

const MARGIN = 16;

/**
 * Quando o teclado abre, rola o ScrollView o bastante para `target` (ex.: o botão "Entrar") ficar
 * inteiro acima dele. O iOS sozinho só garante a linha do cursor; o botão logo abaixo do campo
 * continuava escondido atrás do teclado.
 */
export function useKeepAboveKeyboard(scrollRef: RefObject<ScrollViewInstance | null>, target?: KeyboardTargetRef) {
  const offsetY = useRef(0);

  useEffect(() => {
    if (!target) return;
    const sub = Keyboard.addListener('keyboardDidShow', (e) => {
      const keyboardTop = e.endCoordinates.screenY;
      target.current?.measureInWindow((_x, y, _w, h) => {
        const overflow = y + h + MARGIN - keyboardTop;
        if (overflow > 0) scrollRef.current?.scrollTo({ y: offsetY.current + overflow, animated: true });
      });
    });
    return () => sub.remove();
  }, [scrollRef, target]);

  return {
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      offsetY.current = e.nativeEvent.contentOffset.y;
    },
  };
}
