import { useEffect, type ReactNode } from 'react';
import { BackHandler, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/shared/i18n';
import { radius, space, makeStyles } from '@/shared/theme';
import { Text } from './Text';
import { useKeyboardHeight } from './useKeyboardHeight';

/**
 * Cartão por cima da tela, colado no teclado: sobe junto com ele, com os cantos de cima arredondados, um título,
 * o conteúdo (rola se não couber) e um rodapé fixo (os botões). É a base do TextEditSheet e do "Vi com…".
 *
 * Não é um Modal: fica na própria tela, por cima de tudo, para acompanhar o teclado do mesmo jeito que um campo
 * fixo embaixo (num Modal o Android não acompanha). Renderize por último no container da tela; dentro de um
 * BottomSheet, abra pelo `useOverlay()`, que o desenha por cima do sheet.
 *
 * `onBackdropPress`: o que fazer ao tocar fora (ex.: fechar guardando a escolha). Sem ele, tocar fora não faz nada,
 * para não perder um texto. O voltar do Android chama `onClose`.
 */
export function OverlaySheet({
  title,
  children,
  footer,
  onClose,
  onBackdropPress,
  fixedHeight = false,
  scroll = true,
  accessory,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  /**
   * false: o conteúdo não rola, só encolhe até caber (ex.: um campo de texto, que rola por dentro). Com um campo
   * dentro de uma rolagem, o texto crescia além da área visível e empurrava o que vinha depois para fora.
   */
  scroll?: boolean;
  /** Fica fixo entre o conteúdo e o rodapé, sempre visível (ex.: o contador de caracteres). */
  accessory?: ReactNode;
  onClose: () => void;
  onBackdropPress?: () => void;
  /**
   * O conteúdo sempre com a mesma altura (40% da tela), em vez de crescer com o que tem dentro. Para listas que
   * mudam enquanto a pessoa digita (a busca do "Vi com…"): sem isso, o cartão crescia e encolhia a cada letra e,
   * preso no teclado, parecia pular.
   */
  fixedHeight?: boolean;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const keyboard = useKeyboardHeight();

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const sheet = useAnimatedStyle(() => ({ paddingBottom: Math.max(keyboard.value, insets.bottom) + space.md }));
  // Até 40% da tela, mas nunca mais do que sobra acima do teclado (iPhone SE): o título e os botões ficam visíveis.
  const content = useAnimatedStyle(() => {
    const available = height - insets.top - keyboard.value - CHROME;
    const limit = Math.max(MIN_CONTENT, Math.min(height * 0.4, available));
    return fixedHeight ? { height: limit } : { maxHeight: limit };
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(180)} style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessible={!!onBackdropPress}
          accessibilityRole="button"
          accessibilityLabel={strings.common.close}
          onPress={onBackdropPress ?? (() => {})}
        />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(260)}
        exiting={SlideOutDown.duration(200)}
        style={[styles.sheet, sheet]}
        accessibilityViewIsModal
      >
        <Text variant="h3" accessibilityRole="header">
          {title}
        </Text>
        {scroll ? (
          <Animated.ScrollView style={content} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {children}
          </Animated.ScrollView>
        ) : (
          <Animated.View style={[styles.content, content]}>{children}</Animated.View>
        )}
        {accessory}
        {footer}
      </Animated.View>
    </View>
  );
}

/** Rodapé com dois botões lado a lado, do mesmo tamanho (ex.: Cancelar e Salvar). */
export function OverlaySheetActions({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.actions}>{children}</View>;
}

/** O que o cartão ocupa além do conteúdo: título, botões, espaços e um respiro no topo da tela. */
const CHROME = 200;
const MIN_CONTENT = 140;

const useStyles = makeStyles((c) => ({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: c.backdrop },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: space.md,
    paddingTop: space.lg,
    paddingHorizontal: space.screenX,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: c.surface,
  },
  content: { gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm },
}));
