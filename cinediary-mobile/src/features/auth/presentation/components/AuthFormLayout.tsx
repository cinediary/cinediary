import { useEffect, useRef, type ComponentRef, type PropsWithChildren, type ReactNode } from 'react';
import { Keyboard, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { semantic, space, touch } from '@/shared/theme';
import { Text, Title, type TitleParts } from '@/shared/ui';
import { FloatingBackButton } from '@/shared/ui/navigation/FloatingBackButton';

/** Folga abaixo do campo (dica ou erro dele) ao trazê-lo para cima do rodapé. */
const FIELD_MARGIN = 40;

export interface AuthFormLayoutProps extends PropsWithChildren {
  title: TitleParts;
  subtitle: string;
  /** Botões (enviar e o link para a outra tela): ficam FIXOS embaixo, logo acima do teclado. */
  footer: ReactNode;
}

/**
 * Moldura comum das telas de entrar e criar conta: título e campos rolam; os botões ficam num rodapé
 * fixo que sobe junto com o teclado (o fundo creme continua por trás dele).
 *
 * Antes os botões ficavam no fim da rolagem e, ao tocar num campo, a tela rolava sozinha até eles
 * aparecerem acima do teclado. No cadastro, com 3 campos e dicas, isso empurrava tudo para cima, inclusive o
 * campo em que se estava digitando, e brigava com o ajuste do próprio iOS: a tela "pulava".
 * Agora só rola quando o campo focado ficaria atrás do rodapé, e só o necessário para ele aparecer.
 */
export function AuthFormLayout({ title, subtitle, footer, children }: AuthFormLayoutProps) {
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();
  const footerStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(keyboard.height.value, insets.bottom) + space.md,
  }));
  const scrollRef = useRef<ScrollViewInstance>(null);
  const footerRef = useRef<ComponentRef<typeof View>>(null);
  const offsetY = useRef(0);

  // Teclado aberto (ou trocado: usuário → e-mail → senha usam teclados diferentes): se o campo focado
  // ficou atrás do rodapé, rola só até ele aparecer. O campo de cima continua onde está.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      const input = TextInput.State.currentlyFocusedInput();
      if (!input) return;
      footerRef.current?.measureInWindow((_x, footerTop) => {
        input.measureInWindow((_ix, y, _w, h) => {
          const overflow = y + h + FIELD_MARGIN - footerTop;
          if (overflow > 0) scrollRef.current?.scrollTo({ y: offsetY.current + overflow, animated: true });
        });
      });
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        onScroll={(e) => {
          offsetY.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={32}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.sm + touch.minTarget + space.sm }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Title parts={title} />
        <Text tone="secondary">{subtitle}</Text>
        {children}
      </ScrollView>
      <Animated.View style={[styles.footer, footerStyle]}>
        <View ref={footerRef} style={styles.footerInner}>
          {footer}
        </View>
      </Animated.View>
      <FloatingBackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.screenX, paddingBottom: space.lg, gap: space.lg },
  footer: { paddingHorizontal: space.screenX, paddingTop: space.sm, backgroundColor: semantic.background },
  footerInner: { gap: space.xs },
});
