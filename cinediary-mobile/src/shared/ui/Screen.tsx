import { useRef, type PropsWithChildren, type ReactNode } from 'react';
import {
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { space, useColors, makeStyles } from '@/shared/theme';
import { useKeepAboveKeyboard, type KeyboardTargetRef } from './useKeepAboveKeyboard';
import { usePullToRefresh } from './usePullToRefresh';

export interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  edges?: Edge[];
  /**
   * Puxar para atualizar (só com scroll). O spinner fica visível até a Promise terminar.
   * O estado é do gesto, não da query: refetch em segundo plano (invalidação, polling)
   * não mostra o spinner nem empurra a lista no iOS.
   */
  onRefresh?: () => Promise<unknown>;
  /** Conteúdo fixo abaixo da rolagem (ex.: rodapé do onboarding). */
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** Rolagem (com scroll): ex.: o perfil com capa troca a cor da barra de status quando a capa sai. */
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /**
   * Com teclado aberto, a tela rola até este elemento ficar inteiro acima dele (ex.: o botão de
   * enviar do formulário). Sem isso, só a linha do cursor fica visível.
   */
  keyboardTarget?: KeyboardTargetRef;
}

/**
 * Moldura padrão de tela. Com scroll, o conteúdo passa por baixo da barra
 * nativa de abas (Liquid Glass) via contentInsetAdjustmentBehavior (UX-01 §7.1).
 */
export function Screen({
  children,
  scroll = false,
  edges = ['top'],
  onRefresh,
  footer,
  contentStyle,
  keyboardTarget,
  onScroll,
}: ScreenProps) {
  const styles = useStyles();
  const colors = useColors();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const keyboard = useKeepAboveKeyboard(scrollRef, keyboardTarget);
  // O spinner vem do gesto, não da query; com tempo mínimo (ver usePullToRefresh).
  const { refreshing, onRefresh: handleRefresh } = usePullToRefresh(() => onRefresh?.());

  // O topo (relógio/notch) fica com a SafeAreaView. Já tentamos deixar o ScrollView cuidar dele
  // (contentInsetAdjustmentBehavior): ao trocar de aba ou quando o conteúdo mudava de altura (ex.:
  // abrir a busca no Registrar), o iOS não reaplicava o recuo e o título subia para baixo do relógio.
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          // Sem a barrinha lateral de rolagem em todo o app (padrão em apps nativos; parecia web).
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, contentStyle]}
          contentInsetAdjustmentBehavior="automatic"
          // Teclado: a área de rolagem encolhe e o campo focado sobe (iOS); tocar fora de um campo ou
          // arrastar a tela para baixo fecha o teclado.
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onScroll={(e) => {
            keyboard.onScroll(e);
            onScroll?.(e);
          }}
          scrollEventThrottle={32}
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        // Sem rolagem: tocar fora de um campo fecha o teclado (o Pressable não é foco do leitor de tela).
        <Pressable accessible={false} onPress={Keyboard.dismiss} style={[styles.content, styles.fill, contentStyle]}>
          {children}
        </Pressable>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.background },
  fill: { flex: 1 },
  content: { paddingHorizontal: space.screenX, paddingVertical: space.lg, gap: space.lg },
  footer: { paddingHorizontal: space.screenX, paddingBottom: space.lg, paddingTop: space.md, gap: space.sm },
}));
